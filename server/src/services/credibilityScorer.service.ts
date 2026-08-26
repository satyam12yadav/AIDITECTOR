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
import { stanceEvaluatorService } from './stanceEvaluator.service.js';

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
   * Computes the calibrated claim-level and article-level credibility score for multi-claim verification
   */
  public computeCredibilityScore(
    article: ArticleMetadata,
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[]
  ): CredibilityScoringResult {
    const limitations: string[] = [];

    // 1. Process and calibrate each individual claim independently
    this.evaluateIndividualClaims(claims, evidence);

    // 2. Calculate the 5 independent architectural components (0-100)
    const evidenceSupport = this.calculateEvidenceSupport(claims, evidence);
    const sourceReliability = this.calculateSourceReliability(article, evidence, limitations);
    const crossSourceAgreement = this.calculateCrossSourceAgreement(evidence, limitations);
    const claimVerification = this.calculateClaimVerification(claims, evidence, limitations);
    const articleQuality = this.calculateArticleQuality(article, claims, evidence, limitations);

    // 3. Multi-Claim Importance-Weighted Aggregation
    // weightedContribution = claimScore * claimImportance
    // overallScore = sum(weightedContribution) / sum(claimImportance)
    let totalImportance = 0;
    let weightedScoreSum = 0;

    let majorContradictedCount = 0;
    let totalContradictedCount = 0;
    let supportedCount = 0;
    let unclearCount = 0;
    let strongContradictionDetected = false;

    for (const claim of claims) {
      const importance = typeof claim.importance === 'number' ? claim.importance : 0.5;
      const normalizedImp = importance > 1 ? importance / 100 : importance;
      const weight = Math.max(0.1, Math.min(1.0, normalizedImp));
      totalImportance += weight;

      const claimScore = typeof claim.claimScore === 'number' ? claim.claimScore : 50;
      weightedScoreSum += claimScore * weight;

      if (claim.relation === 'contradicts') {
        totalContradictedCount++;
        if (weight >= 0.65) {
          majorContradictedCount++;
          if (claim.evidenceQuality === 'HIGH' || claim.contradictingEvidenceCount! >= 1) {
            strongContradictionDetected = true;
          }
        }
      } else if (claim.relation === 'supports') {
        supportedCount++;
      } else {
        unclearCount++;
      }
    }

    const rawImportanceWeightedScore =
      totalImportance > 0 ? Math.round(weightedScoreSum / totalImportance) : 50;

    // Component weighted score from 5 pillars
    const raw5PillarScore =
      evidenceSupport * 0.30 +
      sourceReliability * 0.25 +
      crossSourceAgreement * 0.20 +
      claimVerification * 0.15 +
      articleQuality * 0.10;

    // Combined initial score (60% importance-weighted claim scores + 40% 5-pillar systemic score)
    let combinedScore = Math.round(rawImportanceWeightedScore * 0.6 + raw5PillarScore * 0.4);

    // 4. Deterministic Guardrails & Hard Contradiction Penalties (Requirement 2, 3, 11)
    // Guardrail 1: Multiple major claims contradicted -> Very low credibility (<= 20)
    if (majorContradictedCount >= 2 || totalContradictedCount >= 2) {
      combinedScore = Math.min(combinedScore, 18);
      limitations.push(`Multiple significant assertions (${totalContradictedCount} contradicted) conflict with independent verified records.`);
    }
    // Guardrail 2: Single major factual claim strongly contradicted -> Cap credibility at low tier (<= 25)
    else if (majorContradictedCount >= 1 || (totalContradictedCount >= 1 && strongContradictionDetected)) {
      combinedScore = Math.min(combinedScore, 25);
      limitations.push('A major high-importance factual claim is contradicted by authoritative sources.');
    }
    // Guardrail 3: Minor claim contradicted (importance < 0.65) -> Cap at 45
    else if (totalContradictedCount >= 1) {
      combinedScore = Math.min(combinedScore, 45);
      limitations.push('One secondary assertion was contradicted by external records.');
    }
    // Guardrail 4: All claims are unclear (zero evidence) -> Neutral unverified baseline (45-55), NEVER false
    else if (supportedCount === 0 && unclearCount > 0 && totalContradictedCount === 0) {
      combinedScore = Math.min(58, Math.max(45, combinedScore));
    }
    // Guardrail 5: All important claims supported by strong independent evidence -> Allow high score (>= 80-95)
    else if (supportedCount >= 1 && totalContradictedCount === 0 && unclearCount === 0) {
      combinedScore = Math.max(combinedScore, 85);
    }
    // Guardrail 6: Minor unclear claim with multiple supported major claims -> Keep credible (>= 75-90)
    else if (supportedCount >= 2 && totalContradictedCount === 0 && unclearCount <= 1) {
      combinedScore = Math.max(combinedScore, 78);
    }

    const finalScore = Math.max(0, Math.min(100, combinedScore));

    // 5. Map to calibrated Verdict tier (Requirement 8)
    const verdict = this.getVerdict(finalScore);

    // 6. Calculate Confidence (0.0 to 1.0)
    const confidence = this.calculateConfidence(claims, evidence, article);

    // 7. Dynamic "Why This Score?" Explainability (Requirement 10 & 18)
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

    // 8. Generate transparent diagnostics
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
      summary: whyThisScore,
      limitations,
      diagnostics,
      articleSummary,
    };
  }

  /**
   * Calibrates and sets claim-level verdict, score, evidence counts, and quality for each claim
   */
  public evaluateIndividualClaims(
    claims: ExtractedClaim[],
    evidence: RetrievedEvidenceItem[]
  ): void {
    for (const claim of claims) {
      const matchingEv = evidence.filter((e) => e.claimId === claim.id);
      claim.evidenceCount = matchingEv.length;

      // Group by relation
      const contradictingItems = matchingEv.filter(
        (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
      );
      const supportingItems = matchingEv.filter(
        (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && (e.relevance === 'direct' || !e.relevance)
      );
      const unclearItems = matchingEv.filter(
        (e) => !contradictingItems.includes(e) && !supportingItems.includes(e)
      );

      claim.contradictingEvidenceCount = contradictingItems.length;
      claim.supportingEvidenceCount = supportingItems.length;

      // Deduplicate independent domains & sources
      const independentSources = new Set<string>();
      const supDomains = new Set<string>();
      const conDomains = new Set<string>();

      for (const ev of matchingEv) {
        const domain = ev.domain || (ev.sourceUrl || ev.url ? new URL(ev.sourceUrl || ev.url).hostname.replace(/^www\./, '') : ev.publisher);
        independentSources.add(domain);
        if (ev.relation === 'supports' || ev.relationToClaim === 'SUPPORTS') {
          supDomains.add(domain);
        } else if (ev.relation === 'contradicts' || ev.relationToClaim === 'CONTRADICTS') {
          conDomains.add(domain);
        }
      }

      claim.rawSourceCount = matchingEv.length;
      claim.independentSourceCount = independentSources.size;
      claim.independentSupportingSources = supDomains.size;
      claim.independentContradictingSources = conDomains.size;
      claim.unclearSources = unclearItems.length;

      // Classify highest Evidence Quality (HIGH, MEDIUM, LOW)
      let evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      let strongestSource = 'None';
      let maxSourceScore = 0;

      for (const ev of matchingEv) {
        const tier = ev.sourceTier || 3;
        const score = ev.sourceReliability || ev.credibilityScore || 50;
        if (score > maxSourceScore) {
          maxSourceScore = score;
          strongestSource = ev.sourceName || ev.publisher;
        }

        if (tier <= 2 || tier === 4 || (tier === 3 && score >= 80)) {
          evidenceQuality = 'HIGH';
        } else if (tier === 3 && evidenceQuality !== 'HIGH') {
          evidenceQuality = 'MEDIUM';
        }
      }

      claim.evidenceQuality = evidenceQuality;
      claim.strongestSource = strongestSource !== 'None' ? strongestSource : undefined;

      const importance = typeof claim.importance === 'number' ? claim.importance : 0.5;
      const normalizedImp = importance > 1 ? importance / 100 : importance;

      const minConTier = contradictingItems.length > 0 ? Math.min(...contradictingItems.map((e) => e.sourceTier || 5)) : 99;
      const minSupTier = supportingItems.length > 0 ? Math.min(...supportingItems.map((e) => e.sourceTier || 5)) : 99;

      // 1. Conflict Resolution (When both supporting and contradicting sources exist)
      if (conDomains.size > 0 && supDomains.size > 0) {
        // Check for temporal succession / freshness dominance (e.g. newer authoritative report contradicts older report)
        const conHasCurrent = contradictingItems.some((e) => e.freshness === 'CURRENT' || e.temporalRelevance === 'TEMPORALLY_RELEVANT');
        const supIsOld = supportingItems.every((e) => e.freshness === 'OLD' || e.freshness === 'UNKNOWN');
        const newerContradictionDominates = conHasCurrent && supIsOld;

        // Check for Tier Authority dominance
        const conTierDominates = minConTier < minSupTier;
        const supTierDominates = minSupTier < minConTier;

        if (newerContradictionDominates || conTierDominates) {
          // Authoritative / Newer Contradiction Dominates
          claim.consensusStatus = 'UNANIMOUS_CONTRADICTION';
          claim.relation = 'contradicts';
          claim.claimScore = normalizedImp >= 0.65 ? 5 : 15;
          claim.confidence = 92;
          claim.reasoning =
            contradictingItems[0]?.explanation ||
            `Authoritative reporting refutes this assertion, superseding outdated or lower-tier claims.`;
        } else if (supTierDominates) {
          // Authoritative Support Dominates
          claim.consensusStatus = 'UNANIMOUS_SUPPORT';
          claim.relation = 'supports';
          claim.claimScore = Math.min(95, maxSourceScore);
          claim.confidence = 90;
          claim.reasoning =
            supportingItems[0]?.explanation ||
            `Primary authoritative sources corroborate this assertion over unverified claims.`;
        } else {
          // Equal-Tier Genuine Disagreement (Requirement 8)
          claim.consensusStatus = 'CONFLICTING_EVIDENCE';
          claim.relation = 'unclear';
          claim.claimScore = 48; // Neutral unverified
          claim.confidence = 50; // Moderate/reduced confidence
          claim.reasoning = `Reliable sources disagree on this claim.`;
        }
      }
      // 2. Unanimous / Direct Contradiction
      else if (contradictingItems.length > 0) {
        claim.consensusStatus = 'UNANIMOUS_CONTRADICTION';
        claim.relation = 'contradicts';
        if (normalizedImp >= 0.65) {
          claim.claimScore = 5;
        } else {
          claim.claimScore = 15;
        }
        claim.confidence = Math.min(99, Math.max(85, contradictingItems[0]?.confidence || 90));
        claim.reasoning =
          contradictingItems[0]?.explanation ||
          `Assertion is directly contradicted by ${strongestSource !== 'None' ? strongestSource : 'authoritative records'}.`;
      }
      // 3. Direct Support (with Source Tier Validation)
      else if (supportingItems.length > 0) {
        // If ONLY Tier 5 unknown blogs support, flag as unverified / lower confidence (Requirement 11 Test B)
        if (minSupTier === 5) {
          claim.consensusStatus = 'INSUFFICIENT_EVIDENCE';
          claim.relation = 'unclear';
          claim.claimScore = 52;
          claim.confidence = 45;
          claim.reasoning = `Only unverified or low-trust sources support this claim; authoritative independent verification is unavailable.`;
        } else {
          claim.consensusStatus = 'UNANIMOUS_SUPPORT';
          claim.relation = 'supports';
          const isOfficial = minSupTier === 1;
          const baseScore = isOfficial ? 95 : Math.max(85, maxSourceScore);
          const diversityBonus = supDomains.size >= 2 ? 3 : 0;
          claim.claimScore = Math.min(98, baseScore + diversityBonus);
          claim.confidence = isOfficial && supDomains.size >= 2 ? 98 : Math.min(95, Math.max(80, supportingItems[0]?.confidence || 90));
          claim.reasoning =
            supportingItems[0]?.explanation ||
            `Assertion is corroborated by ${strongestSource !== 'None' ? strongestSource : 'independent reporting'}.`;
        }
      }
      // 4. Insufficient / No Evidence Found
      else {
        claim.consensusStatus = 'INSUFFICIENT_EVIDENCE';
        claim.relation = 'unclear';
        claim.claimScore = matchingEv.length > 0 ? 52 : 50;
        claim.confidence = matchingEv.length > 0 ? 50 : 35;
        claim.reasoning =
          unclearItems[0]?.explanation ||
          'Independent external evidence could not be located to verify or contradict this specific assertion.';
      }

      // 5. Compound Claim / Multi-Proposition Subclaim Aggregation (Requirement 5, 6, 7)
      if (claim.subclaims && claim.subclaims.length > 0) {
        for (const sub of claim.subclaims) {
          const subEv = matchingEv.filter((e) => {
            const text = (e.evidenceText || e.snippet || '').toLowerCase();
            return (
              (sub.attribute && text.includes(sub.attribute.toLowerCase())) ||
              (sub.subject && text.includes(sub.subject.toLowerCase())) ||
              matchingEv.length <= 3
            );
          });

          let subRelation: 'supports' | 'contradicts' | 'unclear' = 'unclear';
          let subReasoning = '';

          for (const ev of (subEv.length > 0 ? subEv : matchingEv)) {
            const res = stanceEvaluatorService.evaluateDeterministic(sub.text, ev.evidenceText || ev.snippet, ev.title, false);
            if (res.relation === 'contradicts') {
              subRelation = 'contradicts';
              subReasoning = res.reasoning;
              break;
            }
            if (res.relation === 'supports') {
              subRelation = 'supports';
              subReasoning = res.reasoning;
            }
          }

          sub.relation = subRelation;
          sub.reasoning = subReasoning || `Proposition evaluated as ${subRelation}.`;
          sub.confidence = subRelation === 'supports' ? 95 : subRelation === 'contradicts' ? 98 : 50;
        }

        const subSup = claim.subclaims.filter((s) => s.relation === 'supports');
        const subCon = claim.subclaims.filter((s) => s.relation === 'contradicts');
        const subUnc = claim.subclaims.filter((s) => s.relation === 'unclear');

        if (subCon.length > 0 && subSup.length > 0) {
          // Mixed compound claim (Requirement 6 & 7)
          claim.consensusStatus = 'CONFLICTING_EVIDENCE';
          claim.relation = 'contradicts';
          claim.claimScore = normalizedImp >= 0.65 ? 15 : 25;
          claim.confidence = 92;
          claim.reasoning = `Compound assertion contains contradicted propositions: ${subCon.map((c) => `"${c.text}" (CONTRADICTED)`).join(', ')}.`;
        } else if (subCon.length === claim.subclaims.length) {
          claim.consensusStatus = 'UNANIMOUS_CONTRADICTION';
          claim.relation = 'contradicts';
          claim.claimScore = normalizedImp >= 0.65 ? 5 : 15;
          claim.confidence = 98;
          claim.reasoning = `Compound assertion contradicted: All propositions refuted by authoritative evidence.`;
        } else if (subSup.length === claim.subclaims.length) {
          claim.consensusStatus = 'UNANIMOUS_SUPPORT';
          claim.relation = 'supports';
          claim.claimScore = Math.min(98, Math.max(88, maxSourceScore || 90));
          claim.confidence = 96;
          claim.reasoning = `All compound propositions verified: ${subSup.map((s) => `"${s.text}" (SUPPORTED)`).join(' and ')}.`;
        }
      }
    }
  }

  /**
   * Component 1: Evidence Support (30% weight)
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
    let hasMajorContradiction = false;

    for (const claim of claims) {
      const importance = typeof claim.importance === 'number' ? claim.importance : 0.5;
      const weight = Math.max(0.1, importance > 1 ? importance / 100 : importance);
      totalWeight += weight;

      if (claim.relation === 'contradicts') {
        if (weight >= 0.65) hasMajorContradiction = true;
        weightedSum += 0 * weight; // 0 contribution
      } else if (claim.relation === 'supports') {
        const score = claim.claimScore || 90;
        weightedSum += score * weight;
      } else {
        weightedSum += 52 * weight; // Neutral 52
      }
    }

    let result = totalWeight > 0 ? weightedSum / totalWeight : 50;
    if (hasMajorContradiction) {
      result = Math.min(result, 15);
    }

    return Math.max(0, Math.min(100, Math.round(result)));
  }

  /**
   * Component 2: Source Reliability (25% weight)
   */
  public calculateSourceReliability(
    article: ArticleMetadata,
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    const publisherScores = new Map<string, number>();

    // Deduplicate by normalized domain / publisher (Requirement 5)
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
      return 50;
    }

    const scores = Array.from(publisherScores.values()).sort((a, b) => b - a);
    if (scores.length >= 2) {
      return Math.round(scores[0] * 0.6 + scores[1] * 0.4);
    }
    return scores[0];
  }

  /**
   * Component 3: Cross-Source Agreement (20% weight)
   */
  public calculateCrossSourceAgreement(
    evidence: RetrievedEvidenceItem[],
    limitations: string[]
  ): number {
    if (!evidence || evidence.length === 0) {
      return 50;
    }

    const directSupporting = evidence.filter(
      (e) => (e.relationToClaim === 'SUPPORTS' || e.relation === 'supports') && (e.relevance === 'direct' || !e.relevance)
    ).length;

    const directContradicting = evidence.filter(
      (e) => (e.relationToClaim === 'CONTRADICTS' || e.relation === 'contradicts') && (e.relevance === 'direct' || !e.relevance)
    ).length;

    const totalDecisive = directSupporting + directContradicting;

    if (totalDecisive === 0) {
      return 52;
    }

    if (directContradicting > 0 && directSupporting === 0) {
      limitations.push(`Cross-source consensus actively refutes claims (${directContradicting} contradictory citations).`);
      return 10;
    }

    if (directContradicting > 0 && directSupporting > 0) {
      limitations.push('Conflicting cross-source reporting detected between retrieved publications.');
      const supportRatio = directSupporting / totalDecisive;
      return Math.round(supportRatio * 40); // High disagreement penalty
    }

    if (directSupporting >= 2) {
      return 100;
    }
    return 88;
  }

  /**
   * Component 4: Claim-Level Verification (15% weight)
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
      const importance = typeof claim.importance === 'number' ? claim.importance : 0.5;
      const weight = Math.max(0.1, importance > 1 ? importance / 100 : importance);
      totalWeight += weight;

      if (claim.relation === 'contradicts') {
        contradictedCount++;
      } else if (claim.relation === 'supports') {
        verifiedCount++;
        weightedVerified += 100 * weight;
      } else {
        weightedVerified += 50 * weight;
        if (weight >= 0.65) {
          limitations.push(`High-priority claim '${claim.text.slice(0, 45)}...' could not be independently verified.`);
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
      const hasContradictions = claims.some((c) => c.relation === 'contradicts');
      if (hasContradictions) return 70;
      const hasVerifiedClaims = claims.some((c) => c.relation === 'supports');
      if (hasVerifiedClaims) return 90;
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
   * Generates dynamic explainability text conforming to Requirement 10
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

    if (majorContradicted > 0) {
      parts.push(
        `The article contains ${majorContradicted === 1 ? 'one high-importance factual claim that is' : `${majorContradicted} high-importance factual claims that are`} directly contradicted by independent authoritative sources. Although other claims may be supported, the major contradiction substantially lowers the overall credibility score.`
      );
    } else if (contradicted > 0) {
      parts.push(
        `One or more assertions (${contradicted} contradicted) conflict with verified external records, lowering overall credibility.`
      );
    }

    if (supported > 0 && majorContradicted === 0 && contradicted === 0) {
      parts.push(
        `${supported} of ${totalClaims} factual ${totalClaims === 1 ? 'claim was' : 'claims were'} supported by credible independent sources.`
      );
    }

    if (unclear > 0 && supported === 0 && contradicted === 0) {
      parts.push(
        'Independent external evidence could not be located to verify the claims. The content remains unverified pending empirical corroboration.'
      );
    } else if (unclear > 0 && majorContradicted === 0 && contradicted === 0) {
      parts.push(
        `${unclear === 1 ? 'One minor assertion' : `${unclear} assertions`} could not be independently verified.`
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
   * Maps numerical score to calibrated Verdict category (Requirement 8)
   * 80-100 = PROBABLY CREDIBLE
   * 60-79 = MOSTLY CREDIBLE / NEEDS VERIFICATION
   * 40-59 = UNCERTAIN / NEEDS VERIFICATION
   * 20-39 = LIKELY MISLEADING
   * 0-19 = PROBABLY FALSE / HIGHLY SUSPICIOUS
   */
  public getVerdict(score: number): CredibilityVerdict {
    if (score >= 80) return 'Probably Credible';
    if (score >= 60) return 'Mostly Credible';
    if (score >= 40) return 'Needs Verification';
    if (score >= 20) return 'Likely Misleading';
    return 'Probably False';
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
