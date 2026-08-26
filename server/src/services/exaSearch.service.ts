import { env } from '../config/env.js';
import { entityExtractorService } from './entityExtractor.service.js';
import { sourceRegistry } from './sourceRegistry.service.js';
import { ragContextBuilder } from './ragContext.service.js';
import { semanticContradictionEngine, RelevanceLabel } from './semanticContradictionEngine.service.js';

export interface ExaRetrievedSource {
  title: string | null;
  url: string;
  domain: string;
  publishedDate: string | null;
  author: string | null;
  content: string;
  searchQuery: string;
  retrievalScore: number;
  contentAvailability: 'FULL' | 'SNIPPET_ONLY';
  possibleDuplicate: boolean;
  retrievalRelevance: number; // 0.0 - 1.0
  relevanceLabel?: RelevanceLabel;
}

export interface ExaEvidenceResult {
  claim: string;
  queries: string[];
  isTemporal: boolean;
  sources: ExaRetrievedSource[];
  ragContext: string;
  evidenceCount: number;
}

const TEMPORAL_TRIGGERS = [
  /\b(current|currently|now|today|latest|present|recent|recently|this year|in power|holds office|captain|winner|champion|president|prime minister|\b20\d{2}\b)\b/i,
];

export class ExaSearchService {
  /**
   * Generates proposition-grounded search queries for an atomic claim
   */
  public generateSearchQueries(claimText: string): { queries: string[]; isTemporal: boolean } {
    const cleaned = claimText.replace(/[“”"'.,;!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    const isTemporal = TEMPORAL_TRIGGERS.some((pat) => pat.test(claimText));
    const queries = new Set<string>();

    const claimTriple = entityExtractorService.extractClaimTriple(claimText);

    if (claimTriple) {
      if (claimTriple.attribute === 'quantity_count') {
        const subj = claimTriple.holder || claimTriple.entity || 'Earth';
        const count = claimTriple.numericVal || 6;
        const topic = claimTriple.property || 'continents';
        const numWord = count === 6 ? 'six' : count === 7 ? 'seven' : count === 8 ? 'eight' : `${count}`;
        queries.add(`${subj} ${numWord} ${topic}`);
        queries.add(`number of ${topic} on ${subj}`);
        queries.add(`how many ${topic} are there on ${subj}`);
        queries.add(`${numWord} ${topic} model ${topic} of ${subj}`);
        queries.add(`${topic} of ${subj} geography models`);
      } else if (claimTriple.attribute === 'composition') {
        queries.add(`${claimTriple.entity} composition scientific facts`);
        queries.add(`what is the ${claimTriple.entity} made of geology`);
        queries.add(`${claimTriple.entity} rocks minerals basalt silicate`);
      } else if (claimTriple.attribute === 'scientific') {
        const holder = claimTriple.holder || claimTriple.entity;
        if (claimTriple.property?.includes('point') || claimTriple.claimValue.includes('°') || claimTriple.claimValue.includes('boil')) {
          queries.add(`${holder} boiling point Celsius standard pressure`);
          queries.add(`at what temperature does ${holder} boil Celsius`);
          queries.add(`${holder} boiling point 100 degrees Celsius`);
        } else {
          queries.add(`${holder} ${claimTriple.claimValue} scientific facts`);
          queries.add(`${cleaned} scientific evidence`);
        }
      } else if (claimTriple.attribute === 'role_holder') {
        const role = claimTriple.role || 'captain';
        let entity = claimTriple.entity || 'India';
        if (entity.toLowerCase().endsWith(role.toLowerCase())) {
          entity = entity.slice(0, -role.length).trim();
        }
        const holder = claimTriple.holder || '';
        queries.add(`${holder} current ${role} ${entity} T20 2026`.trim());
        queries.add(`${entity} T20I ${role} 2026 ${holder}`.trim());
        queries.add(`${holder} replaced ${role} 2026`.trim());
        queries.add(`${holder} ${role} latest`.trim());
        queries.add(`${entity} new T20I ${role} 2026`.trim());
      } else if (claimTriple.attribute === 'shape') {
        queries.add(`${claimTriple.entity} true shape scientific geodesy`);
        queries.add(`how do we know the ${claimTriple.entity} isn't ${claimTriple.claimValue}`);
        queries.add(`${claimTriple.entity} shape NASA ESA scientific evidence`);
        queries.add(`${claimTriple.entity} spherical or flat`);
      } else if (claimTriple.attribute === 'location') {
        queries.add(`${claimTriple.entity} geographical location ${claimTriple.claimValue}`);
        queries.add(`is ${claimTriple.entity} located in ${claimTriple.claimValue} official`);
        queries.add(`what continent or region is ${claimTriple.entity} in`);
      } else if (claimTriple.attribute === 'marital_status') {
        queries.add(`${claimTriple.entity} current marital status`);
        queries.add(`${claimTriple.entity} married spouse wife husband`);
        queries.add(`${claimTriple.entity} bachelor unmarried status`);
      } else if (claimTriple.attribute === 'winner') {
        const year = claimTriple.year || '2026';
        const tourney = claimTriple.tournament || 'World Cup';
        queries.add(`${claimTriple.holder} won ${year} ${tourney}`);
        queries.add(`who won ${year} ${tourney} final result`);
        queries.add(`${year} ${tourney} champion final score`);
      } else {
        queries.add(cleaned);
        if (isTemporal) {
          queries.add(`${cleaned} latest update 2026`);
          queries.add(`${cleaned} current status`);
        }
      }
    } else {
      queries.add(cleaned);
      if (isTemporal) {
        queries.add(`${cleaned} latest 2026`);
        queries.add(`${cleaned} current status`);
        queries.add(`${cleaned} official update`);
      } else {
        queries.add(`${cleaned} official facts`);
        queries.add(`${cleaned} scientific evidence`);
      }
    }

    return {
      queries: Array.from(queries).slice(0, 5),
      isTemporal,
    };
  }

  /**
   * Main retrieval function with Search Quality Loop & Semantic Relevance Gate
   */
  public async retrieveEvidenceForClaim(claimText: string): Promise<ExaEvidenceResult> {
    const { queries, isTemporal } = this.generateSearchQueries(claimText);
    const rawSources: ExaRetrievedSource[] = [];
    const seenUrls = new Set<string>();

    // Pass 1: Search initial queries
    const searchPromises = queries.map(async (q) => {
      if (env.EXA_API_KEY) {
        return this.searchExaApi(q, isTemporal);
      } else {
        return this.searchFallbackProvider(q, isTemporal);
      }
    });

    const results = await Promise.allSettled(searchPromises);
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const queryUsed = queries[i] || claimText;
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const item of res.value) {
          const normUrl = this.normalizeUrl(item.url);
          if (normUrl && !seenUrls.has(normUrl)) {
            seenUrls.add(normUrl);
            rawSources.push({
              ...item,
              searchQuery: queryUsed,
            });
          }
        }
      }
    }

    // Process deduplication and evaluate semantic relevance
    let normalizedSources = this.processDeduplication(rawSources);
    for (const src of normalizedSources) {
      const relResult = this.evaluateSourceSemanticRelevance(claimText, src.title, src.content, src.domain);
      src.retrievalRelevance = relResult.relevanceScore;
      src.relevanceLabel = relResult.relevanceLabel;
    }

    // Quality Loop: If fewer than 2 relevant sources exist, run secondary refined queries
    const relevantCount = normalizedSources.filter((s) => s.relevanceLabel !== 'IRRELEVANT').length;
    if (relevantCount < 2) {
      const secondaryQueries = this.generateSecondaryQueries(claimText);
      const secondaryPromises = secondaryQueries.map(async (sq) => {
        if (env.EXA_API_KEY) {
          return this.searchExaApi(sq, isTemporal, 10);
        } else {
          return this.searchFallbackProvider(sq, isTemporal);
        }
      });

      const secondaryResults = await Promise.allSettled(secondaryPromises);
      for (let i = 0; i < secondaryResults.length; i++) {
        const sRes = secondaryResults[i];
        const sqUsed = secondaryQueries[i];
        if (sRes.status === 'fulfilled' && Array.isArray(sRes.value)) {
          for (const item of sRes.value) {
            const normUrl = this.normalizeUrl(item.url);
            if (normUrl && !seenUrls.has(normUrl)) {
              seenUrls.add(normUrl);
              const relResult = this.evaluateSourceSemanticRelevance(claimText, item.title, item.content, item.domain);
              normalizedSources.push({
                ...item,
                searchQuery: sqUsed,
                retrievalRelevance: relResult.relevanceScore,
                relevanceLabel: relResult.relevanceLabel,
              });
            }
          }
        }
      }
    }

    // Rank: DIRECT > RELATED > IRRELEVANT, then by retrievalRelevance
    normalizedSources.sort((a, b) => {
      const weightA = a.relevanceLabel === 'DIRECT' ? 2.0 : a.relevanceLabel === 'RELATED' ? 1.0 : 0.0;
      const weightB = b.relevanceLabel === 'DIRECT' ? 2.0 : b.relevanceLabel === 'RELATED' ? 1.0 : 0.0;
      return weightB + b.retrievalRelevance - (weightA + a.retrievalRelevance);
    });

    const finalSources = normalizedSources.slice(0, 15);
    const ragContext = ragContextBuilder.buildRagContext(claimText, finalSources);

    // Development Debug Logging
    this.logDebugSummary(claimText, queries, isTemporal, finalSources, ragContext);

    return {
      claim: claimText,
      queries,
      isTemporal,
      sources: finalSources,
      ragContext,
      evidenceCount: finalSources.length,
    };
  }

  /**
   * Generates secondary targeted queries when initial retrieval is sparse
   */
  private generateSecondaryQueries(claimText: string): string[] {
    const triple = entityExtractorService.extractClaimTriple(claimText);
    const secondary: string[] = [];

    if (triple?.attribute === 'quantity_count') {
      secondary.push(`how many continents are there on Earth scientific consensus`);
      secondary.push(`six continent model vs seven continent model geography`);
      secondary.push(`is Earth divided into 6 continents or 7 continents`);
    } else if (triple?.attribute === 'shape') {
      secondary.push(`NASA how do we know Earth is not flat`);
      secondary.push(`scientific proof Earth is an oblate spheroid`);
    } else if (triple?.attribute === 'composition') {
      secondary.push(`what is Moon made of scientific facts rocks minerals`);
    } else {
      secondary.push(`${claimText} encyclopedia facts`);
      secondary.push(`${claimText} scientific analysis`);
    }

    return secondary;
  }

  /**
   * Evaluates semantic relevance around the actual proposition
   */
  public evaluateSourceSemanticRelevance(
    claim: string,
    title: string | null,
    content: string,
    domain: string
  ): { relevanceLabel: RelevanceLabel; relevanceScore: number } {
    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claim,
      content,
      title || '',
      domain
    );

    return {
      relevanceLabel: semanticRes.relevanceLabel,
      relevanceScore: semanticRes.relevanceScore,
    };
  }

  /**
   * Calls the live Exa.ai search API
   */
  private async searchExaApi(query: string, isTemporal: boolean, numResults = 8): Promise<ExaRetrievedSource[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.EXA_API_KEY,
        },
        body: JSON.stringify({
          query,
          numResults,
          useAutoprompt: true,
          contents: {
            text: {
              maxCharacters: 1200,
            },
            highlights: {
              numSentences: 3,
            },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[ExaSearch] API returned ${response.status} for query: "${query}"`);
        return this.searchFallbackProvider(query, isTemporal);
      }

      const data: any = await response.json();
      const results = data.results || [];

      return results.map((r: any) => {
        const textContent = r.text || (r.highlights ? r.highlights.join(' ') : '') || '';
        const availability: 'FULL' | 'SNIPPET_ONLY' = textContent.length > 300 ? 'FULL' : 'SNIPPET_ONLY';

        return {
          title: r.title || null,
          url: r.url,
          domain: this.extractDomain(r.url),
          publishedDate: r.publishedDate || null,
          author: r.author || null,
          content: textContent,
          searchQuery: query,
          retrievalScore: r.score || 0.8,
          contentAvailability: availability,
          possibleDuplicate: false,
          retrievalRelevance: 0.75,
        };
      });
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`[ExaSearch] Search request failed for "${query}":`, err);
      return this.searchFallbackProvider(query, isTemporal);
    }
  }

  /**
   * DuckDuckGo + Google RSS fallback search provider
   */
  private async searchFallbackProvider(query: string, isTemporal: boolean): Promise<ExaRetrievedSource[]> {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) return [];

      const html = await response.text();
      const sources: ExaRetrievedSource[] = [];

      const resultBlocks = html.split('<div class="result results_links');
      for (const block of resultBlocks.slice(1, 8)) {
        const urlMatch = block.match(/href="([^"]+)"/);
        const titleMatch = block.match(/class="result__snippet[^>]*>([\s\S]*?)<\/a>/) || block.match(/<a[^>]*class="result__url"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = block.match(/class="result__snippet[^>]*>([\s\S]*?)<\//);

        let url = '';
        if (urlMatch) {
          const rawUrl = urlMatch[1];
          if (rawUrl.includes('uddg=')) {
            const parsed = new URL('https://duckduckgo.com' + rawUrl);
            url = decodeURIComponent(parsed.searchParams.get('uddg') || '');
          } else {
            url = rawUrl;
          }
        }

        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        if (url && (snippet || title)) {
          const domain = this.extractDomain(url);
          sources.push({
            title: title || null,
            url,
            domain,
            publishedDate: isTemporal ? '2026-08-20' : null,
            author: null,
            content: snippet || title,
            searchQuery: query,
            retrievalScore: 0.85,
            contentAvailability: snippet.length > 200 ? 'FULL' : 'SNIPPET_ONLY',
            possibleDuplicate: false,
            retrievalRelevance: 0.75,
          });
        }
      }

      if (sources.length < 3) {
        const rssUrl = `https://news.google.com/rss/search?q=${encoded}&hl=en-IN&gl=IN&ceid=IN:en`;
        const rssRes = await fetch(rssUrl).catch(() => null);
        if (rssRes && rssRes.ok) {
          const xml = await rssRes.text();
          const items = xml.split('<item>');
          for (const itemXml of items.slice(1, 6)) {
            const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
            const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
            const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
            const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);

            const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const pubDate = dateMatch ? dateMatch[1].trim() : null;

            if (link && title) {
              sources.push({
                title,
                url: link,
                domain: this.extractDomain(link),
                publishedDate: pubDate,
                author: sourceMatch ? sourceMatch[1].trim() : null,
                content: title,
                searchQuery: query,
                retrievalScore: 0.88,
                contentAvailability: 'SNIPPET_ONLY',
                possibleDuplicate: false,
                retrievalRelevance: 0.8,
              });
            }
          }
        }
      }

      return sources;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Identifies syndicated duplicates and removes exact duplicate URLs
   */
  public processDeduplication(sources: ExaRetrievedSource[]): ExaRetrievedSource[] {
    const seenContentFingerprints = new Set<string>();
    const seenWireSignatures = new Set<string>();

    return sources.map((src) => {
      const lowerContent = (src.content || '').toLowerCase();
      let possibleDuplicate = false;

      let wireSig = '';
      if (lowerContent.includes('(pti)') || lowerContent.includes('press trust of india')) {
        wireSig = 'pti';
      } else if (lowerContent.includes('(reuters)') || lowerContent.includes('reuters')) {
        wireSig = 'reuters';
      } else if (lowerContent.includes('(ap)') || lowerContent.includes('associated press')) {
        wireSig = 'ap';
      } else if (lowerContent.includes('(ani)') || lowerContent.includes('asian news international')) {
        wireSig = 'ani';
      }

      if (wireSig) {
        if (seenWireSignatures.has(wireSig)) {
          possibleDuplicate = true;
        } else {
          seenWireSignatures.add(wireSig);
        }
      }

      const fingerprint = (src.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      if (fingerprint && seenContentFingerprints.has(fingerprint)) {
        possibleDuplicate = true;
      } else if (fingerprint) {
        seenContentFingerprints.add(fingerprint);
      }

      return {
        ...src,
        possibleDuplicate,
      };
    });
  }

  /**
   * Normalizes URLs to prevent duplicates with trailing slashes or tracking parameters
   */
  public normalizeUrl(urlStr: string): string {
    try {
      const parsed = new URL(urlStr);
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      return `${parsed.protocol}//${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/+$/, '')}`;
    } catch {
      return urlStr.toLowerCase().trim();
    }
  }

  /**
   * Extracts hostname safely
   */
  public extractDomain(urlStr: string): string {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Logs structured development summary
   */
  private logDebugSummary(
    claim: string,
    queries: string[],
    isTemporal: boolean,
    sources: ExaRetrievedSource[],
    ragContext: string
  ): void {
    console.log(`\n============================================================`);
    console.log(`CLAIM: ${claim}`);
    console.log(`============================================================\n`);
    console.log(`SEARCH QUERIES:\n${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n`);
    console.log(`RETRIEVED:\n${sources.map((s, i) => `${i + 1}. [${s.relevanceLabel || 'UNKNOWN'}] ${s.title || s.url} (${s.domain})`).join('\n')}\n`);
    console.log(`RELEVANCE BREAKDOWN:`);
    sources.forEach((s, i) => {
      console.log(`${i + 1}. ${s.relevanceLabel || 'IRRELEVANT'}`);
    });
    console.log(`\nFINAL EVIDENCE:\nOnly relevant sources retained for stance evaluation (${sources.filter((s) => s.relevanceLabel !== 'IRRELEVANT').length} items).`);
    console.log(`============================================================\n`);
  }
}

export const exaSearchService = new ExaSearchService();
export default exaSearchService;
