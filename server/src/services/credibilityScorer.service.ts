import {
  ArticleMetadata,
  ExtractedClaim,
  RetrievedEvidenceItem,
  ScoreBreakdown,
  CredibilityVerdict,
  ScoreDiagnosticItem,
} from '../types/api.js';
import { sourceRegistry } from './sourceRegistry.service.js';

export interface CredibilityScoreResult {
  score: number;
  verdict: CredibilityVerdict;
  breakdown: ScoreBreakdown;
  confidence: number;
  summary: string;
  limitations: string[];
  diagnostics: ScoreDiagnosticItem[];
}

export class CredibilityScorerService {
  /**
   * Computes deterministic, calibrated credibility score from 0-100
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

    // When independent evidence directly contradicts core claims, cap final credibility score
    const hasContradiction = evidence.some(
      (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
    );
    if (hasContradiction && claimVerification === 0) {
      finalScore = Math.min(finalScore, 25);
    }

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

    // 6. Generate transparent diagnostics (Requirement 10)
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
    const domainStances = new Map<string, { relation: 'supports' | 'contradicts' | 'unclear'; relevance: string }>();

    for (const item of evidence) {
      const pub = (item.sourceName || item.publisher || item.url).toLowerCase();
      const normRelation =
        item.relationToClaim === 'SUPPORTS' ? 'supports' : item.relationToClaim === 'CONTRADICTS' ? 'contradicts' : item.relation || 'unclear';
      const relevance = item.relevance || 'direct';

      if (!domainStances.has(pub)) {
        domainStances.set(pub, { relation: normRelation, relevance });
      } else {
        if (normRelation === 'contradicts') {
          domainStances.set(pub, { relation: 'contradicts', relevance });
        }
      }
    }

    const uniqueCount = domainStances.size;

    if (uniqueCount === 1) {
      const single = Array.from(domainStances.values())[0];
      if (single.relation === 'supports' && single.relevance === 'direct') return 88;
      if (single.relation === 'contradicts' && single.relevance === 'direct') return 15;
      return 55;
    }

    let directSupportCount = 0;
    let directContradictCount = 0;
    let unclearCount = 0;

    domainStances.forEach((st) => {
      if (st.relation === 'supports' && st.relevance === 'direct') directSupportCount++;
      else if (st.relation === 'contradicts' && st.relevance === 'direct') directContradictCount++;
      else unclearCount++;
    });

    if (directContradictCount > 0 && directSupportCount > 0) {
      // Conflict
      const agreementRatio = directSupportCount / (directSupportCount + directContradictCount);
      return Math.max(10, Math.min(60, Math.round(agreementRatio * 60)));
    }

    if (directContradictCount > 0 && directSupportCount === 0) {
      // Unanimous contradiction
      return 10;
    }

    if (directSupportCount >= 2 && directContradictCount === 0) {
      // Strong cross-source agreement across verified independent outlets
      return Math.min(100, 92 + directSupportCount * 4);
    }

    if (directSupportCount === 1 && directContradictCount === 0) {
      return 88;
    }

    return 50; // Unclear / neutral
  }

  /**
   * Component 4: Claim Verification (15% weight)
   * Evaluates proportion of verified claims weighted by importance.
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
        weightedSum += 50 * weight;
        if (weight >= 0.8) {
          limitations.push(`High-priority claim '${claim.text.slice(0, 50)}...' could not be independently verified.`);
        }
      } else {
        const hasDirectContradict = matchingEv.some(
          (e) =>
            (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') &&
            (e.relevance === 'direct' || !e.relevance)
        );
        const hasDirectSupport = matchingEv.some(
          (e) =>
            (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') &&
            (e.relevance === 'direct' || !e.relevance)
        );

        if (hasDirectContradict) {
          weightedSum += 0 * weight;
        } else if (hasDirectSupport) {
          weightedSum += 100 * weight;
        } else {
          weightedSum += 55 * weight;
        }
      }
    }

    const result = totalWeight > 0 ? weightedSum / totalWeight : 50;
    return Math.max(0, Math.min(100, Math.round(result)));
  }

  /**
   * Component 5: Article Quality (10% weight)
   * Evaluates concrete structural signals. Direct concise claims are not penalized if clean.
   */
  public calculateArticleQuality(
    article: ArticleMetadata,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    const isDirectIngestion = !article.publisher || article.publisher === 'Direct Text Ingestion';

    if (isDirectIngestion) {
      // For direct claim submissions, check if claims are verified and clean
      const hasVerifiedClaims = evidence.some(
        (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && e.relevance === 'direct'
      );
      if (hasVerifiedClaims) {
        return 90; // Clean factual statement verified directly
      }
      return 70; // Neutral baseline for unverified direct text
    }

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
    if (article.publisher && article.publisher.length > 3) {
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

  /**
   * Generates transparent summary text
   */
  private generateSummary(
    score: number,
    verdict: CredibilityVerdict,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[],
    breakdown: ScoreBreakdown
  ): string {
    const verifiedCount = evidence.filter(
      (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && e.relevance === 'direct'
    ).length;
    const contradictedCount = evidence.filter(
      (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && e.relevance === 'direct'
    ).length;

    if (score >= 90) {
      return `Content verified with exceptionally high credibility (${score}/100). All core assertions are directly corroborated by independent, high-trust primary sources.`;
    }
    if (score >= 80) {
      return `Content displays strong empirical credibility (${score}/100). Multiple assertions are corroborated across reputable independent outlets.`;
    }
    if (score <= 35 || contradictedCount > 0) {
      return `One or more significant factual claims (${contradictedCount} contradicted) conflict with independent verified records or official sources.`;
    }
    if (evidence.length === 0) {
      return 'Independent external evidence could not be located to verify the claims. The content remains unverified pending corroboration.';
    }
    return `Initial claims have partial corroboration (${verifiedCount} verified), but certain assertions remain unverified or have ambiguous cross-source evidence.`;
  }
}

export const credibilityScorerService = new CredibilityScorerService();
export default credibilityScorerService;
