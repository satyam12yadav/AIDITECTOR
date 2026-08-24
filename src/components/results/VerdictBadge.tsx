import React from 'react';
import { VerdictType } from '../../types/analysis';

interface VerdictBadgeProps {
  verdict: VerdictType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  verdict,
  label,
  size = 'md',
}) => {
  let colorClasses = '';
  let iconName = 'help';
  let defaultLabel = 'UNVERIFIED';

  switch (verdict) {
    case 'HIGHLY_CREDIBLE':
      colorClasses = 'bg-emerald-bg text-emerald-dark border-emerald-soft';
      iconName = 'verified';
      defaultLabel = 'HIGHLY CREDIBLE';
      break;
    case 'PROBABLY_CREDIBLE':
      colorClasses = 'bg-[#ecfdf5] text-[#065f46] border-[#34d399]';
      iconName = 'check_circle';
      defaultLabel = 'PROBABLY CREDIBLE';
      break;
    case 'UNVERIFIED':
      colorClasses = 'bg-[#fef3c7] text-[#92400e] border-[#f59e0b]';
      iconName = 'warning';
      defaultLabel = 'UNVERIFIED / SENSATIONALIZED';
      break;
    case 'NEEDS_VERIFICATION':
      colorClasses = 'bg-surface-container-high text-on-surface border-outline';
      iconName = 'pending';
      defaultLabel = 'NEEDS VERIFICATION';
      break;
    case 'LIKELY_MISLEADING':
      colorClasses = 'bg-[#fff1f2] text-[#9f1239] border-[#fda4af]';
      iconName = 'error';
      defaultLabel = 'LIKELY MISLEADING';
      break;
    case 'HIGHLY_SUSPICIOUS':
      colorClasses = 'bg-error-container text-on-error-container border-[#ffb4ab]';
      iconName = 'cancel';
      defaultLabel = 'HIGHLY SUSPICIOUS';
      break;
  }

  const sizeClasses =
    size === 'lg'
      ? 'px-5 py-2.5 text-sm font-bold tracking-wider'
      : size === 'sm'
      ? 'px-2.5 py-1 text-[10px] font-semibold'
      : 'px-4 py-2 text-xs font-bold tracking-wider';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded border font-label-caps uppercase ${colorClasses} ${sizeClasses} shadow-subtle`}
    >
      <span className="material-symbols-outlined text-[16px] fill">{iconName}</span>
      <span>{label || defaultLabel}</span>
    </span>
  );
};
