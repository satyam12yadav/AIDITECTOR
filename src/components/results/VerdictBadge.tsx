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

  const normalizedLabel = (label || '').toUpperCase();

  if (
    normalizedLabel.includes('VERY HIGH') ||
    normalizedLabel.includes('PROBABLY CREDIBLE') ||
    verdict === 'HIGHLY_CREDIBLE' ||
    verdict === 'PROBABLY_CREDIBLE'
  ) {
    colorClasses = 'bg-[#ecfdf5] text-[#065f46] border-[#34d399]';
    iconName = 'check_circle';
    defaultLabel = 'VERY HIGH CREDIBILITY';
  } else if (normalizedLabel.includes('HIGH CREDIBILITY') || verdict === 'MOSTLY_CREDIBLE') {
    colorClasses = 'bg-[#ecfdf5] text-[#065f46] border-[#6ee7b7]';
    iconName = 'check_circle';
    defaultLabel = 'HIGH CREDIBILITY';
  } else if (normalizedLabel.includes('MODERATE')) {
    colorClasses = 'bg-blue-50 text-blue-900 border-blue-200';
    iconName = 'info';
    defaultLabel = 'MODERATE CREDIBILITY';
  } else if (
    normalizedLabel.includes('CONFLICTING') ||
    normalizedLabel.includes('LOW / CONFLICTING')
  ) {
    colorClasses = 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]';
    iconName = 'sync_problem';
    defaultLabel = 'CONFLICTING EVIDENCE';
  } else if (normalizedLabel.includes('THEOLOGICAL') || normalizedLabel.includes('BELIEF')) {
    colorClasses = 'bg-purple-50 text-purple-900 border-purple-200';
    iconName = 'auto_awesome';
    defaultLabel = 'THEOLOGICAL CLAIM';
  } else if (normalizedLabel.includes('OPINION')) {
    colorClasses = 'bg-slate-100 text-slate-900 border-slate-300';
    iconName = 'rate_review';
    defaultLabel = 'SUBJECTIVE OPINION';
  } else if (normalizedLabel.includes('PREDICTION')) {
    colorClasses = 'bg-indigo-50 text-indigo-900 border-indigo-200';
    iconName = 'online_prediction';
    defaultLabel = 'FUTURE PREDICTION';
  } else if (normalizedLabel.includes('LIMITED EVIDENCE')) {
    colorClasses = 'bg-surface-container-high text-on-surface border-outline';
    iconName = 'search_off';
    defaultLabel = 'LIMITED EVIDENCE';
  } else if (normalizedLabel.includes('VERY LOW') || verdict === 'LIKELY_MISLEADING') {
    colorClasses = 'bg-[#fff1f2] text-[#9f1239] border-[#fda4af]';
    iconName = 'error';
    defaultLabel = 'VERY LOW CREDIBILITY';
  } else if (
    normalizedLabel.includes('EXTREMELY LOW') ||
    verdict === 'PROBABLY_FALSE' ||
    verdict === 'HIGHLY_SUSPICIOUS'
  ) {
    colorClasses = 'bg-error-container text-on-error-container border-[#ffb4ab]';
    iconName = 'cancel';
    defaultLabel = 'EXTREMELY LOW CREDIBILITY';
  } else {
    colorClasses = 'bg-surface-container-high text-on-surface border-outline';
    iconName = 'help';
    defaultLabel = 'NEEDS VERIFICATION';
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
