import React from 'react';

export const Disclaimer: React.FC = () => {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3.5 px-4 flex items-center justify-between gap-3 text-xs text-on-surface-variant">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-outline">verified_user</span>
        <span className="font-body-sm text-xs font-medium">
          <strong className="text-primary font-semibold">Disclaimer:</strong> AI-assisted credibility assessment. Verify important claims using the provided sources.
        </span>
      </div>
      <span className="font-label-code text-[10px] text-outline uppercase tracking-wider hidden sm:inline-block">
        VERITAS PROTOCOL v1.0
      </span>
    </div>
  );
};
