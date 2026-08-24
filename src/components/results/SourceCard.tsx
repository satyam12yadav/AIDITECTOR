import React from 'react';
import { SourceProfile } from '../../types/analysis';

interface SourceCardProps {
  source: SourceProfile;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const getReputationColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-soft';
    if (score >= 45) return 'bg-amber-soft';
    return 'bg-error';
  };

  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-subtle">
      <div className="bg-surface-variant px-6 py-3 border-b border-outline-variant flex justify-between items-center">
        <h3 className="font-label-caps text-xs text-on-surface uppercase font-bold tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">public</span>
          Source Profile & Publisher Index
        </h3>
        <span className="material-symbols-outlined text-outline text-sm">lan</span>
      </div>

      <div className="p-6 flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 rounded-full border border-outline-variant flex items-center justify-center bg-surface-container mb-4 text-primary">
          <span className="material-symbols-outlined text-3xl">corporate_fare</span>
        </div>

        <div className="font-headline-md text-base md:text-lg font-bold text-on-surface mb-1">
          {source.name}
        </div>

        <div className="font-label-code text-xs text-outline mb-2">
          {source.domain}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container border border-outline-variant text-xs font-label-code text-on-surface-variant mb-4">
          <span className="font-semibold">Reputation Tier:</span>
          <span className="font-bold text-primary">{source.reputationLevel}</span>
        </div>

        <p className="font-body-sm text-xs text-on-surface-variant max-w-md mb-4 leading-relaxed">
          {source.description}
        </p>

        {/* Reputation Meter */}
        <div className="w-full max-w-sm mt-auto pt-2">
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-1000 ${getReputationColor(source.score)}`}
              style={{ width: `${source.score}%` }}
            />
          </div>

          <div className="w-full flex justify-between text-[10px] font-label-code text-outline uppercase">
            <span>Low Trust (0)</span>
            <span className="font-bold text-primary">{source.score}/100</span>
            <span>High Trust (100)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
