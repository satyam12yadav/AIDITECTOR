import { exaSearchService, ExaRetrievedSource } from './exaSearch.service.js';
import { entityExtractorService } from './entityExtractor.service.js';
import { claimExtractorService } from './claimExtractor.service.js';
import { stanceEvaluatorService } from './stanceEvaluator.service.js';
import { semanticContradictionEngine } from './semanticContradictionEngine.service.js';

export type EvidenceStanceType = 'SUPPORTS' | 'CONTRADICTS' | 'IRRELEVANT' | 'INSUFFICIENT';
export type OverallAssessmentType = 'STRONG_SUPPORT' | 'SUPPORTS' | 'STRONG_CONTRADICTION' | 'CONTRADICTS' | 'MIXED' | 'INSUFFICIENT';

export interface ClaimSemanticRepresentation {
  subject: string;
  predicate: string;
  object: string;
  time: 'CURRENT' | 'PAST' | 'FUTURE' | 'HISTORICAL';
  location?: string;
  polarity: 'POSITIVE' | 'NEGATIVE';
}

export interface ClaimRelevanceGateResult {
  relevant: boolean;
  relevanceConfidence: number; // 0.0 - 1.0
  reason: string;
}

export interface SourceEvidenceAnalysisItem {
  sourceId: string;
  url: string;
  domain: string;
  title: string | null;
  publishedDate: string | null;
  stance: EvidenceStanceType;
  confidence: number; // 0.0 - 1.0
  reason: string;
  keyEvidence: string;
  contentQuality: 'FULL' | 'SNIPPET_ONLY';
  possibleDuplicate?: boolean;
  extractedProposition?: string;
  contradictionType?: string;
  relevanceGate?: ClaimRelevanceGateResult;
}

export interface ClaimEvidenceAnalysisResult {
  claim: string;
  classification: string;
  isTemporal: boolean;
  semanticRepresentation: ClaimSemanticRepresentation;
  queriesUsed: string[];
  evidenceAnalysis: SourceEvidenceAnalysisItem[];
  overallAssessment: {
    totalEvaluated: number;
    relevantSourcesCount: number;
    supportingEvidence: number;
    contradictingEvidence: number;
    irrelevantEvidence: number;
    insufficientEvidence: number;
    assessment: OverallAssessmentType;
    summary: string;
  };
  ragContext: string;
}

export interface MultiClaimAnalysisResponse {
  originalInput: string;
  claims: ClaimEvidenceAnalysisResult[];
  totalClaims: number;
}

export class RagEvidenceAnalyzerService {
  /**
   * Main entry point: decomposes input into atomic claims, retrieves evidence, analyzes stance with generalized contradiction engine
   */
  public async analyzeEvidenceForInput(input: string): Promise<MultiClaimAnalysisResponse> {
    const trimmed = input.trim();
    const atomicClaims = this.decomposeIntoAtomicClaims(trimmed);

    const claimResults: ClaimEvidenceAnalysisResult[] = [];
    for (const claimText of atomicClaims) {
      const analysis = await this.analyzeSingleClaim(claimText);
      claimResults.push(analysis);
    }

    return {
      originalInput: trimmed,
      claims: claimResults,
      totalClaims: claimResults.length,
    };
  }

  /**
   * Splits compound sentences into atomic factual propositions
   */
  public decomposeIntoAtomicClaims(inputText: string): string[] {
    const subclaims = entityExtractorService.extractSubclaims(inputText);
    if (subclaims.length > 1) {
      return subclaims.map((s) => s.text.trim()).filter((t) => t.length > 0);
    }

    // Secondary heuristic sentence split
    const sentences = inputText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length > 1) {
      return sentences;
    }

    return [inputText.trim()];
  }

  /**
   * Constructs the formal semantic representation of an atomic claim
   */
  public extractClaimRepresentation(claimText: string): ClaimSemanticRepresentation {
    const isTemporal = /\b(current|currently|now|today|latest|present|recent|recently|this year|in power|captain|winner|champion|president|\b20\d{2}\b)\b/i.test(claimText);
    const isNegated = /\b(not|never|no longer|neither|none|cannot)\b/i.test(claimText);
    const triple = entityExtractorService.extractClaimTriple(claimText);

    if (triple) {
      if (triple.attribute === 'role_holder') {
        return {
          subject: triple.holder || triple.claimValue,
          predicate: `is ${triple.role || 'captain'} of`,
          object: triple.entity,
          time: isTemporal ? 'CURRENT' : 'HISTORICAL',
          polarity: isNegated ? 'NEGATIVE' : 'POSITIVE',
        };
      }
      if (triple.attribute === 'shape') {
        return {
          subject: triple.entity,
          predicate: 'has geometric shape',
          object: triple.claimValue,
          time: 'HISTORICAL',
          polarity: isNegated ? 'NEGATIVE' : 'POSITIVE',
        };
      }
      if (triple.attribute === 'location') {
        return {
          subject: triple.entity,
          predicate: 'is located in',
          object: triple.claimValue,
          time: 'HISTORICAL',
          polarity: isNegated ? 'NEGATIVE' : 'POSITIVE',
        };
      }
      if (triple.attribute === 'marital_status') {
        return {
          subject: triple.entity,
          predicate: 'marital status',
          object: triple.claimValue,
          time: isTemporal ? 'CURRENT' : 'HISTORICAL',
          polarity: isNegated ? 'NEGATIVE' : 'POSITIVE',
        };
      }
    }

    return {
      subject: claimText.split(/\s+/).slice(0, 3).join(' '),
      predicate: 'asserts',
      object: claimText,
      time: isTemporal ? 'CURRENT' : 'HISTORICAL',
      polarity: isNegated ? 'NEGATIVE' : 'POSITIVE',
    };
  }

  /**
   * STAGE A: Strict Claim-Specific Relevance Gate
   */
  public evaluateClaimRelevance(
    claimText: string,
    contentText: string,
    titleText: string
  ): ClaimRelevanceGateResult {
    const combined = `${titleText} ${contentText}`.toLowerCase();
    const claimTriple = entityExtractorService.extractClaimTriple(claimText);

    // 1. Role Holder / Captaincy Claims (e.g. "Suryakumar Yadav is captain of India")
    if (claimTriple && claimTriple.attribute === 'role_holder') {
      const isPhotoSnubAI = /\b(snubbing|handshake|photo.*is ai|viral (photo|video|image|clip)|deepfake|meme)\b/i.test(combined);
      const isWifePersonal = /\b(wife|family|interview|childhood|personal life|marriage)\b/i.test(combined);
      const isMatchStatsOnly = /\b(scored \d+|scored \d+ runs|hit \d+|batting performance|runs against|runs for)\b/i.test(combined);
      const hasLeadershipContext = /\b(captain|captaincy|skipper|skippers|leading the side|leadership|appointed as|named as|replaced as|dropped from squad|stepped down|t20i captain|t20 captain|new captain|squad captain|prime minister|president|ceo|minister)\b/i.test(combined);

      if (isPhotoSnubAI && !combined.includes('appointed') && !combined.includes('replaced') && !combined.includes('remains')) {
        return {
          relevant: false,
          relevanceConfidence: 0.98,
          reason: 'Article discusses a viral handshake photo / AI deepfake event but does not establish or evaluate leadership status.',
        };
      }

      if (isWifePersonal && !combined.includes('appointed') && !combined.includes('replaced') && !combined.includes('remains')) {
        return {
          relevant: false,
          relevanceConfidence: 0.97,
          reason: "Article discusses person's personal life or wife's interview but does not establish role status.",
        };
      }

      if (isMatchStatsOnly && !combined.includes('captain') && !combined.includes('skipper')) {
        return {
          relevant: false,
          relevanceConfidence: 0.96,
          reason: 'Article discusses individual batting match score without evaluating captaincy status.',
        };
      }

      if (!hasLeadershipContext) {
        return {
          relevant: false,
          relevanceConfidence: 0.94,
          reason: 'Article mentions the subject but does not provide evidence regarding leadership appointment.',
        };
      }

      return {
        relevant: true,
        relevanceConfidence: 0.95,
        reason: 'Article directly addresses leadership status and appointment.',
      };
    }

    // 2. Geometric Shape Claims (e.g. "Earth is approximately spherical" or "Earth is flat")
    if (claimTriple && claimTriple.attribute === 'shape') {
      const hasShapeContext =
        /\b(shape|flat|sphere|spherical|round|oblate spheroid|ellipsoid|geoid|curvature|disc planet|flat earth|why.*isn'?t flat|how do we know the earth isn'?t flat|debate a flat-earther|believe.*earth is flat)\b/i.test(combined);

      const isSolarOrderOnly =
        /\b(third planet|distance from sun|solar system|habitable zone|atmosphere)\b/i.test(combined) && !hasShapeContext;

      if (isSolarOrderOnly || !hasShapeContext) {
        return {
          relevant: false,
          relevanceConfidence: 0.95,
          reason: "Article discusses solar system position or orbit without evaluating geometric shape.",
        };
      }

      return {
        relevant: true,
        relevanceConfidence: 0.98,
        reason: 'Article directly evaluates planetary geometry, geodesy, or shape.',
      };
    }

    // 3. Marital Status Claims (e.g. "Salman Khan is married")
    if (claimTriple && claimTriple.attribute === 'marital_status') {
      const hasMaritalContext =
        /\b(married|marriage|wedding|wife|husband|spouse|bachelor|unmarried|single)\b/i.test(combined);

      if (!hasMaritalContext) {
        return {
          relevant: false,
          relevanceConfidence: 0.96,
          reason: 'Article discusses film releases and entertainment without addressing marital status.',
        };
      }

      return {
        relevant: true,
        relevanceConfidence: 0.95,
        reason: 'Article directly addresses personal marital status or relationship records.',
      };
    }

    // 4. Winner Claims (e.g. "Spain won the 2026 World Cup")
    if (claimTriple && claimTriple.attribute === 'winner') {
      const hasWinnerContext =
        /\b(won|winner|champion|championship|victory|defeated|trophy|final)\b/i.test(combined);

      if (!hasWinnerContext) {
        return {
          relevant: false,
          relevanceConfidence: 0.94,
          reason: 'Article does not evaluate tournament outcome or championship result.',
        };
      }

      return {
        relevant: true,
        relevanceConfidence: 0.95,
        reason: 'Article directly evaluates tournament victory or competition champion.',
      };
    }

    return {
      relevant: true,
      relevanceConfidence: 0.85,
      reason: 'Article passes general relevance criteria.',
    };
  }

  /**
   * Analyzes an individual atomic claim against retrieved RAG evidence
   */
  public async analyzeSingleClaim(claimText: string): Promise<ClaimEvidenceAnalysisResult> {
    // 1. Classification & Semantic representation
    const classInfo = claimExtractorService.classifyClaimClassification(claimText);
    const classification = classInfo.classification;
    const { isTemporal, queries } = exaSearchService.generateSearchQueries(claimText);
    const semanticRep = this.extractClaimRepresentation(claimText);

    // 2. Check theological or personal belief assertions (e.g. "Modi is God")
    const isBeliefClaim =
      classification === 'BELIEF_OR_THEOLOGICAL' ||
      /\b(is god|is a god|divine|messiah|prophet|incarnation of god|holy spirit)\b/i.test(claimText);

    const effectiveClassification = isBeliefClaim ? 'BELIEF_OR_THEOLOGICAL' : classification;

    // 3. Retrieve Phase 1 Evidence
    const evidenceResult = await exaSearchService.retrieveEvidenceForClaim(claimText);
    const sources = evidenceResult.sources;
    const ragContext = evidenceResult.ragContext;

    // 4. Perform Two-Stage Evidence Analysis
    const evidenceAnalysis: SourceEvidenceAnalysisItem[] = [];

    for (let idx = 0; idx < sources.length; idx++) {
      const src = sources[idx];
      const sourceAnalysis = await this.analyzeSourceStance(claimText, src, idx + 1, isTemporal, isBeliefClaim);
      evidenceAnalysis.push(sourceAnalysis);
    }

    // 5. Calculate Overall Assessment
    const relevantSources = evidenceAnalysis.filter((e) => e.stance !== 'IRRELEVANT');
    const supportingCount = evidenceAnalysis.filter((e) => e.stance === 'SUPPORTS').length;
    const contradictingCount = evidenceAnalysis.filter((e) => e.stance === 'CONTRADICTS').length;
    const irrelevantCount = evidenceAnalysis.filter((e) => e.stance === 'IRRELEVANT').length;
    const insufficientCount = evidenceAnalysis.filter((e) => e.stance === 'INSUFFICIENT').length;

    let overallStance: OverallAssessmentType = 'INSUFFICIENT';
    let summary = '';

    if (isBeliefClaim) {
      overallStance = 'INSUFFICIENT';
      summary = 'This statement expresses a theological belief or personal philosophical conviction that falls outside scientific factual verification.';
    } else if (contradictingCount >= 2 && supportingCount === 0) {
      overallStance = 'STRONG_CONTRADICTION';
      summary = `Authoritative evidence consistently and directly contradicts this claim across ${contradictingCount} independent sources (${relevantSources.length} relevant sources evaluated).`;
    } else if (contradictingCount > 0 && supportingCount === 0) {
      overallStance = 'CONTRADICTS';
      summary = `The retrieved evidence contradicts this claim across ${contradictingCount} authoritative source(s) (${relevantSources.length} relevant sources evaluated).`;
    } else if (supportingCount >= 2 && contradictingCount === 0) {
      overallStance = 'STRONG_SUPPORT';
      summary = `Authoritative evidence consistently verifies and corroborates this claim across ${supportingCount} independent sources (${relevantSources.length} relevant sources evaluated).`;
    } else if (supportingCount > 0 && contradictingCount === 0) {
      overallStance = 'SUPPORTS';
      summary = `The retrieved evidence directly supports this claim across ${supportingCount} authoritative source(s) (${relevantSources.length} relevant sources evaluated).`;
    } else if (supportingCount > 0 && contradictingCount > 0) {
      overallStance = 'MIXED';
      summary = `The retrieved evidence presents conflicting accounts (${supportingCount} supporting vs ${contradictingCount} contradicting out of ${relevantSources.length} relevant sources).`;
    } else if (insufficientCount > 0) {
      overallStance = 'INSUFFICIENT';
      summary = `Available relevant sources (${insufficientCount} source(s)) do not provide sufficient direct evidence to confirm current ongoing status.`;
    } else {
      overallStance = 'INSUFFICIENT';
      summary = `No relevant sources directly evaluating this specific proposition were found (${irrelevantCount} irrelevant source(s) filtered).`;
    }

    // 6. Development Debug Output
    this.logDebugOutput(claimText, effectiveClassification, isTemporal, evidenceAnalysis, overallStance, summary);

    return {
      claim: claimText,
      classification: effectiveClassification,
      isTemporal,
      semanticRepresentation: semanticRep,
      queriesUsed: queries,
      evidenceAnalysis,
      overallAssessment: {
        totalEvaluated: evidenceAnalysis.length,
        relevantSourcesCount: relevantSources.length,
        supportingEvidence: supportingCount,
        contradictingEvidence: contradictingCount,
        irrelevantEvidence: irrelevantCount,
        insufficientEvidence: insufficientCount,
        assessment: overallStance,
        summary,
      },
      ragContext,
    };
  }

  /**
   * Evaluates the semantic relationship of a single retrieved source to the claim using the Generalized Contradiction Engine
   */
  public async analyzeSourceStance(
    claimText: string,
    src: ExaRetrievedSource,
    sourceIndex: number,
    isTemporal: boolean,
    isBeliefClaim: boolean
  ): Promise<SourceEvidenceAnalysisItem> {
    const sourceId = `src-${sourceIndex}`;
    const contentText = src.content || '';
    const titleText = src.title || '';
    const domain = src.domain || 'unknown';
    const contentQuality = src.contentAvailability || 'SNIPPET_ONLY';

    // If claim is a theological/belief claim, do not force factual stance
    if (isBeliefClaim) {
      return {
        sourceId,
        url: src.url,
        domain,
        title: src.title,
        publishedDate: src.publishedDate,
        stance: 'INSUFFICIENT',
        confidence: 0.5,
        reason: 'Subjective theological and spiritual beliefs are not verifiable as empirical facts.',
        keyEvidence: contentText.slice(0, 150) || 'Theological assertion',
        contentQuality,
        possibleDuplicate: src.possibleDuplicate,
        extractedProposition: 'Theological or spiritual belief statement',
      };
    }

    // =================================================================================
    // STAGE A: STRICT CLAIM-SPECIFIC RELEVANCE GATE
    // =================================================================================
    const relevanceGate = this.evaluateClaimRelevance(claimText, contentText, titleText);

    if (!relevanceGate.relevant) {
      return {
        sourceId,
        url: src.url,
        domain,
        title: src.title,
        publishedDate: src.publishedDate,
        stance: 'IRRELEVANT',
        confidence: relevanceGate.relevanceConfidence,
        reason: relevanceGate.reason,
        keyEvidence: (titleText || contentText).slice(0, 160),
        contentQuality,
        possibleDuplicate: src.possibleDuplicate,
        extractedProposition: 'Irrelevant to specific claim proposition',
        relevanceGate,
      };
    }

    // =================================================================================
    // STAGE B: GENERALIZED SEMANTIC CONTRADICTION & STANCE EVALUATION
    // =================================================================================
    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claimText,
      contentText,
      titleText,
      domain
    );

    let keyEvidence = titleText || '';
    if (contentText) {
      const firstPeriod = contentText.indexOf('.');
      keyEvidence = firstPeriod !== -1 ? contentText.slice(0, firstPeriod + 1).trim() : contentText.slice(0, 160).trim();
    }

    return {
      sourceId,
      url: src.url,
      domain,
      title: src.title,
      publishedDate: src.publishedDate,
      stance: semanticRes.stance,
      confidence: semanticRes.confidence,
      contradictionType: semanticRes.contradictionType,
      reason: semanticRes.reason,
      keyEvidence: keyEvidence || titleText || 'Extracted evidence',
      contentQuality,
      possibleDuplicate: src.possibleDuplicate,
      extractedProposition: semanticRes.evidenceProposition
        ? `${semanticRes.evidenceProposition.subject} | ${semanticRes.evidenceProposition.property} | ${semanticRes.evidenceProposition.polarity}`
        : titleText || 'Extracted proposition',
      relevanceGate,
    };
  }

  /**
   * Structured Development Debug Logging
   */
  private logDebugOutput(
    claim: string,
    classification: string,
    isTemporal: boolean,
    evidenceAnalysis: SourceEvidenceAnalysisItem[],
    overallStance: OverallAssessmentType,
    summary: string
  ): void {
    const relevantCount = evidenceAnalysis.filter((e) => e.stance !== 'IRRELEVANT').length;
    console.log('\n============================================================');
    console.log('🔬 [PHASE 3B: GENERALIZED SEMANTIC CONTRADICTION DEBUG]');
    console.log('============================================================');
    console.log(`CLAIM: "${claim}"`);
    console.log(`CLASSIFICATION: ${classification} | TIME-SENSITIVE: ${isTemporal}`);
    console.log(`TOTAL SOURCES: ${evidenceAnalysis.length} | RELEVANT SOURCES: ${relevantCount}`);
    console.log(`OVERALL EVIDENCE ASSESSMENT: ${overallStance}`);
    console.log(`SUMMARY: ${summary}\n`);
    console.log('SOURCE-BY-SOURCE EVALUATION:');
    evidenceAnalysis.forEach((item) => {
      console.log(`------------------------------------------------------------`);
      console.log(`SOURCE: ${item.domain} (${item.sourceId})`);
      console.log(`RELEVANCE: ${item.relevanceGate?.relevant ? '✅ RELEVANT' : '❌ IRRELEVANT'}`);
      console.log(`STANCE: ${item.stance} | CONFIDENCE: ${item.confidence}`);
      if (item.contradictionType) {
        console.log(`CONTRADICTION TYPE: ${item.contradictionType}`);
      }
      console.log(`EXTRACTED PROPOSITION: "${item.extractedProposition}"`);
      console.log(`REASON: ${item.reason}`);
      console.log(`KEY EVIDENCE: "${item.keyEvidence}"`);
    });
    console.log('============================================================\n');
  }
}

export const ragEvidenceAnalyzerService = new RagEvidenceAnalyzerService();
export default ragEvidenceAnalyzerService;
