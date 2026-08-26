import React from 'react';
import { AnalysisResult } from '../../types/analysis';

interface ForensicReportViewProps {
  result: AnalysisResult;
}

export const ForensicReportView: React.FC<ForensicReportViewProps> = ({ result }) => {
  const accentColor =
    result.credibilityScore >= 70
      ? 'bg-emerald-soft'
      : result.credibilityScore >= 40
      ? 'bg-amber-soft'
      : 'bg-error';

  const handlePrint = () => {
    window.print();
  };

  const stats = result.sourceStats || {
    totalAnalyzed: result.claims.reduce((acc, c) => acc + c.evidence.length, 0),
    independentCount: Math.max(1, new Set(result.claims.flatMap((c) => c.evidence.map((e) => e.domain || e.sourceName))).size),
    highQualityCount: result.claims.reduce((acc, c) => acc + c.evidence.filter((e) => (e.sourceTier || 5) <= 3).length, 0),
    conflictingCount: result.claims.filter((c) => c.supportingEvidenceCount && c.contradictingEvidenceCount).length,
    supportingCount: result.claims.reduce((acc, c) => acc + (c.supportingEvidenceCount || 0), 0),
    contradictingCount: result.claims.reduce((acc, c) => acc + (c.contradictingEvidenceCount || 0), 0),
    unclearCount: result.claims.reduce((acc, c) => acc + (c.evidence.length - (c.supportingEvidenceCount || 0) - (c.contradictingEvidenceCount || 0)), 0),
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      {/* Top Document Controls (Hidden when printing) */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 no-print px-2">
        <div className="text-xs text-zinc-500 uppercase flex items-center gap-1.5 font-semibold">
          <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
          Fact-Check & Credibility Report
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 border border-zinc-200 bg-white rounded-lg text-xs text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Report
          </button>
        </div>
      </div>

      {/* Main Document Article */}
      <article className="w-full max-w-4xl bg-white border border-zinc-200 shadow-sm rounded-2xl relative overflow-hidden">
        {/* Top Accent Line */}
        <div className={`h-1.5 w-full ${accentColor} absolute top-0 left-0`} />

        <div className="p-6 md:p-10 space-y-8">
          {/* 1. FINAL RESULT HEADER */}
          <header className="border-b border-zinc-200 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="text-zinc-400 text-xs font-semibold tracking-wider">
                VERIFICATION ID: {result.id}
              </span>
              <span className="text-xs text-zinc-400">
                Analyzed: {result.analyzedAt}
              </span>
            </div>

            {(() => {
              const isNonFactual =
                typeof result.verdictLabel === 'string' &&
                (result.verdictLabel.toUpperCase().includes('THEOLOGICAL') ||
                  result.verdictLabel.toUpperCase().includes('OPINION') ||
                  result.verdictLabel.toUpperCase().includes('PREDICTION') ||
                  result.verdictLabel.toUpperCase().includes('LIMITED EVIDENCE'));

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container-low p-5 rounded-lg border border-outline-variant/60 mb-6">
                  <div>
                    <div className="text-outline uppercase text-[11px] tracking-wider mb-1 font-semibold font-label-caps">
                      Overall Credibility Score
                    </div>
                    <div className="text-2xl md:text-3xl font-extrabold font-mono text-on-background">
                      <span>
                        {result.credibilityScore} <span className="text-base text-outline font-normal">/ 100</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-outline uppercase text-[11px] tracking-wider mb-1 font-semibold font-label-caps">
                      Final Verdict
                    </div>
                    <div
                      className={`text-base md:text-lg font-bold font-label-caps ${
                        isNonFactual
                          ? 'text-purple-700'
                          : result.credibilityScore >= 70
                          ? 'text-emerald-700'
                          : result.credibilityScore >= 40
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {result.verdictLabel.toUpperCase()}
                    </div>
                  </div>

                  <div>
                    <div className="text-outline uppercase text-[11px] tracking-wider mb-1 font-semibold font-label-caps">
                      Verification Confidence
                    </div>
                    <div className="text-2xl md:text-3xl font-extrabold font-mono text-primary">
                      {result.confidenceLevel || 50}%
                    </div>
                  </div>
                </div>
              );
            })()}

            <h1 className="font-headline-lg text-xl md:text-2xl lg:text-3xl text-on-background font-bold mb-4 leading-snug">
              {result.title}
            </h1>

            {/* Article Extraction Status */}
            {result.sourceUrl && (
              <div
                className={`p-3.5 rounded border text-xs font-body-sm flex items-center justify-between gap-3 ${
                  result.isPartial
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    {result.isPartial ? 'warning' : 'verified'}
                  </span>
                  <span>
                    <strong>EXTRACTION STATUS: {result.extractionStatus || (result.isPartial ? 'PARTIAL' : 'COMPLETE')}</strong>
                    {result.isPartial ? ' — Only part of this article was accessible. Verification may be incomplete.' : ' — Full article body retrieved successfully.'}
                  </span>
                </div>
                {result.publisher && (
                  <span className="font-label-code text-[11px] bg-white/70 px-2 py-0.5 rounded border border-current">
                    {result.publisher}
                  </span>
                )}
              </div>
            )}
          </header>

          {/* 2. WHY THIS SCORE? */}
          <section className="bg-surface-container p-6 rounded-lg border border-outline-variant">
            <h2 className="font-headline-md text-base md:text-lg text-primary font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
              Why this Score?
            </h2>
            <p className="text-xs md:text-sm text-on-surface leading-relaxed font-body-md mb-4">
              {result.articleSummary?.whyThisScore ||
                result.summary ||
                (result.executiveSummary && result.executiveSummary[0]) ||
                'Credibility synthesized from factual claim verification, independent wire corroboration, and source trust rankings.'}
            </p>

            {result.auditTrail && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-outline-variant/60 font-label-code text-xs">
                <div className="bg-surface-container-low p-2.5 rounded border border-outline-variant/60">
                  <div className="text-[10px] text-outline uppercase font-semibold">Support Strength</div>
                  <div className="text-sm font-bold text-emerald-700">{result.auditTrail.supportStrength}</div>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded border border-outline-variant/60">
                  <div className="text-[10px] text-outline uppercase font-semibold">Contradiction Strength</div>
                  <div className="text-sm font-bold text-red-700">{result.auditTrail.contradictionStrength}</div>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded border border-outline-variant/60">
                  <div className="text-[10px] text-outline uppercase font-semibold">Evidence Coverage</div>
                  <div className="text-sm font-bold text-primary">{result.auditTrail.evidenceCoverage}</div>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded border border-outline-variant/60">
                  <div className="text-[10px] text-outline uppercase font-semibold">Source Independence</div>
                  <div className="text-sm font-bold text-on-surface">{result.auditTrail.sourceIndependence} Domains</div>
                </div>
              </div>
            )}
          </section>

          {/* 3. SOURCE DISTRIBUTION & EVIDENCE SUMMARY */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant">
              <h3 className="font-label-caps text-xs text-outline font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                Source Distribution
              </h3>
              <div className="space-y-2.5 font-label-code text-xs">
                {result.coverageStats ? (
                  <>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">Sources searched:</span>
                      <span className="font-bold text-on-surface">{result.coverageStats.sourcesSearchedCount}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">Relevant sources found:</span>
                      <span className="font-bold text-primary">{result.coverageStats.relevantSourcesFoundCount}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">Supporting sources:</span>
                      <span className="font-bold text-emerald-700">{result.coverageStats.supportingSourcesCount}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">Contradicting sources:</span>
                      <span className="font-bold text-red-700">{result.coverageStats.contradictingSourcesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Independent evidence clusters:</span>
                      <span className="font-bold text-primary">{result.coverageStats.independentClustersCount}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">Sources analyzed:</span>
                      <span className="font-bold text-on-surface">{stats.totalAnalyzed}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">Independent sources:</span>
                      <span className="font-bold text-primary">{stats.independentCount}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                      <span className="text-on-surface-variant">High-quality sources (Tiers 1-3):</span>
                      <span className="font-bold text-emerald-700">{stats.highQualityCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Conflicting sources:</span>
                      <span className={`font-bold ${stats.conflictingCount > 0 ? 'text-amber-700' : 'text-on-surface'}`}>
                        {stats.conflictingCount}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant">
              <h3 className="font-label-caps text-xs text-outline font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                Evidence Summary
              </h3>
              <div className="space-y-2.5 font-label-code text-xs">
                <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                  <span className="text-emerald-700 font-semibold">✓ Supporting evidence:</span>
                  <span className="font-bold text-emerald-700">{stats.supportingCount}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                  <span className="text-red-700 font-semibold">✕ Contradicting evidence:</span>
                  <span className="font-bold text-red-700">{stats.contradictingCount}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-outline-variant/60">
                  <span className="text-amber-700 font-semibold">? Unclear evidence:</span>
                  <span className="font-bold text-amber-700">{stats.unclearCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Independent publishers:</span>
                  <span className="font-bold text-on-surface">{stats.independentCount}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 3B. DATASET SIMILARITY SIGNAL (PHASE 3) */}
          {result.datasetSimilarity && result.datasetSimilarity.nearestExamples && result.datasetSimilarity.nearestExamples.length > 0 && (
            <section className="bg-surface-container p-6 rounded-lg border border-outline-variant">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-headline-md text-base md:text-lg text-primary font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">database</span>
                  Dataset Similarity
                </h2>
                <span
                  className={`font-label-caps text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider border ${
                    result.datasetSimilarity.datasetMatch === 'HIGH'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : result.datasetSimilarity.datasetMatch === 'MEDIUM'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant'
                  }`}
                >
                  {result.datasetSimilarity.datasetMatch} Match
                </span>
              </div>

              <p className="text-xs text-on-surface-variant font-body-sm mb-4">
                {result.datasetSimilarity.summary}
              </p>

              <div className="bg-white p-4 rounded border border-outline-variant space-y-3 font-label-code text-xs">
                <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2">
                  <span className="text-outline font-semibold">Nearest example:</span>
                  <span className="font-bold text-on-surface truncate max-w-[70%]">
                    "{result.datasetSimilarity.nearestExamples[0].title}"
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-surface-container-low p-2 rounded">
                    <div className="text-[10px] text-outline uppercase font-semibold">Dataset Label</div>
                    <div
                      className={`font-bold text-sm ${
                        result.datasetSimilarity.nearestLabel === 'FAKE' ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {result.datasetSimilarity.nearestLabel}
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded">
                    <div className="text-[10px] text-outline uppercase font-semibold">Similarity</div>
                    <div className="font-bold text-sm text-primary">
                      {Math.round(result.datasetSimilarity.nearestExamples[0].similarity * 100)}% semantic similarity
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded">
                    <div className="text-[10px] text-outline uppercase font-semibold">Fake Signal</div>
                    <div className="font-bold text-sm text-red-700">
                      {result.datasetSimilarity.fakeSimilarity}
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-2 rounded">
                    <div className="text-[10px] text-outline uppercase font-semibold">Real Signal</div>
                    <div className="font-bold text-sm text-emerald-700">
                      {result.datasetSimilarity.realSimilarity}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-outline italic font-body-sm">
                * Note: Dataset similarity measures topical and semantic pattern overlap with historical archives. It is a secondary diagnostic signal and does not represent probability of factual truth.
              </div>
            </section>
          )}

          {/* 4. CLAIM-BY-CLAIM DETAILED FORENSIC BREAKDOWN */}
          <section className="space-y-4">
            <h2 className="font-headline-md text-base md:text-lg text-primary font-bold border-b border-outline-variant pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">list_alt</span>
              Claim-by-Claim Forensic Breakdown ({result.claims.length})
            </h2>

            <div className="space-y-4">
              {result.claims.map((claim, idx) => {
                const isContradicted = claim.status === 'contradicted';
                const isSupported = claim.status === 'supported';

                return (
                  <div
                    key={claim.id}
                    className={`p-5 rounded-lg border ${
                      isContradicted
                        ? 'bg-red-50/50 border-red-200'
                        : isSupported
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-surface-container-lowest border-outline-variant'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-label-code text-xs font-bold text-outline">
                          CLAIM {idx + 1} ({claim.claimId})
                        </span>
                        <span className="font-label-code text-[11px] bg-white px-2 py-0.5 rounded border border-outline-variant font-bold text-primary uppercase tracking-wider">
                          Type: {claim.classification ? claim.classification.replace(/_/g, ' ') : 'Objective Fact'}
                        </span>
                        <span className="font-label-code text-[11px] bg-white px-2 py-0.5 rounded border border-outline-variant font-bold text-primary">
                          Importance: {claim.importance !== undefined ? (claim.importance >= 0.7 ? 'HIGH' : claim.importance >= 0.4 ? 'MEDIUM' : 'LOW') : 'MEDIUM'}
                        </span>
                        {claim.claimScore !== undefined ? (
                          <span
                            className={`font-label-code text-[11px] px-2 py-0.5 rounded border font-bold ${
                              (claim.claimScore ?? 50) >= 80
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : (claim.claimScore ?? 50) <= 25
                                ? 'bg-red-100 text-red-900 border-red-300'
                                : 'bg-surface-container text-on-surface border-outline-variant'
                            }`}
                          >
                            Score: {claim.claimScore ?? 50} / 100
                          </span>
                        ) : null}
                        {claim.confidence !== undefined && claim.isVerifiable !== false && (
                          <span className="font-label-code text-[11px] bg-white px-2 py-0.5 rounded border border-outline-variant text-on-surface-variant font-semibold">
                            Confidence: {claim.confidence}%
                          </span>
                        )}
                      </div>

                      <span
                        className={`font-label-caps text-xs px-3 py-1 rounded border font-bold ${
                          isContradicted
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : isSupported
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : claim.isVerifiable === false
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-surface-container text-on-surface-variant border-outline-variant'
                        }`}
                      >
                        VERDICT: {claim.isVerifiable === false ? (claim.statusLabel || 'NOT OBJECTIVELY VERIFIABLE').toUpperCase() : isContradicted ? 'CONTRADICTED' : isSupported ? 'SUPPORTED' : 'UNCLEAR'}
                      </span>
                    </div>

                    <p className="font-semibold text-sm md:text-base text-on-surface mb-3">
                      "{claim.statement}"
                    </p>

                    {/* Compound Claim Subclaims Breakdown */}
                    {claim.subclaims && claim.subclaims.length > 0 && (
                      <div className="mb-3 p-3 rounded bg-surface-container-high/60 border border-outline-variant">
                        <span className="font-label-caps text-[10px] font-bold text-primary uppercase tracking-wider block mb-2">
                          COMPOUND CLAIM — ATOMIC PROPOSITIONS
                        </span>
                        <div className="space-y-1.5">
                          {claim.subclaims.map((sub, sIdx) => {
                            const isSubSup = sub.relation === 'supports';
                            const isSubCon = sub.relation === 'contradicts';
                            return (
                              <div
                                key={sub.id || sIdx}
                                className="p-2 rounded bg-white border border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`material-symbols-outlined text-[15px] ${
                                      isSubSup ? 'text-emerald-700' : isSubCon ? 'text-red-700' : 'text-amber-700'
                                    }`}
                                  >
                                    {isSubSup ? 'check_circle' : isSubCon ? 'cancel' : 'help'}
                                  </span>
                                  <span className="font-medium text-on-surface">
                                    {sub.attribute ? `Largest by ${sub.attribute}: ` : ''}"{sub.text}"
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-label-caps font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                                    isSubSup
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : isSubCon
                                      ? 'bg-red-50 text-red-800 border-red-300'
                                      : 'bg-surface-container text-on-surface-variant border-outline-variant'
                                  }`}
                                >
                                  {isSubSup ? 'SUPPORTED' : isSubCon ? 'CONTRADICTED' : 'UNCLEAR'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Why this verdict */}
                    <div className="bg-white/80 p-3 rounded border border-outline-variant/60 text-xs font-body-sm text-on-surface mb-3">
                      <strong>Why:</strong> {claim.reasoning || claim.flagReason || 'Evaluation synthesized from retrieved independent records.'}
                    </div>

                    {/* Strongest Evidence Card if available */}
                    {claim.evidence.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/50">
                        <span className="font-label-caps text-[11px] text-outline uppercase font-bold tracking-wider block mb-2">
                          Strongest Retrieved Evidence:
                        </span>
                        <div className="bg-white p-3.5 rounded border border-outline-variant text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface">
                              {claim.evidence[0].sourceName} ({claim.evidence[0].domain || 'verified'})
                            </span>
                            <span className="font-label-code text-[11px] text-primary font-semibold">
                              {claim.evidence[0].sourceTierLabel || 'Tier 1 Official'} · {claim.evidence[0].sourceReliability || 95}% Reliability
                            </span>
                          </div>
                          <p className="italic text-on-surface-variant bg-surface-container-low p-2 rounded">
                            "{claim.evidence[0].quote}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. FINAL RECOMMENDATION (Responsible Language) */}
          <section className="bg-surface-container-lowest border-2 border-primary/20 p-6 rounded-lg">
            <h2 className="font-headline-md text-base md:text-lg text-primary font-bold mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">recommend</span>
              Final Recommendation
            </h2>
            <p className="text-xs md:text-sm text-on-surface leading-relaxed font-body-md">
              {result.recommendation ||
                'Major claims have been analyzed against independent wire sources. Verify critical claims with primary documentation before sharing.'}
            </p>
          </section>
        </div>
      </article>
    </div>
  );
};
