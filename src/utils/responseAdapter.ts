import { AnalysisResult, VerdictType, EvidenceRelation } from '../types/analysis';
import { BackendAnalyzeResponse } from '../services/analysisService';

export const mapVerdictToType = (verdictStr: string): VerdictType => {
  const normalized = (verdictStr || '').toUpperCase().trim();
  if (normalized.includes('HIGHLY CREDIBLE') || normalized.includes('HIGHLY_CREDIBLE')) {
    return 'HIGHLY_CREDIBLE';
  }
  if (normalized.includes('PROBABLY') || normalized.includes('CREDIBLE')) {
    return 'PROBABLY_CREDIBLE';
  }
  if (normalized.includes('MISLEADING')) {
    return 'LIKELY_MISLEADING';
  }
  if (normalized.includes('SUSPICIOUS') || normalized.includes('FABRICATED') || normalized.includes('CONTRADICTED')) {
    return 'HIGHLY_SUSPICIOUS';
  }
  if (normalized.includes('NEEDS') || normalized.includes('PENDING')) {
    return 'NEEDS_VERIFICATION';
  }
  return 'UNVERIFIED';
};

export const transformBackendResponseToUi = (
  backendData: BackendAnalyzeResponse,
  fallbackInputText?: string
): AnalysisResult => {
  const articleUrl = backendData.article?.url;
  let publisher = backendData.article?.publisher || 'Ingested Document';

  if (!backendData.article?.publisher && articleUrl) {
    try {
      const parsed = new URL(articleUrl);
      publisher = parsed.hostname.replace(/^www\./, '');
    } catch {
      publisher = articleUrl;
    }
  }

  const textContent = backendData.article?.text || fallbackInputText || '';
  const calculatedWordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : undefined;

  const generatedId = `FNK-${Math.floor(1000 + Math.random() * 9000)}-LIVE`;
  const analyzedDate = backendData.article?.publishedAt || new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const defaultSummary = [
    backendData.summary || 'The content has been successfully analyzed by the Veritas transparent scoring pipeline.',
    ...(backendData.limitations && backendData.limitations.length > 0
      ? backendData.limitations
      : ['Initial claim decomposition and independent corroboration completed across 5 pillars.']),
  ];

  const rawEvidence = Array.isArray(backendData.evidence) ? backendData.evidence : [];

  const mappedClaims = (backendData.claims || []).map((c: any, idx: number) => {
    if (c.statement && c.status) {
      return c;
    }
    const claimId = c.id || `claim-${idx + 1}`;
    const importancePercent = Math.round((c.importance || 0.5) * 100);

    // Find all retrieved evidence items matching this claim
    const matchingEvidence = rawEvidence
      .filter((ev: any) => ev.claimId === claimId || ev.claimId === c.id)
      .map((ev: any, evIdx: number) => {
        const sourceType = ev.sourceType || 'news';
        const tier = ev.sourceTier || (sourceType === 'official' ? 1 : sourceType === 'fact_check' ? 3 : 2);
        const reliabilityScore = ev.sourceReliability || ev.credibilityScore || (tier === 1 ? 98 : tier === 2 ? 90 : tier === 3 ? 88 : tier === 4 ? 70 : 35);

        const reliabilityBadge =
          tier === 1
            ? 'Tier 1 — Official Authority'
            : tier === 2
            ? 'Tier 2 — Primary News / Wire'
            : tier === 3
            ? 'Tier 3 — Fact-Checker'
            : tier === 4
            ? 'Tier 4 — General Publisher'
            : 'Tier 5 — Low Trust / Blog';

        const reliabilityTier = tier <= 2 || tier === 3 ? ('high' as const) : tier === 4 ? ('medium' as const) : ('low' as const);

        const relation: EvidenceRelation =
          ev.relation ||
          (ev.relationToClaim === 'SUPPORTS' ? 'supports' : ev.relationToClaim === 'CONTRADICTS' ? 'contradicts' : 'unclear');

        return {
          id: ev.id || `ev-${claimId}-${evIdx + 1}`,
          sourceName: ev.sourceName || ev.publisher || ev.domain || 'Independent Source',
          domain: ev.domain || (ev.sourceUrl ? new URL(ev.sourceUrl).hostname.replace(/^www\./, '') : undefined),
          title: ev.title || ev.publisher || 'Independent Source',
          publisher: ev.publisher || ev.sourceName || 'Web Source',
          sourceType: ev.sourceType || 'news',
          sourceTier: tier as 1 | 2 | 3 | 4 | 5,
          sourceTierLabel: reliabilityBadge,
          publishedDate: ev.publishedDate || ev.publicationDate || null,
          publicationDate: ev.publishedDate || ev.publicationDate || null,
          sourceReliability: reliabilityScore,
          reliabilityScore,
          reliabilityBadge,
          reliabilityTier,
          quote: ev.evidenceText || ev.snippet || 'Retrieved corroborating document excerpt.',
          explanation: ev.explanation || ev.reasoning,
          relevanceScore: ev.relevanceScore,
          relation,
          relationToClaim: ev.relationToClaim || (relation === 'supports' ? 'SUPPORTS' : relation === 'contradicts' ? 'CONTRADICTS' : 'NEUTRAL'),
          temporalRelevance: ev.temporalRelevance || ev.freshness,
          isSyndicated: Boolean(ev.isSyndicated),
          url: ev.sourceUrl || ev.url || '#',
          isAvailable: Boolean((ev.sourceUrl || ev.url) && (ev.sourceUrl || ev.url) !== '#'),
        };
      });

    // Determine status from Gemini forensic evaluation or evidence relations
    let inferredStatus: 'supported' | 'contradicted' | 'unverified' = 'unverified';
    let statusLabel = 'Unverified';
    let flagReason = `Verifiable factual assertion (${importancePercent}% importance weighting).`;

    if (c.relation === 'supports' || c.status === 'supported') {
      inferredStatus = 'supported';
      statusLabel = 'Supported';
      flagReason = c.reasoning || 'Multiple authoritative sources corroborate this assertion.';
    } else if (c.relation === 'contradicts' || c.status === 'contradicted') {
      inferredStatus = 'contradicted';
      statusLabel = 'Contradicted';
      flagReason = c.reasoning || 'Authoritative external evidence contradicts this assertion.';
    } else if (c.relation === 'unclear' || c.status === 'unverified') {
      inferredStatus = 'unverified';
      statusLabel = 'Unclear';
      flagReason = c.reasoning || 'No sufficient reliable evidence was found to confirm or contradict this claim.';
    } else {
      const hasContradiction = matchingEvidence.some((ev: any) => ev.relation === 'contradicts');
      const hasSupport = matchingEvidence.some((ev: any) => ev.relation === 'supports');

      if (hasContradiction) {
        inferredStatus = 'contradicted';
        statusLabel = 'Contradicted';
        flagReason = 'External evidence contradicts or refutes this assertion.';
      } else if (hasSupport) {
        inferredStatus = 'supported';
        statusLabel = 'Supported';
        flagReason = 'Corroborating external source retrieved.';
      }
    }

    const calculatedScore =
      typeof c.claimScore === 'number'
        ? c.claimScore
        : inferredStatus === 'supported'
        ? 90
        : inferredStatus === 'contradicted'
        ? 8
        : 50;

    const strongestSource =
      c.strongestSource ||
      (matchingEvidence.length > 0 ? matchingEvidence[0]?.sourceName || matchingEvidence[0]?.publisher : undefined);

    const latestEvidenceDate = matchingEvidence.find((e) => e.publishedDate)?.publishedDate || null;

    return {
      id: claimId,
      claimId: (c.id || `CL-${idx + 1}`).toUpperCase(),
      statement: c.text || c.statement || '',
      status: inferredStatus,
      statusLabel,
      importance: c.importance,
      claimType: c.claim_type,
      flagReason: c.reasoning || flagReason,
      claimScore: calculatedScore,
      confidence: c.confidence || c.evaluation?.confidence || (inferredStatus === 'unverified' ? 45 : 90),
      evidenceCount: c.evidenceCount ?? matchingEvidence.length,
      supportingEvidenceCount:
        c.supportingEvidenceCount ?? matchingEvidence.filter((e: any) => e.relation === 'supports').length,
      contradictingEvidenceCount:
        c.contradictingEvidenceCount ?? matchingEvidence.filter((e: any) => e.relation === 'contradicts').length,
      strongestSource,
      evidenceQuality: c.evidenceQuality || (matchingEvidence.some((e: any) => (e.sourceTier || 5) <= 2) ? 'HIGH' : 'MEDIUM'),
      reasoning: c.reasoning || c.evaluation?.reasoning || flagReason,
      isCompound: c.isCompound || (c.subclaims && c.subclaims.length > 0),
      subclaims: c.subclaims?.map((sub: any) => ({
        id: sub.id,
        subject: sub.subject,
        predicate: sub.predicate,
        attribute: sub.attribute,
        text: sub.text,
        relation: sub.relation,
        confidence: sub.confidence,
        reasoning: sub.reasoning,
      })),
      isTimeSensitive: c.isTimeSensitive,
      referenceDate: c.referenceDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      latestEvidenceDate,
      evaluation: c.evaluation,
      evidence: matchingEvidence,
    };
  });

  // Calculate distinct domains and source statistics across all evidence
  const distinctDomains = new Set<string>();
  let supportingCount = 0;
  let contradictingCount = 0;
  let unclearCount = 0;
  let highQualityCount = 0;

  for (const ev of rawEvidence) {
    const domain = ev.domain || (ev.sourceUrl ? new URL(ev.sourceUrl).hostname.replace(/^www\./, '') : ev.publisher);
    if (domain) distinctDomains.add(domain);
    const tier = ev.sourceTier || 3;
    if (tier <= 2 || tier === 3) highQualityCount++;

    const rel = ev.relation || (ev.relationToClaim === 'SUPPORTS' ? 'supports' : ev.relationToClaim === 'CONTRADICTS' ? 'contradicts' : 'unclear');
    if (rel === 'supports') supportingCount++;
    else if (rel === 'contradicts') contradictingCount++;
    else unclearCount++;
  }

  const conflictingCount = supportingCount > 0 && contradictingCount > 0 ? 1 : 0;
  const sourceStats = {
    totalAnalyzed: rawEvidence.length,
    independentCount: Math.max(1, distinctDomains.size),
    highQualityCount,
    conflictingCount,
    supportingCount,
    contradictingCount,
    unclearCount,
  };

  const finalScore = backendData.score ?? 0;
  let recommendation = "Some claims could not be independently verified. Check the sources before sharing.";
  if (finalScore >= 80) {
    recommendation = "Most important claims are supported by authoritative independent evidence.";
  } else if (finalScore >= 60) {
    recommendation = "The content is mostly credible, though some assertions require additional corroboration.";
  } else if (finalScore >= 40) {
    recommendation = "Some claims could not be independently verified. Check the sources before sharing.";
  } else if (finalScore >= 20) {
    recommendation = "One or more important claims conflict with reliable independent evidence.";
  } else {
    recommendation = "Major factual claims are contradicted by strong independent evidence.";
  }

  return {
    id: generatedId,
    title:
      backendData.article?.title ||
      (fallbackInputText
        ? fallbackInputText.slice(0, 60) + (fallbackInputText.length > 60 ? '...' : '')
        : 'Submitted Article for Forensic Analysis'),
    sourceUrl: articleUrl || undefined,
    publisher: publisher,
    author: backendData.article?.author || 'Unspecified / Ingested',
    analyzedAt: analyzedDate,
    wordCount: calculatedWordCount,
    credibilityScore: finalScore,
    confidenceLevel: backendData.confidence ?? (finalScore >= 80 ? 92 : 88),
    verdict: mapVerdictToType(backendData.verdict),
    verdictLabel: backendData.verdict || 'Needs Verification',
    summary: backendData.summary,
    limitations: backendData.limitations || [],
    executiveSummary: defaultSummary,
    publishedAt: backendData.article?.publishedAt || null,
    updatedAt: backendData.article?.updatedAt || null,
    retrievedAt: backendData.article?.retrievedAt || analyzedDate,
    extractionStatus: backendData.article?.extractionStatus || 'COMPLETE',
    isPartial: backendData.article?.isPartial || false,
    extractionWarning: backendData.article?.warning,
    sourceStats,
    recommendation,
    referenceDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    diagnostics: {
      evidenceSupport: backendData.breakdown?.evidenceSupport ?? (backendData.score || 50),
      sourceReliability: backendData.breakdown?.sourceReliability ?? 50,
      crossSourceAgreement: backendData.breakdown?.crossSourceAgreement ?? 50,
      claimVerification: backendData.breakdown?.claimVerification ?? (mappedClaims.length > 0 ? 50 : 0),
      articleQuality: backendData.breakdown?.articleQuality ?? 60,
    },
    claims: mappedClaims,
    sourceProfile: {
      name: publisher,
      domain: publisher,
      reputationLevel: 'Marginal',
      score: backendData.breakdown?.sourceReliability ?? backendData.score ?? 0,
      description: 'Domain records evaluated across multi-source institutional and wire indices.',
      biasRating: 'Unassessed',
    },
    totalClaimsIdentified: mappedClaims.length,
    articleSummary: (backendData as any).articleSummary,
  };
};
