import * as cheerio from 'cheerio';
import { decode } from 'html-entities';
import {
  ExtractedClaim,
  RetrievedEvidenceItem,
  SourceType,
  EvidenceRelation,
  RelationToClaim,
  EvidenceRelevance,
  FreshnessCategory,
  RelevanceClassification,
  EvidenceCluster,
} from '../types/api.js';
import { sourceRegistry } from './sourceRegistry.service.js';
import { stanceEvaluatorService } from './stanceEvaluator.service.js';
import { entityExtractorService } from './entityExtractor.service.js';
import { googleFactCheckService } from './googleFactCheck.service.js';
import { exaSearchService } from './exaSearch.service.js';
import { env } from '../config/env.js';

interface RawCandidate {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  publishedDate: string | null;
  priorityTier: 1 | 2 | 3 | 4 | 5;
  sourceType?: SourceType;
  domain?: string;
}

const INSTITUTIONAL_TRIGGERS = [
  /\b(government|govt|politics|public policy|law|court|supreme court|high court|election|eci|health|who|rbi|isro|nasa|official announcement|scheme|ministry|parliament|pm|president|statutory|ruling party|ruler party|in power)\b/i,
];

const TIME_SENSITIVE_TRIGGERS = [
  /\b(current|now|latest|recently|present|winner|champion|champions|won|captain|president|prime minister|chief minister|ruler party|ruling party|in power|holds power|economic data|inflation rate|gdp|policy|regime|today|yesterday|this week|announced|dissolved|ceased|operations|earthquake|destroyed|resigned|resigns|resignation|demise|died|death|shutdown|closed|collapsed|\b20\d{2}\b)\b/i,
];

export class EvidenceRetrieverService {
  /**
   * Retrieves verified multi-source evidence for multiple extracted claims concurrently
   */
  public async retrieveEvidence(claims: ExtractedClaim[]): Promise<RetrievedEvidenceItem[]> {
    if (!claims || claims.length === 0) {
      return [];
    }

    const tStart = Date.now();
    const prioritizedClaims = claims.slice(0, 6);

    const evidencePromises = prioritizedClaims.map(async (claim) => {
      const isTimeSensitive = claim.isTimeSensitive || TIME_SENSITIVE_TRIGGERS.some((pat) => pat.test(claim.text));
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

    console.log(
      `[TIMING] Multi-source evidence retrieval completed in ${Date.now() - tStart}ms (claims: ${prioritizedClaims.length}, total items: ${flattened.length})`
    );
    return flattened;
  }

  /**
   * Generates 2-4 clean, semantic search queries from claim text and claim type
   */
  public generateSearchQueries(claimText: string, isTimeSensitive = false): string[] {
    const cleaned = claimText.replace(/[“”"'.,;!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    const queries = new Set<string>();

    // 0. Compound claim sub-query generation (Requirement 4)
    const subclaims = entityExtractorService.extractSubclaims(claimText);
    if (subclaims.length > 1) {
      for (const sub of subclaims) {
        if (sub.attribute) {
          queries.add(`largest continent by ${sub.attribute}`.trim());
          queries.add(`${sub.subject} largest ${sub.attribute}`.trim());
          queries.add(`${sub.subject} ${sub.attribute}`.trim());
        } else {
          const subTriple = entityExtractorService.extractClaimTriple(sub.text);
          if (subTriple?.attribute === 'location') {
            queries.add(`${subTriple.entity} location`);
            queries.add(`${subTriple.entity} located in`);
          } else if (subTriple?.attribute === 'superlative') {
            queries.add(`${subTriple.superlativeType} ${subTriple.category} in the world`.trim());
          }
        }
      }
    }

    const claimTriple = entityExtractorService.extractClaimTriple(claimText);

    // 1. Location assertion: generate query for the underlying factual location
    if (claimTriple && claimTriple.attribute === 'location') {
      queries.add(`${claimTriple.entity} location`);
      queries.add(`${claimTriple.entity} located in`);
      queries.add(`${claimTriple.entity} official location`);
      queries.add(`${claimTriple.entity} ${claimTriple.claimValue}`);
    }

    // 2. Capital assertion: generate capital city query
    if (claimTriple && claimTriple.attribute === 'capital') {
      queries.add(`capital city of ${claimTriple.entity}`);
      queries.add(`${claimTriple.entity} capital`);
    }

    // 2b. Shape & Geometric Form assertion (Bidirectional Search - Requirement 2, 3, 4)
    if (claimTriple && claimTriple.attribute === 'shape') {
      queries.add(`shape of ${claimTriple.entity} scientific evidence`);
      queries.add(`${claimTriple.entity} shape spherical NASA`);
      queries.add(`${claimTriple.entity} ${claimTriple.claimValue}`);
      queries.add(`what is the true shape of the ${claimTriple.entity}`);
    }

    // 2c. Quantity / Membership Count assertion (e.g. Earth has six continents)
    if (claimTriple && claimTriple.attribute === 'quantity_count') {
      const subj = claimTriple.holder || claimTriple.entity || 'Earth';
      const count = claimTriple.numericVal || 6;
      const topic = claimTriple.property || 'continents';
      const numWord = count === 6 ? 'six' : count === 7 ? 'seven' : count === 8 ? 'eight' : `${count}`;
      queries.add(`${subj} ${numWord} ${topic}`);
      queries.add(`number of ${topic} on ${subj}`);
      queries.add(`how many ${topic} are there on ${subj}`);
      queries.add(`${numWord} ${topic} model ${topic} of ${subj}`);
      queries.add(`${topic} of ${subj} geography models`);
    }

    // 2d. Composition assertion (e.g. The Moon is made of cheese)
    if (claimTriple && claimTriple.attribute === 'composition') {
      queries.add(`${claimTriple.entity} composition scientific facts`);
      queries.add(`what is the ${claimTriple.entity} made of geology`);
      queries.add(`${claimTriple.entity} rocks minerals basalt silicate`);
    }

    // 2e. Marital Status & Personal Status assertion (Requirement 14)
    if (claimTriple && claimTriple.attribute === 'marital_status') {
      queries.add(`${claimTriple.entity} marital status`);
      queries.add(`${claimTriple.entity} wife spouse`);
      queries.add(`${claimTriple.entity} married or unmarried`);
      queries.add(`${claimTriple.entity} bachelor single married`);
    }

    // 2f. Sports Role & Player Specialization assertion (Bidirectional Search)
    if ((claimTriple && claimTriple.attribute === 'sports_role') || /\b(rohit|virat|kohli|sharma)\b/i.test(cleaned)) {
      const subject = claimTriple?.entity || (cleaned.includes('Rohit') ? 'Rohit Sharma' : cleaned.includes('Virat') ? 'Virat Kohli' : cleaned.split(' ')[0]);
      queries.add(`${subject} playing role ESPNcricinfo Wikipedia profile`);
      queries.add(`${subject} primary playing style role batsman bowler all-rounder`);
      queries.add(`${subject} player profile role`);
      if (claimTriple?.claimValue) {
        queries.add(`${subject} ${claimTriple.claimValue}`);
      }
    }

    // 3. Astronomical / Scientific comparison or constant assertion
    if (claimTriple && (claimTriple.attribute === 'scientific' || claimTriple.attribute === 'comparison')) {
      if (claimTriple.claimValue.includes('orbits the sun')) {
        queries.add('Earth orbit around Sun');
        queries.add('Earth revolves around Sun solar system');
      } else if (claimTriple.claimValue.includes('0 degrees')) {
        queries.add('freezing point of water Celsius');
        queries.add('water freezes at 0 degrees Celsius');
      } else if (claimTriple.attribute === 'comparison') {
        queries.add(`${claimTriple.entity} size comparison Sun`);
        queries.add(`Sun diameter volume vs Earth`);
      } else {
        queries.add(`${cleaned} science`);
        queries.add(`${cleaned} physical constant`);
      }
    }

    // 4. Numerical / Quantitative assertion
    if (claimTriple && claimTriple.attribute === 'numerical') {
      queries.add(`${claimTriple.entity} ${claimTriple.claimValue}`);
      queries.add(`${claimTriple.entity} official statistics`);
      queries.add(`${cleaned}`);
    }

    // 5. Date / Temporal assertion
    if (claimTriple && claimTriple.attribute === 'temporal') {
      queries.add(`${claimTriple.entity} ${claimTriple.claimValue}`);
      queries.add(`${claimTriple.entity} timeline date`);
    }

    // 6. Superlatives & Comparisons (Requirement 8)
    if (claimTriple && claimTriple.attribute === 'superlative') {
      const superType = claimTriple.superlativeType || 'largest';
      const category = claimTriple.category || 'entity';
      const scope = claimTriple.scope || 'Solar System';
      queries.add(`${superType} ${category} in the ${scope}`.trim());
      queries.add(`${superType} ${category} ${scope}`.trim());
      queries.add(`${superType} ${category} in the world`.trim());
      if (claimTriple.holder) {
        queries.add(`${claimTriple.holder} ${superType} ${category}`.trim());
      }
    } else if (/\b(largest|biggest|smallest|highest|tallest|deepest|longest|fastest|coldest|hottest|most populous)\b/i.test(cleaned)) {
      const superlativeMatch = cleaned.match(
        /\b(largest|biggest|smallest|highest|tallest|deepest|longest|fastest|coldest|hottest|most populous)\s*(\w+)?/i
      );
      const subject = claimTriple?.entity || cleaned.split(' ')[0];
      if (superlativeMatch && subject) {
        queries.add(`${superlativeMatch[0]} in the world`);
        queries.add(`${superlativeMatch[0]} Solar System`);
        queries.add(`${subject} ${superlativeMatch[0]}`);
      }
    }

    // 6b. Composition & Material assertion (Requirement 3, 4, 5)
    if (claimTriple && claimTriple.attribute === 'composition') {
      const subject = claimTriple.holder || claimTriple.entity;
      queries.add(`${subject} composition scientific`);
      queries.add(`what is the ${subject} made of`);
      queries.add(`${subject} geology surface material`);
      queries.add(`${subject} planetary body composition`);
    }

    // 6c. Scientific Constants & Boiling/Freezing
    if (claimTriple && claimTriple.attribute === 'scientific' && claimTriple.property) {
      const subject = claimTriple.holder || 'water';
      queries.add(`${subject} ${claimTriple.property} standard atmospheric pressure`);
      queries.add(`${subject} ${claimTriple.property} celsius`);
    }

    // 7. Tournament / Competition Winner assertion
    if (claimTriple && claimTriple.attribute === 'winner') {
      const year = claimTriple.year ? `${claimTriple.year} ` : '';
      const tourney = claimTriple.tournament || 'World Cup';
      queries.add(`${year}${tourney} winner`);
      queries.add(`${year}${tourney} final result champion`);
      queries.add(`${year}${tourney} final score`);
      if (claimTriple.holder) {
        queries.add(`${claimTriple.holder} ${year}${tourney}`);
      }
    }

    // 8. Role Holder & Leadership assertion
    if (claimTriple && claimTriple.attribute === 'role_holder') {
      const roleStr = claimTriple.role || 'captain';
      const holderStr = claimTriple.holder || '';
      queries.add(`${claimTriple.entity} current`);
      queries.add(`${claimTriple.entity} new`);
      if (holderStr) {
        queries.add(`${holderStr} ${roleStr}`);
        queries.add(`${holderStr} replaced ${roleStr}`);
      }
    }

    // 8. Transition & Replacement assertion
    if (claimTriple && claimTriple.attribute === 'transition') {
      queries.add(`${claimTriple.holder} replaced ${claimTriple.replacedEntity}`);
      queries.add(`${claimTriple.holder} new ${claimTriple.role}`);
      queries.add(`${claimTriple.entity} captain`);
    }

    // 9. Time-sensitive political / governance queries
    if (/ruler party|ruling party|prime minister/i.test(cleaned)) {
      const fixed = cleaned.replace(/ruler party/i, 'ruling party');
      queries.add(`${fixed} Union government`);
      queries.add(`current Prime Minister of India official`);
    }

    // 10. Fact-Check & Verification Queries (Requirement 4 & 7)
    queries.add(`${cleaned} fact check`);
    queries.add(`${cleaned} verified`);

    return Array.from(queries).slice(0, 4);
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
    const seenTitles = new Set<string>();
    let totalSourcesAttempted = 0;

    const addCandidate = (c: RawCandidate) => {
      const normTitle = c.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      let domain = '';
      try {
        domain = new URL(c.url).hostname.replace(/^www\./, '');
      } catch {
        domain = 'unknown';
      }
      c.domain = domain;

      if (c.url && !seenUrls.has(c.url) && !seenTitles.has(normTitle) && this.isValidEvidenceUrl(c.url)) {
        seenUrls.add(c.url);
        seenTitles.add(normTitle);
        rawCandidates.push(c);
      }
    };

    const isInstitutional = INSTITUTIONAL_TRIGGERS.some((pat) => pat.test(claim.text));

    // -------------------------------------------------------------
    // BATCH 1: Priority Fact-Checkers, Wire Services & Official Portals
    // -------------------------------------------------------------
    const batch1Tasks: Promise<void>[] = [
      // 1. Google Fact Check API (Primary Query)
      googleFactCheckService
        .searchFactChecks(primaryQuery)
        .then((fcs) => {
          totalSourcesAttempted += fcs.length;
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

      // 2. Authoritative Knowledge & Reference Repositories (Britannica, Wikipedia, National Geographic, NASA, etc.)
      this.fetchAuthoritativeReferences(claim, searchQueries)
        .then((krs) => {
          totalSourcesAttempted += krs.length;
          for (const kr of krs) {
            addCandidate(kr);
          }
        })
        .catch(() => {}),

      // 3. Google News RSS Live Wires (Searches primary query)
      this.searchGoogleNewsRss(primaryQuery, 6)
        .then((nrs) => {
          totalSourcesAttempted += nrs.length;
          for (const nr of nrs) {
            const regCheck = sourceRegistry.matchSource(nr.publisher) || sourceRegistry.matchSource(nr.url);
            const tier = regCheck ? regCheck.credibilityTier : 2;
            addCandidate({ ...nr, priorityTier: tier, sourceType: 'news' });
          }
        })
        .catch(() => {}),

      // 4. DuckDuckGo Web Search (Primary query across general index)
      this.searchWeb(primaryQuery, 5)
        .then((wrs) => {
          totalSourcesAttempted += wrs.length;
          for (const wr of wrs) {
            const regCheck = sourceRegistry.matchSource(wr.publisher) || sourceRegistry.matchSource(wr.url);
            const tier = regCheck ? regCheck.credibilityTier : 3;
            addCandidate({ ...wr, priorityTier: tier });
          }
        })
        .catch(() => {}),

      // 5. Exa.ai Web Retrieval API (Live neural retrieval)
      ...(env.EXA_API_KEY
        ? [
            exaSearchService
              .retrieveEvidenceForClaim(primaryQuery)
              .then((exaRes) => {
                totalSourcesAttempted += exaRes.sources.length;
                for (const src of exaRes.sources) {
                  const regCheck = sourceRegistry.matchSource(src.domain) || sourceRegistry.matchSource(src.url);
                  const tier = regCheck ? regCheck.credibilityTier : 2;
                  addCandidate({
                    title: src.title || `${primaryQuery} reference`,
                    url: src.url,
                    publisher: src.domain,
                    snippet: src.content,
                    publishedDate: src.publishedDate || null,
                    priorityTier: tier,
                    sourceType: 'reference',
                  });
                }
              })
              .catch(() => {}),
          ]
        : []),
    ];

    // BATCH 2: Bidirectional & extra queries — merged into batch1 for speed
    if (searchQueries.length > 1) {
      batch1Tasks.push(
        this.searchWeb(searchQueries[1], 3)
          .then((wrs) => {
            totalSourcesAttempted += wrs.length;
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
      batch1Tasks.push(
        this.searchWeb(govQuery, 3)
          .then((grs) => {
            totalSourcesAttempted += grs.length;
            for (const g of grs) {
              addCandidate({ ...g, priorityTier: 1, sourceType: 'official' });
            }
          })
          .catch(() => {})
      );
    }

    await Promise.allSettled(batch1Tasks);

    // -------------------------------------------------------------
    // BATCH 3: Targeted Fact-Check Platforms (Alt News, BOOM, PIB, Snopes, etc.)
    // -------------------------------------------------------------
    if (rawCandidates.length < 10 && searchQueries.length > 3) {
      const factCheckQuery = `${searchQueries[3]} (site:boomlive.in OR site:altnews.in OR site:factchecker.in OR site:snopes.com OR site:factcheck.org OR site:pib.gov.in)`;
      await this.searchWeb(factCheckQuery, 4)
        .then((fcrs) => {
          totalSourcesAttempted += fcrs.length;
          for (const fc of fcrs) {
            addCandidate({ ...fc, priorityTier: 2, sourceType: 'fact_check' });
          }
        })
        .catch(() => {});
    }

    // Rank candidates by priority tier: Tier 1 (Official) > Tier 2 (Fact-Check / Wires) > Tier 3 (Reputable Media) > Tier 4 (Reference) > Tier 5 (Other)
    rawCandidates.sort((a, b) => a.priorityTier - b.priorityTier);
    // Target 10-20 high-quality evidence candidates (Requirement 6)
    const prioritizedCandidates = rawCandidates.slice(0, 16);

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

      const relevanceMultiplier = stance.relevance === 'direct' ? 1.0 : stance.relevance === 'related' ? 0.35 : 0.0;
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

      const domain = candidate.domain || this.extractDomain(candidate.url);
      const freshness = this.computeFreshness(candidate.publishedDate, isTimeSensitive);
      const relevanceClassification: RelevanceClassification =
        stance.relevance === 'direct'
          ? 'DIRECTLY_RELEVANT'
          : stance.relevance === 'related'
          ? 'PARTIALLY_RELEVANT'
          : 'IRRELEVANT';

      // Log decision
      console.log(`\n------------------------------------------------------------`);
      console.log(`CLAIM: ${claim.text}`);
      if (claimTriple) {
        console.log(`ENTITY: ${claimTriple.entity} | ATTR: ${claimTriple.attribute} | VAL: ${claimTriple.claimValue}`);
      }
      console.log(`SOURCE: ${candidate.url} (Domain: ${domain})`);
      console.log(`SOURCE TIER: Tier ${sourceEval.credibilityTier} (${sourceEval.category}) | FRESHNESS: ${freshness}`);
      console.log(`RELEVANCE: ${relevanceClassification} | RELATION: ${stance.relation} (${stance.stanceScore > 0 ? '+1' : stance.stanceScore < 0 ? '-1' : '0'})`);
      console.log(`REASONING: ${stance.reasoning}`);
      console.log(`------------------------------------------------------------\n`);

      return {
        sourceName: resolvedName,
        sourceUrl: candidate.url,
        sourceTier: sourceEval.credibilityTier,
        sourceReliability: sourceEval.reliabilityScore,
        title: decode(candidate.title),
        publishedDate: candidate.publishedDate,
        publicationDate: candidate.publishedDate,
        evidenceText: decode(candidate.snippet),
        relationToClaim: stance.relationToClaim,
        relevance: stance.relevance,
        confidence: stance.confidence,
        credibilityScore: credScore,
        relevanceScore: stance.relevanceScore,
        keyEvidence: stance.keyEvidence,
        explanation: stance.explanation,
        finalContribution,
        domain,
        freshness,
        temporalRelevance: stance.temporalRelevance || (isTimeSensitive ? 'TEMPORALLY_RELEVANT' : 'HISTORICAL'),
        relevanceClassification,
        stance: stance.relation,

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

    // Populate claim-level independent consensus metrics
    this.calculateClaimConsensusMetrics(claim, evidenceList);

    // Return 10-16 high-quality candidate evidence items
    return evidenceList.slice(0, 16);
  }

  /**
   * Groups syndicated and duplicate evidence items into independent evidence clusters
   */
  public clusterEvidence(evidenceList: RetrievedEvidenceItem[]): EvidenceCluster[] {
    const clusterMap = new Map<string, RetrievedEvidenceItem[]>();

    for (const ev of evidenceList) {
      const domain = (ev.domain || ev.sourceName || 'unknown').toLowerCase().replace(/^www\./, '');
      const text = (ev.evidenceText || ev.snippet || '').toLowerCase();

      // Check if text is syndicated from a known wire
      let clusterKey = domain;
      if (text.includes('(pti)') || text.includes('press trust of india') || text.includes('ptinews')) {
        clusterKey = 'wire:pti';
      } else if (text.includes('(reuters)') || text.includes('reuters.com')) {
        clusterKey = 'wire:reuters';
      } else if (text.includes('(ap)') || text.includes('associated press') || text.includes('apnews')) {
        clusterKey = 'wire:ap';
      } else if (text.includes('(ani)') || text.includes('asian news international')) {
        clusterKey = 'wire:ani';
      } else if (text.includes('(afp)') || text.includes('agence france-presse')) {
        clusterKey = 'wire:afp';
      }

      if (!clusterMap.has(clusterKey)) {
        clusterMap.set(clusterKey, []);
      }
      clusterMap.get(clusterKey)!.push(ev);
    }

    const clusters: EvidenceCluster[] = [];
    let clusterIdx = 1;

    for (const [key, items] of clusterMap.entries()) {
      const supCount = items.filter((i) => i.relation === 'supports' || i.relationToClaim === 'SUPPORTS').length;
      const conCount = items.filter((i) => i.relation === 'contradicts' || i.relationToClaim === 'CONTRADICTS').length;
      const dominantStance: EvidenceRelation =
        conCount > supCount ? 'contradicts' : supCount > conCount ? 'supports' : 'unclear';

      const maxQuality = Math.max(...items.map((i) => i.sourceReliability || 50));
      const primaryItem = items[0];

      clusters.push({
        clusterId: `cluster-${clusterIdx++}`,
        primaryDomain: key.startsWith('wire:') ? key.replace('wire:', '') : primaryItem.domain || primaryItem.sourceName,
        origin: key.startsWith('wire:') ? key.replace('wire:', '').toUpperCase() : primaryItem.sourceName,
        sourceArticles: items,
        stance: dominantStance,
        quality: maxQuality,
        independenceScore: 1.0,
        representativeSnippet: primaryItem.evidenceText || primaryItem.snippet || primaryItem.title,
      });
    }

    return clusters;
  }

  /**
   * Calculates independent source counts and consensus status on a claim
   */
  public calculateClaimConsensusMetrics(
    claim: ExtractedClaim,
    evidenceList: Omit<RetrievedEvidenceItem, 'id' | 'claimId'>[] | RetrievedEvidenceItem[]
  ): void {
    const rawCount = evidenceList.length;
    const distinctDomains = new Set<string>();
    let supCount = 0;
    let conCount = 0;
    let uncCount = 0;
    const supDomains = new Set<string>();
    const conDomains = new Set<string>();

    for (const ev of evidenceList) {
      const d = ev.domain || this.extractDomain(ev.sourceUrl || ev.url);
      distinctDomains.add(d);

      if (ev.relation === 'supports' || ev.relationToClaim === 'SUPPORTS') {
        supCount++;
        supDomains.add(d);
      } else if (ev.relation === 'contradicts' || ev.relationToClaim === 'CONTRADICTS') {
        conCount++;
        conDomains.add(d);
      } else {
        uncCount++;
      }
    }

    claim.rawSourceCount = rawCount;
    claim.independentSourceCount = distinctDomains.size;
    claim.supportingEvidenceCount = supCount;
    claim.independentSupportingSources = supDomains.size;
    claim.contradictingEvidenceCount = conCount;
    claim.independentContradictingSources = conDomains.size;
    claim.unclearSources = uncCount;

    if (conDomains.size > 0 && supDomains.size > 0) {
      claim.consensusStatus = 'CONFLICTING_EVIDENCE';
    } else if (supDomains.size > 0) {
      claim.consensusStatus = 'UNANIMOUS_SUPPORT';
    } else if (conDomains.size > 0) {
      claim.consensusStatus = 'UNANIMOUS_CONTRADICTION';
    } else {
      claim.consensusStatus = 'INSUFFICIENT_EVIDENCE';
    }
  }

  /**
   * Extracts domain hostname safely
   */
  public extractDomain(urlStr: string): string {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Evaluates freshness category based on publication timestamp
   */
  public computeFreshness(publishedDateStr: string | null, isTimeSensitive: boolean): FreshnessCategory {
    if (!publishedDateStr) {
      return isTimeSensitive ? 'UNKNOWN' : 'RECENT';
    }

    try {
      const pubDate = new Date(publishedDateStr);
      if (isNaN(pubDate.getTime())) return 'UNKNOWN';

      const now = new Date();
      const diffDays = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 7) return 'CURRENT';
      if (diffDays < 90) return 'RECENT';
      if (diffDays > 365) return 'OLD';
      return 'RECENT';
    } catch {
      return 'UNKNOWN';
    }
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
              domain: 'en.wikipedia.org',
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
        domain: this.extractDomain(r.url),
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
            domain: this.extractDomain(sourceUrl),
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
            domain: this.extractDomain(targetUrl),
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
