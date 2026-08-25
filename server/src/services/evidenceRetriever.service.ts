import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import {
  ExtractedClaim,
  RetrievedEvidenceItem,
  SourceType,
  EvidenceRelation,
  RelationToClaim,
  EvidenceRelevance,
} from '../types/api.js';
import { sourceRegistry } from './sourceRegistry.service.js';
import { stanceEvaluatorService } from './stanceEvaluator.service.js';
import { googleFactCheckService } from './googleFactCheck.service.js';

interface RawCandidate {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  publishedDate: string | null;
  priorityTier: 1 | 2 | 3 | 4 | 5;
}

const INSTITUTIONAL_TRIGGERS = [
  /\b(government|govt|politics|public policy|law|court|supreme court|high court|election|eci|health|who|rbi|isro|nasa|official announcement|scheme|ministry|parliament|pm|president|statutory|ruling party|ruler party|in power)\b/i,
];

const TIME_SENSITIVE_TRIGGERS = [
  /\b(current|present|ruler party|ruling party|in power|holds power|prime minister|president|chief minister|economic data|inflation rate|gdp|policy|regime)\b/i,
];

export class EvidenceRetrieverService {
  /**
   * Retrieves verified multi-source evidence for a list of extracted claims concurrently
   */
  public async retrieveEvidence(claims: ExtractedClaim[]): Promise<RetrievedEvidenceItem[]> {
    if (!claims || claims.length === 0) {
      return [];
    }

    const tStart = Date.now();
    const prioritizedClaims = claims.slice(0, 3); // Prioritize top 3 most important claims for high speed

    const evidencePromises = prioritizedClaims.map(async (claim) => {
      const isTimeSensitive = TIME_SENSITIVE_TRIGGERS.some((pat) => pat.test(claim.text));
      claim.isTimeSensitive = isTimeSensitive;

      const claimEvidence = await this.retrieveForClaim(claim, isTimeSensitive);
      return claimEvidence.map((ev, index) => ({
        id: `ev-${claim.id}-${index + 1}`,
        claimId: claim.id,
        ...ev,
      }));
    });

    const results = await Promise.allSettled(evidencePromises);
    const flattened: RetrievedEvidenceItem[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        flattened.push(...r.value);
      }
    }

    console.log(`[TIMING] Multi-source evidence retrieval completed in ${Date.now() - tStart}ms (total items: ${flattened.length})`);
    return flattened;
  }

  /**
   * Multi-Source Evidence Retrieval Pipeline for an individual claim
   * Parallelizes searches with strict timeouts and early returns
   */
  private async retrieveForClaim(
    claim: ExtractedClaim,
    isTimeSensitive = false
  ): Promise<Omit<RetrievedEvidenceItem, 'id' | 'claimId'>[]> {
    const query = this.constructSearchQuery(claim.text, isTimeSensitive);
    if (!query) {
      return [];
    }

    const rawCandidates: RawCandidate[] = [];
    const seenUrls = new Set<string>();

    const addCandidate = (c: RawCandidate) => {
      if (c.url && !seenUrls.has(c.url) && this.isValidEvidenceUrl(c.url)) {
        seenUrls.add(c.url);
        rawCandidates.push(c);
      }
    };

    const isInstitutional = INSTITUTIONAL_TRIGGERS.some((pat) => pat.test(claim.text));

    // -------------------------------------------------------------
    // Parallel Stage Execution (FactCheck + GoogleNewsRSS + Web + Institutional)
    // -------------------------------------------------------------
    const searchTasks: Promise<void>[] = [
      // 1. Google Fact Check API
      googleFactCheckService
        .searchFactChecks(query)
        .then((fcs) => {
          for (const fc of fcs) {
            addCandidate({
              title: fc.title,
              url: fc.url,
              publisher: fc.publisher,
              snippet: fc.snippet,
              publishedDate: fc.publishedDate,
              priorityTier: 2,
            });
          }
        })
        .catch(() => {}),

      // 2. Google News RSS Live Wires
      this.searchGoogleNewsRss(query, 4)
        .then((nrs) => {
          for (const nr of nrs) {
            const regCheck = sourceRegistry.matchSource(nr.url) || sourceRegistry.matchSource(nr.publisher);
            const tier = regCheck ? regCheck.credibilityTier : 3;
            addCandidate({ ...nr, priorityTier: tier });
          }
        })
        .catch(() => {}),

      // 3. DuckDuckGo Web Search
      this.searchWeb(query, 3)
        .then((wrs) => {
          for (const wr of wrs) {
            const regCheck = sourceRegistry.matchSource(wr.url) || sourceRegistry.matchSource(wr.publisher);
            const tier = regCheck ? regCheck.credibilityTier : 3;
            addCandidate({ ...wr, priorityTier: tier });
          }
        })
        .catch(() => {}),
    ];

    // Optional Institutional search
    if (isInstitutional) {
      const govQuery = `${query} (site:gov.in OR site:nic.in OR site:pib.gov.in OR site:rbi.org.in OR site:who.int OR site:un.org)`;
      searchTasks.push(
        this.searchWeb(govQuery, 2)
          .then((grs) => {
            for (const g of grs) {
              addCandidate({ ...g, priorityTier: 1 });
            }
          })
          .catch(() => {})
      );
    }

    // Execute all primary search tasks in parallel with Promise.allSettled
    await Promise.allSettled(searchTasks);

    // -------------------------------------------------------------
    // Secondary Fallback (Only if fewer than 2 candidates retrieved)
    // -------------------------------------------------------------
    if (rawCandidates.length < 2) {
      const fallbackTasks: Promise<void>[] = [
        this.searchWikipedia(query)
          .then((wrs) => {
            for (const w of wrs) {
              addCandidate({ ...w, priorityTier: 4 });
            }
          })
          .catch(() => {}),
      ];

      if (claim.entities?.events && claim.entities.events.length > 0) {
        const ev = claim.entities.events[0];
        fallbackTasks.push(
          this.searchGoogleNewsRss(`${ev} location`, 2)
            .then((nrs) => {
              for (const nr of nrs) addCandidate(nr);
            })
            .catch(() => {})
        );
      }

      await Promise.allSettled(fallbackTasks);
    }

    // Filter to top 4 highest-priority candidates for fast stance evaluation
    rawCandidates.sort((a, b) => a.priorityTier - b.priorityTier);
    const prioritizedCandidates = rawCandidates.slice(0, 4);

    // -------------------------------------------------------------
    // Concurrent Claim-Level Stance Evaluation
    // -------------------------------------------------------------
    const stancePromises = prioritizedCandidates.map(async (candidate) => {
      const sourceEval =
        sourceRegistry.getSourceCredibility(candidate.publisher) ||
        sourceRegistry.getSourceCredibility(candidate.url);

      const resolvedName = sourceEval.isRegistered ? sourceEval.name : decode(candidate.publisher);
      const credScore = Math.round(sourceEval.credibilityWeight * 100);

      // Perform exact claim-level evidence verification with 3.5s timeout
      const stance = await stanceEvaluatorService.evaluateStance(
        claim.text,
        candidate.snippet,
        candidate.title,
        candidate.publisher,
        isTimeSensitive
      );

      const relevanceMultiplier = stance.relevance === 'direct' ? 1.0 : stance.relevance === 'related' ? 0.2 : 0.0;
      const finalContribution = Math.round(credScore * relevanceMultiplier);

      const sourceType: SourceType =
        sourceEval.credibilityTier === 1
          ? 'official'
          : sourceEval.credibilityTier === 2
          ? 'fact_check'
          : sourceEval.credibilityTier === 3 || sourceEval.credibilityTier === 4
          ? 'news'
          : 'other';

      // Log transparent diagnostics
      console.log(`\n============================================================`);
      console.log(`[CLAIM-LEVEL EVIDENCE EVALUATION]`);
      console.log(`  CLAIM: "${claim.text}"`);
      console.log(`  SOURCE: ${resolvedName} (Tier ${sourceEval.credibilityTier}, Credibility: ${credScore}/100)`);
      console.log(`  EVIDENCE SNIPPET: "${decode(candidate.snippet)}"`);
      console.log(`  RELATION: ${stance.relation}`);
      console.log(`  RELEVANCE: ${stance.relevance.toUpperCase()}`);
      console.log(`  CONFIDENCE: ${stance.confidence}%`);
      console.log(`  FINAL CONTRIBUTION: ${finalContribution}%`);
      console.log(`  KEY EVIDENCE: "${stance.keyEvidence || 'None'}"`);
      console.log(`============================================================\n`);

      return {
        sourceName: resolvedName,
        sourceUrl: candidate.url,
        sourceTier: sourceEval.credibilityTier,
        title: decode(candidate.title),
        publishedDate: candidate.publishedDate,
        evidenceText: decode(candidate.snippet),
        relationToClaim: stance.relationToClaim,
        relevance: stance.relevance,
        confidence: stance.confidence,
        credibilityScore: credScore,
        relevanceScore: stance.relevanceScore,
        keyEvidence: stance.keyEvidence,
        explanation: stance.explanation,
        finalContribution,

        url: candidate.url,
        publisher: resolvedName,
        sourceType,
        snippet: decode(candidate.snippet),
        relation: stance.relation,
      };
    });

    const evaluatedResults = await Promise.allSettled(stancePromises);
    const evidenceList: Omit<RetrievedEvidenceItem, 'id' | 'claimId'>[] = [];
    for (const r of evaluatedResults) {
      if (r.status === 'fulfilled' && r.value) {
        evidenceList.push(r.value);
      }
    }

    // Rank evidence: Final Contribution + Higher Tier Bonus + Relevance Score
    evidenceList.sort((a, b) => {
      const scoreA = a.finalContribution * 0.7 + a.relevanceScore * 30 + (6 - a.sourceTier) * 5;
      const scoreB = b.finalContribution * 0.7 + b.relevanceScore * 30 + (6 - b.sourceTier) * 5;
      return scoreB - scoreA;
    });

    return evidenceList.slice(0, 3);
  }

  /**
   * Searches live news articles via Google News RSS with 3.5s timeout
   */
  private async searchGoogleNewsRss(query: string, maxResults = 4): Promise<RawCandidate[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-IN&gl=IN&ceid=IN:en`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml',
        },
      });

      clearTimeout(timeout);
      if (!response.ok) return [];

      const xmlText = await response.text();
      const $ = cheerio.load(xmlText, { xmlMode: true });

      const results: RawCandidate[] = [];

      $('item').each((_, elem) => {
        if (results.length >= maxResults) return;

        const title = $(elem).find('title').text().trim();
        const link = $(elem).find('link').text().trim();
        const pubDate = $(elem).find('pubDate').text().trim();
        const sourceElem = $(elem).find('source');
        const publisher = sourceElem.text().trim() || 'Verified News Agency';
        const sourceUrl = sourceElem.attr('url') || link;

        const cleanTitle = title.includes(' - ') ? title.split(' - ').slice(0, -1).join(' - ') : title;

        if (cleanTitle && link) {
          results.push({
            title: cleanTitle,
            url: link,
            publisher,
            snippet: `${cleanTitle}. Reporting by ${publisher}. Published on ${pubDate || 'recent news wire'}.`,
            publishedDate: pubDate ? new Date(pubDate).toISOString().slice(0, 10) : null,
            priorityTier: 3,
          });
        }
      });

      return results;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Constructs an effective search query from the claim text
   */
  private constructSearchQuery(claimText: string, isTimeSensitive = false): string {
    let cleaned = claimText.replace(/[“”"'.,;!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/^(According to|Researchers found that|Studies show that|A report shows that)\s+/i, '');

    if (/ruler party/i.test(cleaned)) {
      cleaned = cleaned.replace(/ruler party/i, 'ruling party');
    }

    if (isTimeSensitive && /\b(ruling party|in power)\b/i.test(cleaned)) {
      cleaned = `${cleaned} Union government`;
    }

    // Strip common filler / stop words from search queries so search engines match core entities & predicates
    const stopWords = new Set(['is', 'are', 'was', 'were', 'located', 'situated', 'in', 'the', 'a', 'an', 'of', 'and', 'that', 'with', 'from', 'at']);
    const words = cleaned.split(' ').filter((w) => w.length > 0);
    const filteredWords = words.filter((w) => !stopWords.has(w.toLowerCase()) || w.length > 6);

    const queryWords = filteredWords.length >= 2 ? filteredWords : words;
    if (queryWords.length > 8) {
      return queryWords.slice(0, 8).join(' ');
    }
    return queryWords.join(' ');
  }

  /**
   * Queries Wikipedia Search & Summary REST API with 3.5s timeout
   */
  private async searchWikipedia(query: string): Promise<RawCandidate[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&utf8=1&srlimit=2`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FakeNewsKiller/1.0 (Forensic-Verification-Engine)',
          Accept: 'application/json',
        },
      });

      clearTimeout(timeout);
      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const searchResults = data?.query?.search || [];

      const candidates: RawCandidate[] = [];

      for (const res of searchResults) {
        if (!res.title) continue;
        const pageTitle = res.title;
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;
        const cleanSnippet = (res.snippet || '').replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();

        candidates.push({
          title: pageTitle,
          url: pageUrl,
          publisher: 'Wikipedia',
          snippet: cleanSnippet || `Knowledge archive record for ${pageTitle}.`,
          publishedDate: null,
          priorityTier: 4,
        });
      }

      return candidates;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Queries Web search via DuckDuckGo HTML endpoint with 3.5s timeout
   */
  private async searchWeb(query: string, maxResults = 3): Promise<RawCandidate[]> {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      clearTimeout(timeout);
      if (!response.ok) return [];

      const html = await response.text();
      const $ = cheerio.load(html);

      const candidates: RawCandidate[] = [];

      $('.result').each((_, elem) => {
        if (candidates.length >= maxResults) return;

        const titleElem = $(elem).find('.result__title a');
        const snippetElem = $(elem).find('.result__snippet');
        const urlElem = $(elem).find('.result__url');

        let title = titleElem.text().trim();
        let snippet = snippetElem.text().trim();
        let rawHref = titleElem.attr('href') || '';

        let targetUrl = '';
        if (rawHref.includes('uddg=')) {
          const match = rawHref.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            targetUrl = decodeURIComponent(match[1]);
          }
        } else if (rawHref.startsWith('http')) {
          targetUrl = rawHref;
        }

        if (targetUrl && title && snippet) {
          let publisher = '';
          try {
            publisher = new URL(targetUrl).hostname.replace(/^www\./, '');
          } catch {
            publisher = urlElem.text().trim() || 'Web Source';
          }

          candidates.push({
            title,
            url: targetUrl,
            publisher,
            snippet,
            publishedDate: null,
            priorityTier: 3,
          });
        }
      });

      return candidates;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Verifies that the URL is well-formed, safe, and not empty
   */
  private isValidEvidenceUrl(urlStr: string): boolean {
    if (!urlStr || urlStr.trim().length === 0) return false;
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

export const evidenceRetrieverService = new EvidenceRetrieverService();
export default evidenceRetrieverService;
