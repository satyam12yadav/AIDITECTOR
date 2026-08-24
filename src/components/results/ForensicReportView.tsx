import React from 'react';
import { AnalysisResult } from '../../types/analysis';
import { SourceCard } from './SourceCard';

interface ForensicReportViewProps {
  result: AnalysisResult;
}

export const ForensicReportView: React.FC<ForensicReportViewProps> = ({ result }) => {
  const accentColor =
    result.credibilityScore >= 70
      ? 'bg-emerald-soft'
      : result.credibilityScore >= 45
      ? 'bg-amber-soft'
      : 'bg-error';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col items-center py-4">
      {/* Top Document Controls (Hidden when printing) */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 no-print px-2">
        <div className="text-xs font-label-code text-outline uppercase flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          Institutional Verification Dossier
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 border border-outline-variant bg-surface-container-lowest rounded font-label-code text-xs text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1.5 shadow-subtle"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Report
          </button>
        </div>
      </div>

      {/* Main Document Article */}
      <article className="w-full max-w-4xl bg-surface-container-lowest border border-outline-variant shadow-ambient rounded-lg relative overflow-hidden">
        {/* Top Accent Line */}
        <div className={`h-1.5 w-full ${accentColor} absolute top-0 left-0`} />

        <div className="p-6 md:p-12">
          {/* Header Section */}
          <header className="mb-10 border-b border-outline-variant pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <span
                className={`inline-flex items-center px-3 py-1 rounded font-label-code text-xs font-bold border ${
                  result.credibilityScore >= 70
                    ? 'bg-emerald-bg text-emerald-dark border-emerald-soft'
                    : result.credibilityScore >= 45
                    ? 'bg-amber-bg text-amber-dark border-amber-soft'
                    : 'bg-error-container text-on-error-container border-error/30'
                }`}
              >
                CREDIBILITY SCORE: {result.credibilityScore}/100 ({result.verdictLabel})
              </span>

              <span className="text-on-surface-variant font-label-caps text-xs tracking-wider">
                DOSSIER ID: {result.id}
              </span>
            </div>

            <h1 className="font-headline-lg-mobile md:font-headline-lg text-xl md:text-3xl lg:text-4xl text-on-background font-bold mb-6 leading-tight">
              {result.title}
            </h1>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 font-label-code text-xs text-on-surface-variant bg-surface-container-low p-4 rounded border border-outline-variant/60">
              <div>
                <div className="text-outline uppercase text-[10px] tracking-wider mb-1 font-semibold">
                  Publisher
                </div>
                <div className="text-on-background font-bold truncate">{result.publisher}</div>
              </div>
              <div>
                <div className="text-outline uppercase text-[10px] tracking-wider mb-1 font-semibold">
                  Author
                </div>
                <div className="text-on-background truncate">{result.author}</div>
              </div>
              <div>
                <div className="text-outline uppercase text-[10px] tracking-wider mb-1 font-semibold">
                  Analyzed At
                </div>
                <div className="text-on-background">{result.analyzedAt}</div>
              </div>
              <div>
                <div className="text-outline uppercase text-[10px] tracking-wider mb-1 font-semibold">
                  Confidence
                </div>
                <div className="text-on-background font-bold">{result.confidenceLevel}%</div>
              </div>
            </div>
          </header>

          {/* Executive Summary */}
          <section className="mb-10">
            <h2 className="font-headline-md text-base md:text-lg text-primary font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-outline">psychology</span>
              Executive Forensic Summary
            </h2>
            <div className="bg-surface-container p-6 rounded border border-outline-variant text-on-surface text-sm md:text-base leading-relaxed space-y-3 font-body-base">
              {result.executiveSummary.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Bento Grid: Extracted Claims Checklist & Source Profile */}
          <section className="mb-8">
            <h2 className="font-headline-md text-base md:text-lg text-primary font-bold mb-4 border-b border-outline-variant pb-2">
              Forensic Claim Decomposition
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claims Checklist */}
              <div className="bg-background border border-outline-variant rounded p-6">
                <h3 className="font-label-caps text-xs text-outline mb-4 uppercase font-bold tracking-wider">
                  Isolate Assertions ({result.claims.length})
                </h3>
                <ul className="space-y-4">
                  {result.claims.map((claim) => {
                    const iconColor =
                      claim.status === 'supported'
                        ? 'text-emerald-dark'
                        : claim.status === 'contradicted'
                        ? 'text-error'
                        : 'text-amber-dark';

                    const iconName =
                      claim.status === 'supported'
                        ? 'check_circle'
                        : claim.status === 'contradicted'
                        ? 'cancel'
                        : 'warning';

                    return (
                      <li
                        key={claim.id}
                        className="flex gap-3 items-start pb-4 border-b border-outline-variant border-dashed last:border-0 last:pb-0"
                      >
                        <span
                          className={`material-symbols-outlined ${iconColor} mt-0.5 fill text-lg`}
                        >
                          {iconName}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-xs md:text-sm text-on-surface mb-1">
                            "{claim.statement}"
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-label-code">
                            <span>Status: {claim.statusLabel}</span>
                            <span className="text-outline">{claim.claimId}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Source Profile Card */}
              <SourceCard source={result.sourceProfile} />
            </div>
          </section>
        </div>
      </article>
    </div>
  );
};
