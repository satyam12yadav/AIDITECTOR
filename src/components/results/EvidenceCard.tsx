import React from 'react';
import { EvidenceItem } from '../../types/analysis';

interface EvidenceCardProps {
  evidence: EvidenceItem;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({ evidence }) => {
  const relation = evidence.relation || 'unclear';

  const relationBadge =
    relation === 'supports' ? (
      <span className="inline-flex items-center gap-1 font-label-code text-[11px] px-2.5 py-0.5 rounded border border-[#6ee7b7] bg-[#ecfdf5] text-[#065f46] font-bold">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        SUPPORTS
      </span>
    ) : relation === 'contradicts' ? (
      <span className="inline-flex items-center gap-1 font-label-code text-[11px] px-2.5 py-0.5 rounded border border-[#fca5a5] bg-[#fef2f2] text-[#991b1b] font-bold">
        <span className="material-symbols-outlined text-[14px]">cancel</span>
        CONTRADICTS
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 font-label-code text-[11px] px-2.5 py-0.5 rounded border border-[#fde68a] bg-[#fffbeb] text-[#92400e] font-semibold">
        <span className="material-symbols-outlined text-[14px]">help</span>
        UNCLEAR
      </span>
    );

  const borderAccent =
    relation === 'supports'
      ? 'border-l-4 border-l-[#10b981]'
      : relation === 'contradicts'
      ? 'border-l-4 border-l-[#ef4444]'
      : 'border-l-4 border-l-[#f59e0b]';

  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant ${borderAccent} p-4 md:p-5 rounded-r shadow-subtle flex flex-col justify-between`}
    >
      <div>
        {/* Header: Publisher & Relation Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">feed</span>
            <div>
              <span className="font-label-code text-xs md:text-sm font-bold text-on-surface">
                {evidence.sourceName || evidence.publisher || 'Independent Source'}
              </span>
              {evidence.publisher && evidence.publisher !== evidence.sourceName && (
                <span className="font-label-code text-[11px] text-outline ml-1.5">
                  ({evidence.publisher})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-label-code text-[11px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant">
              {evidence.reliabilityBadge}
            </span>
            {relationBadge}
          </div>
        </div>

        {/* Snippet */}
        <p className="font-body-sm text-xs md:text-sm text-on-surface-variant mb-4 italic leading-relaxed bg-surface-container-low/50 p-3 rounded border border-outline-variant/30">
          "{evidence.quote}"
        </p>
      </div>

      {/* Footer: Open Source Link */}
      <div className="pt-3 border-t border-outline-variant/50 flex items-center justify-between">
        <span className="font-label-code text-[11px] text-outline truncate max-w-[200px] md:max-w-xs">
          {evidence.url !== '#' ? evidence.url : 'Direct Verification Citation'}
        </span>

        {evidence.isAvailable && evidence.url && evidence.url !== '#' ? (
          <a
            href={evidence.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded font-label-caps text-xs text-primary font-bold transition-colors"
          >
            <span>Open Source</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        ) : (
          <span className="font-label-code text-xs text-outline opacity-70 inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>Archived Citation</span>
          </span>
        )}
      </div>
    </div>
  );
};
