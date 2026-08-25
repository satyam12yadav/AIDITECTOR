import {
  ArticleMetadata,
  ExtractedClaim,
  RetrievedEvidenceItem,
  ScoreBreakdown,
  CredibilityVerdict,
} from '../types/api.js';
import { sourceRegistry } from './sourceRegistry.service.js';

export interface CredibilityScoreResult {
  score: number;
  verdict: CredibilityVerdict;
  breakdown: ScoreBreakdown;
  confidence: number;
  summary: string;
  limitations: string[];
}

export class CredibilityScorerService {
  /**
   * Computes deterministic, explainable credibility score from 0-100
   */
  public computeCredibilityScore(
    article: ArticleMetadata,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[]
  ): CredibilityScoreResult {
    const limitations: string[] = [];

    // 1. Calculate each of the 5 independent components (0-100)
    const evidenceSupport = this.calculateEvidenceSupport(claims, evidence);
    const sourceReliability = this.calculateSourceReliability(article, evidence, limitations);
    const crossSourceAgreement = this.calculateCrossSourceAgreement(evidence, limitations);
    const claimVerification = this.calculateClaimVerification(claims, evidence, limitations);
    const articleQuality = this.calculateArticleQuality(article, limitations);

    // 2. Apply explicit weighted formula:
    // finalScore = evidenceSupport * 0.30 + sourceReliability * 0.25 + crossSourceAgreement * 0.20 + claimVerification * 0.15 + articleQuality * 0.10
    const rawScore =
      evidenceSupport * 0.30 +
      sourceReliability * 0.25 +
      crossSourceAgreement * 0.20 +
      claimVerification * 0.15 +
      articleQuality * 0.10;

    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 3. Map to Verdict tier
    const verdict = this.getVerdict(finalScore);

    // 4. Calculate Confidence (0.0 to 1.0)
    const confidence = this.calculateConfidence(claims, evidence, article);

    // 5. Generate transparent summary
    const summary = this.generateSummary(finalScore, verdict, claims, evidence, {
      evidenceSupport,
      sourceReliability,
      crossSourceAgreement,
      claimVerification,
      articleQuality,
    });

    return {
      score: finalScore,
      verdict,
      breakdown: {
        evidenceSupport,
        sourceReliability,
        crossSourceAgreement,
        claimVerification,
        articleQuality,
      },
      confidence,
      summary,
      limitations,
    };
  }

  /**
   * Component 1: Evidence Support (30% weight)
   * Evaluates retrieved evidence strength per claim weighted by importance.
   * Contradicted claims heavily penalize score; unverified claims default to neutral 50.
   */
  public calculateEvidenceSupport(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[]
  ): number {
    if (!claims || claims.length === 0) {
      return 50;
    }

    let totalWeight = 0;
    let weightedSum = 0;
    let hasHighImportanceContradiction = false;

    for (const claim of claims) {
      const weight = Math.max(0.1, claim.importance || 0.5);
      totalWeight += weight;

      const matchingEv = evidence.filter((e) => e.claimId === claim.id);

      if (matchingEv.length === 0) {
        // No evidence: neutral baseline 50 (absence of evidence is not falsity)
        weightedSum += 50 * weight;
        continue;
      }

      const hasContradiction = matchingEv.some((e) => e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts');
      const hasSupport = matchingEv.some((e) => e.relationToClaim === 'SUPPORTS' || e.relation === 'supports');

      if (hasContradiction) {
        if (weight >= 0.7) {
          hasHighImportanceContradiction = true;
        }
        weightedSum += 0 * weight; // Contradiction: 0 score
      } else if (hasSupport) {
        // Supported: evaluate high-trust vs standard sources
        const bestSource = matchingEv.reduce((acc, curr) => {
          const evalResult = sourceRegistry.getSourceCredibility(curr.publisher || curr.url);
          const score = evalResult.isRegistered
            ? evalResult.credibilityWeight * 100
            : curr.sourceType === 'official' || curr.sourceType === 'academic' || curr.sourceType === 'fact_check'
            ? 95
            : 85;
          return Math.max(acc, score);
        }, 80);
        weightedSum += bestSource * weight;
      } else {
        // Unclear / Insufficient: neutral 55
        weightedSum += 55 * weight;
      }
    }

    let result = totalWeight > 0 ? weightedSum / totalWeight : 50;

    // High importance contradiction severely limits evidence support
    if (hasHighImportanceContradiction) {
      result = Math.min(result, 20);
    }

    return Math.max(0, Math.min(100, Math.round(result)));
  }

  /**
   * Component 2: Source Reliability (25% weight)
   * Evaluates unique institutional publishers matched against the 54 verified sources registry.
   */
  public calculateSourceReliability(
    article: ArticleMetadata,
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    const publisherScores = new Map<string, number>();

    // Register evidence source scores (deduplicated by publisher domain)
    for (const item of evidence) {
      const pub = (item.publisher || item.url).toLowerCase();
      if (!publisherScores.has(pub)) {
        const evalResult = sourceRegistry.getSourceCredibility(pub);
        publisherScores.set(pub, Math.round(evalResult.credibilityWeight * 100));
      }
    }

    if (publisherScores.size === 0) {
      limitations.push('No independent external sources were retrieved to establish empirical source reliability.');
      // Check if the ingested article itself is from our verified database
      if (article.publisher && article.publisher !== 'Direct Text Ingestion') {
        const evalResult = sourceRegistry.getSourceCredibility(article.url || article.publisher);
        if (evalResult.isRegistered) {
          return Math.round(evalResult.credibilityWeight * 100);
        }
        const pubLower = article.publisher.toLowerCase();
        if (pubLower.includes('.gov') || pubLower.includes('who.int')) return 98;
        if (pubLower.includes('.edu')) return 90;
        if (pubLower.includes('reuters') || pubLower.includes('apnews') || pubLower.includes('bbc')) return 85;
        return 65;
      }
      return 50; // Neutral baseline
    }

    let total = 0;
    publisherScores.forEach((score) => {
      total += score;
    });

    return Math.max(0, Math.min(100, Math.round(total / publisherScores.size)));
  }

  /**
   * Component 3: Cross-Source Agreement (20% weight)
   * Measures consensus among distinct, deduplicated external publishers.
   */
  public calculateCrossSourceAgreement(
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    if (!evidence || evidence.length === 0) {
      return 50; // Neutral baseline
    }

    // Deduplicate by publisher to prevent duplicate URL votes
    const domainStances = new Map<string, 'supports' | 'contradicts' | 'unclear'>();

    for (const item of evidence) {
      const pub = (item.publisher || item.url).toLowerCase();
      const normRelation = item.relationToClaim === 'SUPPORTS' ? 'supports' : item.relationToClaim === 'CONTRADICTS' ? 'contradicts' : item.relation || 'unclear';
      if (!domainStances.has(pub)) {
        domainStances.set(pub, normRelation);
      } else {
        // If a domain has contradictory reports, prioritize contradiction flag
        if (normRelation === 'contradicts') {
          domainStances.set(pub, 'contradicts');
        }
      }
    }

    const uniqueCount = domainStances.size;

    if (uniqueCount === 1) {
      limitations.push('Cross-source verification is limited because evidence originates from a single publisher.');
      const singleRelation = Array.from(domainStances.values())[0];
      if (singleRelation === 'supports') return 75;
      if (singleRelation === 'contradicts') return 20;
      return 55;
    }

    let supportCount = 0;
    let contradictCount = 0;
    let unclearCount = 0;

    domainStances.forEach((relation) => {
      if (relation === 'supports') supportCount++;
      else if (relation === 'contradicts') contradictCount++;
      else unclearCount++;
    });

    if (contradictCount > 0 && supportCount > 0) {
      // Direct conflict across independent sources
      const agreementRatio = supportCount / (supportCount + contradictCount);
      return Math.max(10, Math.min(60, Math.round(agreementRatio * 60)));
    }

    if (contradictCount > 0 && supportCount === 0) {
      // Unanimous contradiction
      return 10;
    }

    if (supportCount >= 2 && contradictCount === 0) {
      // Strong cross-source agreement
      return Math.min(100, 85 + supportCount * 5);
    }

    return 50; // Unclear / neutral
  }

  /**
   * Component 4: Claim Verification (15% weight)
   * Evaluates the proportion of verified claims weighted by importance.
   */
  public calculateClaimVerification(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    if (!claims || claims.length === 0) {
      return 50;
    }

    let totalWeight = 0;
    let weightedSum = 0;

    for (const claim of claims) {
      const weight = Math.max(0.1, claim.importance || 0.5);
      totalWeight += weight;

      const matchingEv = evidence.filter((e) => e.claimId === claim.id);

      if (matchingEv.length === 0) {
        // Unverified: 50
        weightedSum += 50 * weight;
        if (weight >= 0.8) {
          limitations.push(`High-priority claim '${claim.text.slice(0, 50)}...' could not be independently verified.`);
        }
      } else {
        const hasContradict = matchingEv.some((e) => e.relation === 'contradicts');
        const hasSupport = matchingEv.some((e) => e.relation === 'supports');

        if (hasContradict) {
          // Contradicted: 0
          weightedSum += 0 * weight;
        } else if (hasSupport) {
          // Supported: 100
          weightedSum += 100 * weight;
        } else {
          // Partially supported / unclear: 70
          weightedSum += 70 * weight;
        }
      }
    }

    const result = totalWeight > 0 ? weightedSum / totalWeight : 50;
    return Math.max(0, Math.min(100, Math.round(result)));
  }

  /**
   * Component 5: Article Quality (10% weight)
   * Evaluates concrete structural signals from the article metadata.
   */
  public calculateArticleQuality(article: ArticleMetadata, limitations: string[]): number {
    let score = 0;

    // 1. Text length completeness (30 max)
    const wordCount = (article.text || '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) {
      score += 30;
    } else if (wordCount >= 100) {
      score += 20;
    } else {
      score += 10;
      limitations.push('Article body is concise or contains limited textual context.');
    }

    // 2. Identifiable Publisher (20 max)
    if (article.publisher && article.publisher !== 'Direct Text Ingestion' && article.publisher.length > 3) {
      score += 20;
    } else {
      score += 10;
    }

    // 3. Identifiable Author (20 max)
    if (article.author && article.author !== 'Unspecified / Ingested' && article.author.length > 2) {
      score += 20;
    } else {
      score += 10;
      limitations.push('Author byline was not provided in article metadata.');
    }

    // 4. Publication Date (20 max)
    if (article.publishedAt && article.publishedAt.length > 4) {
      score += 20;
    } else {
      score += 10;
      limitations.push('Publication timestamp is unspecified in article metadata.');
    }

    // 5. Canonical / Source URL (10 max)
    if (article.url && article.url.startsWith('http')) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Maps numerical score to official Verdict category
   */
  public getVerdict(score: number): CredibilityVerdict {
    if (score >= 90) return 'Highly Credible';
    if (score >= 80) return 'Probably Credible';
    if (score >= 50) return 'Needs Verification';
    if (score >= 25) return 'Likely Misleading';
    return 'Highly Suspicious';
  }

  /**
   * Calculates confidence score based on evidence coverage and source diversity
   */
  private calculateConfidence(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    article: ArticleMetadata
  ): number {
    if (!claims || claims.length === 0) {
      return 0.3;
    }

    const verifiedClaimsCount = claims.filter((c) =>
      evidence.some((e) => e.claimId === c.id)
    ).length;

    const coverage = verifiedClaimsCount / claims.length;
    const uniqueSources = new Set(evidence.map((e) => e.publisher)).size;
    const sourceFactor = Math.min(1, uniqueSources / 3);

    const rawConfidence = 0.4 + coverage * 0.4 + sourceFactor * 0.2;
    return Math.round(Math.max(0.2, Math.min(0.98, rawConfidence)) * 100) / 100;
  }

  /**
   * Generates a transparent narrative summary of the scoring calculation
   */
  private generateSummary(
    score: number,
    verdict: CredibilityVerdict,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    breakdown: ScoreBreakdown
  ): string {
    const supportedCount = claims.filter((c) =>
      evidence.some((e) => e.claimId === c.id && e.relation === 'supports')
    ).length;

    const contradictedCount = claims.filter((c) =>
      evidence.some((e) => e.claimId === c.id && e.relation === 'contradicts')
    ).length;

    if (verdict === 'Highly Credible') {
      return `All core factual claims are robustly corroborated by high-authority institutional sources with zero detected contradictions (${supportedCount}/${claims.length} claims verified).`;
    }

    if (verdict === 'Probably Credible') {
      return `Most key factual claims (${supportedCount}/${claims.length}) are supported by reputable independent sources, with strong cross-source agreement and no material refutations.`;
    }

    if (verdict === 'Needs Verification') {
      if (evidence.length === 0) {
        return `Independent external evidence could not be located to verify the claims. The content remains unverified pending corroboration.`;
      }
      return `Initial claims have partial corroboration, but certain assertions remain unverified or have ambiguous cross-source evidence.`;
    }

    if (verdict === 'Likely Misleading') {
      return `One or more significant factual claims (${contradictedCount} contradicted) conflict with independent verified records or official sources.`;
    }

    return `Critical factual claims are explicitly contradicted by reliable external sources and fact-checking registries.`;
  }
}

export const credibilityScorerService = new CredibilityScorerService();
