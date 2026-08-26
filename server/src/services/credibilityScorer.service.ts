import {
  ArticleMetadata,
  ExtractedClaim,
  RetrievedEvidenceItem,
  ScoreBreakdown,
  CredibilityVerdict,
  ScoreDiagnosticItem,
  MultiClaimArticleSummary,
} from '../types/api.js';
import { sourceRegistry } from './sourceRegistry.service.js';

export interface CredibilityScoringResult {
  score: number;
  verdict: CredibilityVerdict;
  breakdown: ScoreBreakdown;
  confidence: number;
  summary: string;
  limitations: string[];
  diagnostics: ScoreDiagnosticItem[];
  articleSummary: MultiClaimArticleSummary;
}

export class CredibilityScorerService {
  /**
   * Computes the calibrated 5-pillar credibility score for multi-claim verification
   */
  public computeCredibilityScore(
    article: ArticleMetadata,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[]
  ): CredibilityScoringResult {
    const limitations: string[] = [];

    // 1. Calculate each of the 5 independent components (0-100)
    const evidenceSupport = this.calculateEvidenceSupport(claims, evidence);
    const sourceReliability = this.calculateSourceReliability(article, evidence, limitations);
    const crossSourceAgreement = this.calculateCrossSourceAgreement(evidence, limitations);
    const claimVerification = this.calculateClaimVerification(claims, evidence, limitations);
    const articleQuality = this.calculateArticleQuality(article, claims, evidence, limitations);

    // 2. Apply calibrated weighted formula:
    // finalScore = evidenceSupport * 0.30 + sourceReliability * 0.25 + crossSourceAgreement * 0.20 + claimVerification * 0.15 + articleQuality * 0.10
    const rawScore =
      evidenceSupport * 0.30 +
      sourceReliability * 0.25 +
      crossSourceAgreement * 0.20 +
      claimVerification * 0.15 +
      articleQuality * 0.10;

    let finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 3. Multi-Claim Factual Safeguards (Cases A through E)
    let majorContradictedCount = 0;
    let totalContradictedCount = 0;
    let supportedCount = 0;
    let unclearCount = 0;

    for (const claim of claims) {
      const matchingEv = evidence.filter((e) => e.claimId === claim.id);
      const hasContradict = matchingEv.some(
        (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
      );
      const hasSupport = matchingEv.some(
        (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && (e.relevance === 'direct' || !e.relevance)
      );

      const importance = claim.importance || 0.5;

      if (hasContradict) {
        totalContradictedCount++;
        if (importance >= 0.7) {
          majorContradictedCount++;
        }
      } else if (hasSupport) {
        supportedCount++;
      } else {
        unclearCount++;
      }
    }

    // Case D: Multiple major claims contradicted -> Very low credibility (<= 20)
    if (majorContradictedCount >= 2 || totalContradictedCount >= 2) {
      finalScore = Math.min(finalScore, 20);
    }
    // Case C: Single major claim contradicted -> Cap credibility at low tier (<= 25)
    else if (majorContradictedCount >= 1 || totalContradictedCount >= 1) {
      finalScore = Math.min(finalScore, 25);
    }
    // Case E: Most claims unclear -> Neutral unverified baseline (40 - 60)
    else if (supportedCount === 0 && unclearCount > 0) {
      finalScore = Math.min(60, Math.max(40, finalScore));
    }

    // 4. Map to Verdict tier
    const verdict = this.getVerdict(finalScore);

    // 5. Calculate Confidence (0.0 to 1.0)
    const confidence = this.calculateConfidence(claims, evidence, article);

    // 6. Generate dynamic "Why This Score?" Multi-Claim Summary
    const whyThisScore = this.generateWhyThisScore(
      claims.length,
      supportedCount,
      totalContradictedCount,
      unclearCount,
      majorContradictedCount,
      finalScore
    );

    const articleSummary: MultiClaimArticleSummary = {
      claimsAnalyzed: claims.length,
      supportedCount,
      contradictedCount: totalContradictedCount,
      unclearCount,
      majorContradictedCount,
      whyThisScore,
    };

    // 7. Generate transparent summary
    const summary = whyThisScore;

    // 8. Generate transparent diagnostics (Requirement 10)
    const diagnostics = this.generateDiagnostics(claims, evidence);

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
      diagnostics,
      articleSummary,
    };
  }

  /**
   * Component 1: Evidence Support (30% weight)
   * DIRECT evidence carries full weight; RELATED carries low weight (max 55); CONTRADICT carries 0.
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

      const directContradictions = matchingEv.filter(
        (e) =>
          (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') &&
          (e.relevance === 'direct' || !e.relevance)
      );

      const directSupports = matchingEv.filter(
        (e) =>
          (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') &&
          (e.relevance === 'direct' || !e.relevance)
      );

      if (directContradictions.length > 0) {
        if (weight >= 0.7) {
          hasHighImportanceContradiction = true;
        }
        weightedSum += 0 * weight; // Contradiction: 0 score
      } else if (directSupports.length > 0) {
        // Evaluate direct support strength based on source tiers and count
        const maxSourceScore = directSupports.reduce((acc, curr) => {
          const score = curr.credibilityScore || 85;
          return Math.max(acc, score);
        }, 85);

        // Multi-source bonus if multiple independent direct sources support the claim
        const multiSourceBonus = directSupports.length >= 2 ? 5 : 0;
        const claimScore = Math.min(100, maxSourceScore + multiSourceBonus);

        weightedSum += claimScore * weight;
      } else {
        // Only related or unclear context: neutral 55
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
      const pub = (item.sourceName || item.publisher || item.url).toLowerCase();
      if (!publisherScores.has(pub)) {
        const evalResult = sourceRegistry.getSourceCredibility(pub);
        const score = item.credibilityScore || Math.round(evalResult.credibilityWeight * 100);
        publisherScores.set(pub, score);
      }
    }

    if (publisherScores.size === 0) {
      limitations.push('No independent external sources were retrieved to establish empirical source reliability.');
      if (article.publisher && article.publisher !== 'Direct Text Ingestion') {
        const evalResult = sourceRegistry.getSourceCredibility(article.url || article.publisher);
        if (evalResult.isRegistered) {
          return Math.round(evalResult.credibilityWeight * 100);
        }
        const pubLower = article.publisher.toLowerCase();
        if (pubLower.includes('.gov') || pubLower.includes('who.int')) return 98;
        if (pubLower.includes('.edu') || pubLower.includes('.ac.in')) return 92;
        return 65;
      }
      return 50; // Neutral baseline for unverified direct text
    }

    const scores = Array.from(publisherScores.values());
    scores.sort((a, b) => b - a);

    // Multi-source boost: highest tier gets 60% weight, secondary gets 40%
    if (scores.length >= 2) {
      return Math.round(scores[0] * 0.6 + scores[1] * 0.4);
    }
    return scores[0];
  }

  /**
   * Component 3: Cross-Source Agreement (20% weight)
   * Measures consensus vs conflict across independent retrieved evidence sources.
   */
  public calculateCrossSourceAgreement(
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    if (!evidence || evidence.length === 0) {
      return 50; // Neutral baseline
    }

    const directSupporting = evidence.filter(
      (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && (e.relevance === 'direct' || !e.relevance)
    ).length;

    const directContradicting = evidence.filter(
      (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
    ).length;

    const totalDecisive = directSupporting + directContradicting;

    if (totalDecisive === 0) {
      return 55; // All sources are neutral/unclear context
    }

    if (directContradicting > 0 && directSupporting === 0) {
      limitations.push(`Cross-source consensus actively refutes claims (${directContradicting} contradictory citations).`);
      return 10;
    }

    if (directContradicting > 0 && directSupporting > 0) {
      limitations.push('Conflicting cross-source reporting detected between retrieved publications.');
      const supportRatio = directSupporting / totalDecisive;
      return Math.round(supportRatio * 50); // High disagreement penalty
    }

    // Unanimous positive agreement
    if (directSupporting >= 2) {
      return 100;
    }
    return 88;
  }

  /**
   * Component 4: Claim-Level Verification (15% weight)
   * Direct verification rate based on verified claims vs contradicted claims.
   */
  public calculateClaimVerification(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    if (!claims || claims.length === 0) {
      return 50;
    }

    let verifiedCount = 0;
    let contradictedCount = 0;
    let totalWeight = 0;
    let weightedVerified = 0;

    for (const claim of claims) {
      const weight = Math.max(0.1, claim.importance || 0.5);
      totalWeight += weight;

      const matchingEv = evidence.filter((e) => e.claimId === claim.id);
      const isContradicted = matchingEv.some(
        (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
      );
      const isVerified = matchingEv.some(
        (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && (e.relevance === 'direct' || !e.relevance)
      );

      if (isContradicted) {
        contradictedCount++;
      } else if (isVerified) {
        verifiedCount++;
        weightedVerified += 100 * weight;
      } else {
        weightedVerified += 50 * weight; // Unverified neutral
        if (weight >= 0.7) {
          limitations.push(`High-priority claim '${claim.text.slice(0, 50)}...' could not be independently verified.`);
        }
      }
    }

    if (contradictedCount > 0) {
      return 0; // Fails claim verification if any direct contradiction exists
    }

    return totalWeight > 0 ? Math.round(weightedVerified / totalWeight) : 50;
  }

  /**
   * Component 5: Article Quality & Completeness (10% weight)
   */
  public calculateArticleQuality(
    article: ArticleMetadata,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    const isDirectIngestion = !article.publisher || article.publisher === 'Direct Text Ingestion';

    if (isDirectIngestion) {
      const hasContradictions = evidence.some(
        (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && e.relevance === 'direct'
      );
      if (hasContradictions) {
        return 70;
      }
      const hasVerifiedClaims = evidence.some(
        (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && e.relevance === 'direct'
      );
      if (hasVerifiedClaims) {
        return 90;
      }
      return 70;
    }

    let score = 0;
    const wordCount = (article.text || '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) score += 30;
    else if (wordCount >= 100) score += 20;
    else {
      score += 10;
      limitations.push('Article body is concise or contains limited textual context.');
    }

    if (article.publisher && article.publisher.length > 3) score += 20;
    else score += 10;

    if (article.author && article.author !== 'Unspecified / Ingested' && article.author.length > 2) score += 20;
    else {
      score += 10;
      limitations.push('Author byline was not provided in article metadata.');
    }

    if (article.publishedAt && article.publishedAt.length > 4) score += 20;
    else {
      score += 10;
      limitations.push('Publication timestamp is unspecified in article metadata.');
    }

    if (article.url && article.url.startsWith('http')) score += 10;
    else score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generates dynamic "Why This Score?" text from actual claim verification metrics
   */
  private generateWhyThisScore(
    totalClaims: number,
    supported: number,
    contradicted: number,
    unclear: number,
    majorContradicted: number,
    score: number
  ): string {
    const parts: string[] = [];

    if (supported > 0) {
      parts.push(
        `${supported} of ${totalClaims} factual ${totalClaims === 1 ? 'claim was' : 'claims were'} supported by credible independent sources.`
      );
    }

    if (majorContradicted > 0) {
      parts.push(
        `${majorContradicted === 1 ? 'One high-importance claim was' : `${majorContradicted} high-importance claims were`} contradicted by authoritative sources, significantly reducing overall credibility.`
      );
    } else if (contradicted > 0) {
      parts.push(
        `${contradicted === 1 ? 'One claim was' : `${contradicted} claims were`} contradicted by verified external records.`
      );
    }

    if (unclear > 0 && supported === 0 && contradicted === 0) {
      parts.push(
        'Independent external evidence could not be located to verify the claims. The content remains unverified pending corroboration.'
      );
    } else if (unclear > 0) {
      parts.push(
        `${unclear === 1 ? 'One secondary assertion' : `${unclear} assertions`} could not be independently verified.`
      );
    }

    if (parts.length === 0) {
      parts.push(`Content evaluated with a calibrated credibility score of ${score}/100.`);
    }

    return parts.join(' ');
  }

  /**
   * Generates transparent per-claim, per-evidence score diagnostics
   */
  private generateDiagnostics(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[]
  ): ScoreDiagnosticItem[] {
    const diagnostics: ScoreDiagnosticItem[] = [];

    for (const claim of claims) {
      const matchingEv = evidence.filter((e) => e.claimId === claim.id);
      for (const ev of matchingEv) {
        diagnostics.push({
          claim: claim.text,
          evidence: ev.evidenceText || ev.snippet,
          source: ev.sourceName || ev.publisher,
          sourceTier: ev.sourceTier || 3,
          relation: ev.relation || (ev.relationToClaim === 'SUPPORTS' ? 'supports' : 'unclear'),
          relevance: ev.relevance || 'direct',
          evidenceConfidence: ev.confidence || 85,
          sourceReliability: ev.credibilityScore,
          contributionToFinalScore: ev.finalContribution || ev.credibilityScore,
        });
      }
    }

    return diagnostics;
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
   * Calculates overall confidence (0.0 to 1.0)
   */
  public calculateConfidence(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    article: ArticleMetadata
  ): number {
    let conf = 0.5;

    if (evidence.length >= 3) conf += 0.25;
    else if (evidence.length >= 1) conf += 0.15;

    const hasHighTier = evidence.some((e) => (e.sourceTier || 3) <= 2);
    if (hasHighTier) conf += 0.15;

    if (article.publisher && article.publisher !== 'Direct Text Ingestion') {
      conf += 0.1;
    }

    return Math.min(0.99, Math.max(0.3, Math.round(conf * 100) / 100));
  }
}

export const credibilityScorerService = new CredibilityScorerService();
export default credibilityScorerService;
