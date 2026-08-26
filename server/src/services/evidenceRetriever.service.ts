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
import { entityExtractorService } from './entityExtractor.service.js';
import { googleFactCheckService } from './googleFactCheck.service.js';

interface RawCandidate {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  publishedDate: string | null;
  priorityTier: 1 | 2 | 3 | 4 | 5;
  sourceType?: SourceType;
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
    const prioritizedClaims = claims.slice(0, 3);

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
   * Generates 2-3 clean, semantic search queries from claim text
   */
  public generateSearchQueries(claimText: string, isTimeSensitive = false): string[] {
    const cleaned = claimText.replace(/[“”"'.,;!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    const queries = new Set<string>();

    const claimTriple = entityExtractorService.extractClaimTriple(claimText);

    // 1. If location assertion, generate focused entity location query
    if (claimTriple && claimTriple.attribute === 'location') {
      queries.add(`${claimTriple.entity} location`);
      queries.add(`${claimTriple.entity} located in`);
      queries.add(`${claimTriple.entity} ${claimTriple.claimValue}`);
    }

    // 2. Semantic query expansion for superlatives & comparisons
    if (/\b(largest|biggest|smallest|highest|tallest|deepest|longest|fastest|coldest|hottest|most populous)\b/i.test(cleaned)) {
      const superlativeMatch = cleaned.match(/\b(largest|biggest|smallest|highest|tallest|deepest|longest|fastest|coldest|hottest|most populous)\s*(\w+)?/i);
      const subject = claimTriple?.entity || cleaned.split(' ')[0];
      if (superlativeMatch && subject) {
        queries.add(`${subject} ${superlativeMatch[0]}`);
        queries.add(`${subject} ${superlativeMatch[0]} by area`);
        queries.add(`${subject} ${superlativeMatch[0]} in the world`);
      }
    }

    // 3. Time-sensitive Political queries
    if (/ruler party/i.test(cleaned)) {
      const fixed = cleaned.replace(/ruler party/i, 'ruling party');
      queries.add(`${fixed} Union government`);
    }

    // 4. Primary Clean Query (Filtered stop words)
    if (queries.size === 0) {
      const stopWords = new Set(['is', 'are', 'was', 'were', 'the', 'a', 'an', 'of', 'and', 'that', 'with', 'from', 'at', 'in', 'on', 'to']);
      const words = cleaned.split(' ').filter(Boolean);
      const coreWords = words.filter((w) => !stopWords.has(w.toLowerCase()) || w.length > 5);
      if (coreWords.length >= 2) {
        queries.add(coreWords.join(' '));
      } else {
        queries.add(cleaned);
      }
    }

    return Array.from(queries).slice(0, 3);
  }

  /**
   * Multi-Source Evidence Retrieval Pipeline for an individual claim
   */
  private async retrieveForClaim(
    claim: ExtractedClaim,
    isTimeSensitive = false
  ): Promise<Omit<RetrievedEvidenceItem, 'id' | 'claimId'>[]> {
    const searchQueries = this.generateSearchQueries(claim.text, isTimeSensitive);
    const primaryQuery = searchQueries[0] || claim.text;

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
    // Execute ALL Multi-Source Streams in Parallel
    // -------------------------------------------------------------
    const searchTasks: Promise<void>[] = [
      // 1. Google Fact Check API (Primary Query)
      googleFactCheckService
        .searchFactChecks(primaryQuery)
        .then((fcs) => {
          for (const fc of fcs) {
            addCandidate({
              title: fc.title,
              url: fc.url,
              publisher: fc.publisher,
              snippet: fc.snippet,
              publishedDate: fc.publishedDate,
              priorityTier: 2,
              sourceType: 'fact_check',
            });
          }
        })
        .catch(() => {}),

      // 2. Authoritative Knowledge & Reference Repositories (Britannica, National Geographic, ThoughtCo, Wikipedia)
      this.fetchAuthoritativeReferences(claim, searchQueries)
        .then((krs) => {
          for (const kr of krs) {
            addCandidate(kr);
          }
        })
        .catch(() => {}),

      // 3. Google News RSS Live Wires (Searches primary query)
      this.searchGoogleNewsRss(primaryQuery, 4)
        .then((nrs) => {
          for (const nr of nrs) {
            const regCheck = sourceRegistry.matchSource(nr.publisher) || sourceRegistry.matchSource(nr.url);
            const tier = regCheck ? regCheck.credibilityTier : 3;
            addCandidate({ ...nr, priorityTier: tier, sourceType: 'news' });
          }
        })
        .catch(() => {}),

      // 4. DuckDuckGo Web Search (Searches across generated queries)
      this.searchWeb(primaryQuery, 3)
        .then((wrs) => {
          for (const wr of wrs) {
            const regCheck = sourceRegistry.matchSource(wr.publisher) || sourceRegistry.matchSource(wr.url);
            const tier = regCheck ? regCheck.credibilityTier : 3;
            addCandidate({ ...wr, priorityTier: tier });
          }
        })
        .catch(() => {}),
    ];

    if (searchQueries.length > 1) {
      searchTasks.push(
        this.searchWeb(searchQueries[1], 2)
          .then((wrs) => {
            for (const wr of wrs) {
              const regCheck = sourceRegistry.matchSource(wr.publisher) || sourceRegistry.matchSource(wr.url);
              const tier = regCheck ? regCheck.credibilityTier : 3;
              addCandidate({ ...wr, priorityTier: tier });
            }
          })
          .catch(() => {})
      );
    }

    if (isInstitutional) {
      const govQuery = `${primaryQuery} (site:gov.in OR site:nic.in OR site:pib.gov.in OR site:rbi.org.in OR site:who.int OR site:un.org)`;
      searchTasks.push(
        this.searchWeb(govQuery, 2)
          .then((grs) => {
            for (const g of grs) {
              addCandidate({ ...g, priorityTier: 1, sourceType: 'official' });
            }
          })
          .catch(() => {})
      );
    }

    // Await all parallel tasks
    await Promise.allSettled(searchTasks);

    // Filter to top 5 highest-priority candidates for stance evaluation
    rawCandidates.sort((a, b) => a.priorityTier - b.priorityTier);
    const prioritizedCandidates = rawCandidates.slice(0, 5);

    // -------------------------------------------------------------
    // Concurrent Claim-Level Stance Evaluation
    // -------------------------------------------------------------
    const claimTriple = entityExtractorService.extractClaimTriple(claim.text);

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

      const pubLower = resolvedName.toLowerCase();
      const sourceType: SourceType =
        candidate.sourceType ||
        (sourceEval.credibilityTier === 1
          ? 'official'
          : sourceEval.credibilityTier === 2
          ? 'fact_check'
          : pubLower.includes('britannica') || pubLower.includes('encyclopedia')
          ? 'encyclopedia'
          : pubLower.includes('national geographic') || pubLower.includes('thoughtco') || pubLower.includes('worldatlas')
          ? 'reference'
          : sourceEval.credibilityTier === 3 || sourceEval.credibilityTier === 4
          ? 'news'
          : 'other');

      // Requirement 10: Explicit Decision Logging
      console.log(`\n------------------------------------------------------------`);
      console.log(`CLAIM: ${claim.text}`);
      if (claimTriple) {
        console.log(`ENTITY: ${claimTriple.entity}`);
        console.log(`ATTRIBUTE: ${claimTriple.attribute}`);
        console.log(`CLAIM VALUE: ${claimTriple.claimValue}`);
      }
      console.log(`SOURCE: ${candidate.url}`);
      console.log(`SOURCE TIER: Tier ${sourceEval.credibilityTier} (${sourceEval.category})`);
      console.log(`RELATION: ${stance.relation}`);
      console.log(`STANCE SCORE: ${stance.stanceScore > 0 ? '+1' : stance.stanceScore < 0 ? '-1' : '0'}`);
      console.log(`REASONING: ${stance.reasoning}`);
      console.log(`------------------------------------------------------------\n`);

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

    // Rank evidence: Direct contradict or direct support from higher tier sources comes first
    evidenceList.sort((a, b) => {
      const isContradictA = a.relationToClaim === 'CONTRADICTS' ? 100 : 0;
      const isContradictB = b.relationToClaim === 'CONTRADICTS' ? 100 : 0;
      const scoreA = isContradictA + a.finalContribution * 0.7 + a.relevanceScore * 30 + (6 - a.sourceTier) * 5;
      const scoreB = isContradictB + b.finalContribution * 0.7 + b.relevanceScore * 30 + (6 - b.sourceTier) * 5;
      return scoreB - scoreA;
    });

    return evidenceList.slice(0, 3);
  }

  /**
   * Fetches direct encyclopedic / reference introductory extracts (Britannica, Wikipedia, National Geographic)
   */
  private async fetchAuthoritativeReferences(
    claim: ExtractedClaim,
    searchQueries: string[]
  ): Promise<RawCandidate[]> {
    const candidates: RawCandidate[] = [];
    const entities = claim.entities;

    const subjectsToQuery: string[] = [];

    // Prioritize subject entities (monuments, events, people, organizations) over locations
    if (entities?.events && entities.events.length > 0) {
      subjectsToQuery.push(...entities.events);
    }
    if (entities?.organizations && entities.organizations.length > 0) {
      subjectsToQuery.push(...entities.organizations);
    }
    if (entities?.people && entities.people.length > 0) {
      subjectsToQuery.push(...entities.people);
    }
    if (entities?.locations && entities.locations.length > 0) {
      subjectsToQuery.push(...entities.locations);
    }

    if (subjectsToQuery.length === 0) {
      const cleaned = claim.text.replace(/[“”"'.,;!?()]/g, ' ').trim();
      const firstWord = cleaned.split(' ')[0];
      if (firstWord && firstWord.length > 3) subjectsToQuery.push(firstWord);
    }

    const uniqueSubjects = Array.from(new Set(subjectsToQuery)).slice(0, 2);

    // 1. Wikipedia Direct Extract API
    for (const subj of uniqueSubjects) {
      const encoded = encodeURIComponent(subj);
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encoded}&format=json&utf8=1`;

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
        if (!response.ok) continue;

        const data = (await response.json()) as any;
        const pages = data?.query?.pages || {};

        for (const pid of Object.keys(pages)) {
          if (pid === '-1') continue;
          const page = pages[pid];
          const title = page.title || subj;
          const extract = (page.extract || '').trim();

          if (extract && extract.length > 30) {
            candidates.push({
              title: `${title} (Knowledge Archive)`,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`,
              publisher: 'Wikipedia Knowledge Archive',
              snippet: extract.length > 300 ? extract.slice(0, 300) + '...' : extract,
              publishedDate: null,
              priorityTier: 4,
              sourceType: 'encyclopedia',
            });
          }
        }
      } catch {
        clearTimeout(timeout);
      }
    }

    // 2. Targeted Reference Search (Britannica, National Geographic, WorldAtlas)
    const refQuery = `${searchQueries[0]} (site:britannica.com OR site:nationalgeographic.com OR site:thoughtco.com OR site:worldatlas.com)`;
    const refResults = await this.searchWeb(refQuery, 2);
    for (const r of refResults) {
      const pubLower = (r.publisher || '').toLowerCase();
      const isBritannica = pubLower.includes('britannica');
      candidates.push({
        ...r,
        publisher: isBritannica ? 'Encyclopædia Britannica' : r.publisher,
        priorityTier: 4,
        sourceType: isBritannica ? 'encyclopedia' : 'reference',
      });
    }

    return candidates;
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
            sourceType: 'news',
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

          const pubLower = publisher.toLowerCase();
          const sourceType: SourceType =
            pubLower.includes('britannica')
              ? 'encyclopedia'
              : pubLower.includes('thoughtco') || pubLower.includes('worldatlas') || pubLower.includes('nationalgeographic')
              ? 'reference'
              : 'other';

          candidates.push({
            title,
            url: targetUrl,
            publisher: pubLower.includes('britannica') ? 'Encyclopædia Britannica' : publisher,
            snippet,
            publishedDate: null,
            priorityTier: 3,
            sourceType,
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
