import React, { useState } from 'react';
import { ClaimItem } from '../../types/analysis';
import { EvidenceCard } from './EvidenceCard';

interface ClaimCardProps {
  claim: ClaimItem;
  defaultExpanded?: boolean;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({
  claim,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Status Chip styling
  let badgeClasses = '';
  let badgeIcon = 'help';
  let cleanStatusLabel = claim.statusLabel || 'UNVERIFIED';

  switch (claim.status) {
    case 'contradicted':
      badgeClasses = 'bg-error-container text-on-error-container border-[#ffb4ab]';
      badgeIcon = 'cancel';
      cleanStatusLabel = 'Contradicted';
      break;
    case 'supported':
      badgeClasses = 'bg-secondary-container text-on-secondary-container border-[#a8c7fa]';
      badgeIcon = 'check_circle';
      cleanStatusLabel = 'Supported';
      break;
    case 'partially_supported':
      badgeClasses = 'bg-[#ecfdf5] text-[#065f46] border-[#6ee7b7]';
      badgeIcon = 'done_all';
      cleanStatusLabel = 'Partially Supported';
      break;
    case 'unverified':
    default:
      badgeClasses = 'bg-surface-container-highest text-on-surface-variant border-outline-variant';
      badgeIcon = 'help';
      cleanStatusLabel = 'Unverified';
      break;
  }

  const importanceValue = claim.importance !== undefined ? Math.round(claim.importance * 100) : null;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-ambient overflow-hidden transition-all">
      {/* Claim Header */}
      <div className="p-5 md:p-6 border-b border-outline-variant flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="max-w-3xl flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-label-code text-xs text-outline tracking-wider font-semibold">
              CLAIM {claim.claimId}
            </span>

            {importanceValue !== null && (
              <span className="font-label-code text-[11px] bg-surface-container text-primary font-bold px-2 py-0.5 rounded border border-outline-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">priority_high</span>
                Importance: {importanceValue}%
              </span>
            )}

            {claim.claimType && (
              <span className="font-label-code text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant uppercase">
                {claim.claimType}
              </span>
            )}
          </div>

          <h3 className="font-headline-md text-base md:text-lg text-on-surface font-semibold leading-snug">
            "{claim.statement}"
          </h3>

          {claim.flagReason && (
            <p className="mt-2 text-xs font-body-sm text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-outline">info</span>
              <span>{claim.flagReason}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`font-label-caps text-xs px-3 py-1.5 rounded flex items-center gap-1.5 border font-bold uppercase tracking-wider ${badgeClasses}`}
          >
            <span className="material-symbols-outlined text-[16px] fill">{badgeIcon}</span>
            <span>{cleanStatusLabel}</span>
          </span>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-primary transition-colors flex items-center gap-1 text-xs font-label-caps font-bold"
            title={isExpanded ? 'Collapse evidence' : 'Expand evidence'}
            aria-label="Toggle evidence view"
          >
            <span className="hidden sm:inline-block">
              {isExpanded ? 'Hide' : 'View'} Evidence ({claim.evidence.length})
            </span>
            <span
              className={`material-symbols-outlined text-[20px] transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* Evidence & Sourcing Container */}
      {isExpanded && (
        <div className="bg-surface-bright p-5 md:p-6 border-t border-outline-variant/40">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-label-caps text-xs text-on-surface-variant flex items-center gap-2 uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-[18px] text-primary">policy</span>
              Corroborating Evidence & Source Citations ({claim.evidence.length})
            </h4>
          </div>

          {claim.evidence.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {claim.evidence.map((ev) => (
                <EvidenceCard key={ev.id} evidence={ev} />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-surface-container-low border border-outline-variant rounded-lg text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-outline text-[28px] mb-1">search_off</span>
              <p className="font-body-sm text-xs md:text-sm text-on-surface-variant font-medium">
                No reliable evidence was found for this claim.
              </p>
              <p className="font-label-code text-[11px] text-outline mt-1">
                Absence of evidence does not indicate falsity, but leaves this assertion unverified.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
