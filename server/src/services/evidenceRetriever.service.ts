import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import { ExtractedClaim, RetrievedEvidenceItem, SourceType, EvidenceRelation } from '../types/api.js';
import { sourceRegistry } from './sourceRegistry.service.js';
import { stanceEvaluatorService } from './stanceEvaluator.service.js';

interface RawSearchCandidate {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
}

const OFFICIAL_DOMAINS = [
  '.gov',
  '.mil',
  '.gc.ca',
  '.gov.uk',
  '.gov.au',
  'who.int',
  'un.org',
  'bis.org',
  'cbo.gov',
  'federalregister.gov',
  'fda.gov',
  'cdc.gov',
  'sec.gov',
  'worldbank.org',
  'imf.org',
];

const ACADEMIC_DOMAINS = [
  '.edu',
  '.ac.uk',
  '.ac.jp',
  'nih.gov',
  'ncbi.nlm.nih.gov',
  'nature.com',
  'sciencedirect.com',
  'arxiv.org',
  'springer.com',
  'cell.com',
  'thelancet.com',
  'jstor.org',
  'pnas.org',
  'bmj.com',
];

const FACT_CHECK_DOMAINS = [
  'snopes.com',
  'politifact.com',
  'factcheck.org',
  'fullfact.org',
  'leadstories.com',
  'checkyourfact.com',
  'boomlive.in',
  'altnews.in',
  'factcheck.pib.gov.in',
  'factchecker.in',
  'newschecker.in',
  'factcrescendo.com',
];

const NEWS_DOMAINS = [
  'ptinews.com',
  'aninews.in',
  'thehindu.com',
  'indianexpress.com',
  'hindustantimes.com',
  'timesofindia.indiatimes.com',
  'ndtv.com',
  'livemint.com',
  'business-standard.com',
  'economictimes.indiatimes.com',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'theguardian.com',
  'bloomberg.com',
];

const CONTRADICT_PHRASES = [
  /\b(debunked|false claim|misleading|hoax|untrue|fabricated|fact check: false|no evidence)\b/i,
  /\b(incorrectly claimed|falsely claimed|did not happen|denied reports)\b/i,
];

const SUPPORT_PHRASES = [
  /\b(confirmed that|announced that|official data shows|released data|reports that|stated that|growth of|rose by|increased by)\b/i,
  /\b(according to official|published report|survey found|statistics show)\b/i,
];

export class EvidenceRetrieverService {
  /**
   * Retrieves verified evidence for a list of extracted claims concurrently
   */
  public async retrieveEvidence(claims: ExtractedClaim[]): Promise<RetrievedEvidenceItem[]> {
    if (!claims || claims.length === 0) {
      return [];
    }

    const prioritizedClaims = claims.slice(0, 5);
    const evidencePromises = prioritizedClaims.map(async (claim) => {
      const claimEvidence = await this.retrieveForClaim(claim);
      return claimEvidence.map((ev, index) => ({
        id: `ev-${claim.id}-${index + 1}`,
        claimId: claim.id,
        ...ev,
      }));
    });

    const results = await Promise.all(evidencePromises);
    return results.flat();
  }

  /**
   * Retrieves verified sources for an individual claim with news-priority and AI stance
   */
  private async retrieveForClaim(
    claim: ExtractedClaim
  ): Promise<Omit<RetrievedEvidenceItem, 'id' | 'claimId'>[]> {
    const query = this.constructSearchQuery(claim.text);
    if (!query) {
      return [];
    }

    // 1. Search Open Web & Verified News Publishers First
    const webCandidates = await this.searchWeb(query).catch(() => []);

    // 2. Only search Wikipedia if web candidates are insufficient (< 2 items)
    let wikiCandidates: RawSearchCandidate[] = [];
    if (webCandidates.length < 2) {
      wikiCandidates = await this.searchWikipedia(query).catch(() => []);
    }

    // Combine candidate sources: News & Fact-checkers take priority over Wikipedia
    const combinedCandidates: RawSearchCandidate[] = [];
    const seenUrls = new Set<string>();

    for (const candidate of [...webCandidates, ...wikiCandidates]) {
      if (candidate.url && !seenUrls.has(candidate.url)) {
        seenUrls.add(candidate.url);
        combinedCandidates.push(candidate);
      }
    }

    // 3. Classify sources and evaluate semantic stance with Gemini AI
    const evidenceList: Omit<RetrievedEvidenceItem, 'id' | 'claimId'>[] = [];

    for (const candidate of combinedCandidates.slice(0, 3)) {
      if (!this.isValidEvidenceUrl(candidate.url)) continue;

      const sourceType = this.classifySourceType(candidate.url, candidate.publisher);
      
      // Use AI Stance Evaluator (Gemini with semantic fallback)
      const stance = await stanceEvaluatorService.evaluateStance(
        claim.text,
        candidate.snippet,
        candidate.title,
        candidate.publisher
      );

      // If publisher matches our 54 database, ensure exact verified name is used
      const regMatch = sourceRegistry.matchSource(candidate.url) || sourceRegistry.matchSource(candidate.publisher);
      const displayPublisher = regMatch ? regMatch.name : decode(candidate.publisher);

      evidenceList.push({
        title: decode(candidate.title),
        url: candidate.url,
        publisher: displayPublisher,
        sourceType,
        snippet: decode(candidate.snippet),
        relation: stance.relation,
      });
    }

    return evidenceList;
  }

  /**
   * Constructs an effective keyword search query from the claim text
   */
  private constructSearchQuery(claimText: string): string {
    // Clean punctuation and quotation marks
    let cleaned = claimText.replace(/[“”"']/g, ' ').replace(/\s+/g, ' ').trim();

    // Strip leading conversational preambles
    cleaned = cleaned.replace(/^(According to|Researchers found that|Studies show that|A report shows that)\s+/i, '');

    // Truncate to first 8-10 salient words if statement is very long
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length > 9) {
      return words.slice(0, 9).join(' ');
    }
    return cleaned;
  }

  /**
   * Queries Wikipedia Search & Summary REST API
   */
  private async searchWikipedia(query: string): Promise<RawSearchCandidate[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&utf8=1&srlimit=2`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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

      const candidates: RawSearchCandidate[] = [];

      for (const res of searchResults) {
        if (!res.title) continue;
        const pageTitle = res.title;
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/\s+/g, '_'))}`;

        // Clean HTML snippet tags (<span class="searchmatch">...</span>)
        const cleanSnippet = (res.snippet || '').replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();

        candidates.push({
          title: pageTitle,
          url: pageUrl,
          publisher: 'Wikipedia',
          snippet: cleanSnippet || `Knowledge archive record for ${pageTitle}.`,
        });
      }

      return candidates;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Queries Web search via DuckDuckGo HTML endpoint
   */
  private async searchWeb(query: string): Promise<RawSearchCandidate[]> {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

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

      const candidates: RawSearchCandidate[] = [];

      $('.result').each((_, elem) => {
        if (candidates.length >= 3) return;

        const titleElem = $(elem).find('.result__title a');
        const snippetElem = $(elem).find('.result__snippet');
        const urlElem = $(elem).find('.result__url');

        let title = titleElem.text().trim();
        let snippet = snippetElem.text().trim();
        let rawHref = titleElem.attr('href') || '';

        // Extract direct destination URL from DuckDuckGo redirect wrapper (/l/?uddg=...)
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
          });
        }
      });

      // Prioritize verified news outlets and fact-checkers from Book1.xlsx
      candidates.sort((a, b) => {
        const aVerified = sourceRegistry.matchSource(a.url) ? 1 : 0;
        const bVerified = sourceRegistry.matchSource(b.url) ? 1 : 0;
        return bVerified - aVerified;
      });

      return candidates;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Classifies the source domain into institutional categories
   */
  private classifySourceType(urlStr: string, publisher: string): SourceType {
    // 1. Check verified source database from Book1.xlsx
    const registryMatch = sourceRegistry.matchSource(urlStr) || sourceRegistry.matchSource(publisher);
    if (registryMatch) {
      if (registryMatch.isFactChecker) return 'fact_check';
      if (registryMatch.isWireService) return 'official';
      return 'news';
    }

    try {
      const url = new URL(urlStr);
      const host = url.hostname.toLowerCase();

      if (OFFICIAL_DOMAINS.some((d) => host.includes(d))) {
        return 'official';
      }
      if (ACADEMIC_DOMAINS.some((d) => host.includes(d))) {
        return 'academic';
      }
      if (FACT_CHECK_DOMAINS.some((d) => host.includes(d))) {
        return 'fact_check';
      }
      if (NEWS_DOMAINS.some((d) => host.includes(d))) {
        return 'news';
      }
    } catch {
      // Fallback
    }

    const pubLower = publisher.toLowerCase();
    if (pubLower.includes('fact check') || pubLower.includes('politifact') || pubLower.includes('snopes') || pubLower.includes('boom')) {
      return 'fact_check';
    }
    if (pubLower.includes('reuters') || pubLower.includes('ap news') || pubLower.includes('bbc') || pubLower.includes('pti') || pubLower.includes('hindu')) {
      return 'news';
    }

    return 'other';
  }

  /**
   * Compares the claim text with the retrieved snippet to establish relation
   */
  private determineRelation(claimText: string, snippetText: string, titleText: string): EvidenceRelation {
    const combinedEvidence = `${titleText} ${snippetText}`.toLowerCase();
    const claimLower = claimText.toLowerCase();

    // 1. Check for explicit contradiction/debunk markers
    for (const pattern of CONTRADICT_PHRASES) {
      if (pattern.test(combinedEvidence)) {
        return 'contradicts';
      }
    }

    // 2. Check for corroborating numbers / percentages
    const numbersInClaim = claimText.match(/(\d+(\.\d+)?%|\$\d+|\b\d+\b)/g) || [];
    let matchingNumbersCount = 0;
    for (const num of numbersInClaim) {
      if (num.length > 1 && combinedEvidence.includes(num.toLowerCase())) {
        matchingNumbersCount++;
      }
    }

    // If numerical assertions match directly
    if (numbersInClaim.length > 0 && matchingNumbersCount >= 1) {
      return 'supports';
    }

    // 3. Check for positive support corroboration phrases
    for (const pattern of SUPPORT_PHRASES) {
      if (pattern.test(combinedEvidence)) {
        return 'supports';
      }
    }

    // 4. Word overlap check (excluding stopwords)
    const claimKeywords = claimLower
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4);

    let overlapCount = 0;
    for (const word of claimKeywords) {
      if (combinedEvidence.includes(word)) {
        overlapCount++;
      }
    }

    if (claimKeywords.length > 0 && overlapCount / claimKeywords.length >= 0.6) {
      return 'supports';
    }

    // Default to unclear if evidence mentions topic but does not definitively corroborate or refute
    return 'unclear';
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
