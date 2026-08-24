import React from 'react';
import { DiagnosticMetrics } from '../../types/analysis';

interface ScoreBreakdownProps {
  diagnostics: DiagnosticMetrics;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ diagnostics }) => {
  const metrics = [
    {
      label: 'Evidence Support',
      weight: '30%',
      value: diagnostics.evidenceSupport,
      description: 'Strength of corroborating external citations',
    },
    {
      label: 'Source Reliability',
      weight: '25%',
      value: diagnostics.sourceReliability,
      description: 'Authority of institutional & wire domains',
    },
    {
      label: 'Cross-Source Agreement',
      weight: '20%',
      value: diagnostics.crossSourceAgreement,
      description: 'Consensus among independent publishers',
    },
    {
      label: 'Claim Verification',
      weight: '15%',
      value: diagnostics.claimVerification,
      description: 'Importance-weighted verified assertions',
    },
    {
      label: 'Article Quality',
      weight: '10%',
      value: diagnostics.articleQuality,
      description: 'Journalistic completeness, author & metadata',
    },
  ];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-7 flex flex-col shadow-subtle h-full justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-5">
          <div>
            <h3 className="font-headline-md text-base md:text-lg text-primary font-bold">
              Score Breakdown
            </h3>
            <p className="font-label-code text-[11px] text-outline">
              5 Independent Mathematical Pillars
            </p>
          </div>
          <span className="font-label-code text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant border border-outline-variant font-bold">
            100% Total
          </span>
        </div>

        <div className="space-y-4">
          {metrics.map((m) => {
            const getBarColor = (val: number) => {
              if (val >= 75) return 'bg-[#10b981]';
              if (val >= 50) return 'bg-primary';
              if (val >= 30) return 'bg-[#f59e0b]';
              return 'bg-[#ef4444]';
            };

            return (
              <div key={m.label} className="space-y-1">
                <div className="flex justify-between items-baseline text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-on-surface">{m.label}</span>
                    <span className="font-label-code text-[10px] text-outline bg-surface-container-low px-1.5 py-0.2 rounded">
                      ({m.weight})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-primary text-xs md:text-sm">
                    {m.value} / 100
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${getBarColor(m.value)}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>

                <div className="text-[10px] font-label-code text-outline truncate">
                  {m.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-outline-variant/60 text-[11px] font-label-code text-outline flex items-center justify-between">
        <span>Deterministic Formula</span>
        <span className="text-primary font-semibold">Reproducible Scoring</span>
      </div>
    </div>
  );
};
