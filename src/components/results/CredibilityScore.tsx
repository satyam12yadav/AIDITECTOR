import React from 'react';
import { VerdictType } from '../../types/analysis';
import { VerdictBadge } from './VerdictBadge';

interface CredibilityScoreProps {
  score: number;
  confidenceLevel: number;
  verdict: VerdictType;
  verdictLabel: string;
}

export const CredibilityScore: React.FC<CredibilityScoreProps> = ({
  score,
  confidenceLevel,
  verdict,
  verdictLabel,
}) => {
  // Determine stroke color from score tier
  const strokeColor =
    score >= 70
      ? '#34d399' // Emerald
      : score >= 45
      ? '#f59e0b' // Amber
      : '#ba1a1a'; // Crimson / Error

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 md:p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-subtle w-full">
      {/* Top Tag */}
      <div className="absolute top-4 right-4 bg-surface-container-high py-1 px-3 rounded border border-outline-variant">
        <span className="font-label-caps text-xs text-on-surface-variant flex items-center gap-1.5 uppercase font-bold">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          Final Assessment
        </span>
      </div>

      {/* Circular Gauge */}
      <div className="w-56 h-56 md:w-64 md:h-64 relative mb-6 flex items-center justify-center">
        <svg className="circular-chart w-full h-full" style={{ stroke: strokeColor }} viewBox="0 0 36 36">
          <path
            className="circle-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="circle"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            strokeDasharray={`${score}, 100`}
          />
          <text className="percentage" x="18" y="20.35">
            {score}
          </text>
          <text
            fill="#76777d"
            fontFamily="'Inter', sans-serif"
            fontSize="0.16em"
            textAnchor="middle"
            x="18"
            y="25.5"
            fontWeight="500"
          >
            / 100
          </text>
        </svg>
      </div>

      {/* Verdict and Confidence */}
      <div className="text-center flex flex-col items-center space-y-3">
        <VerdictBadge verdict={verdict} label={verdictLabel} size="lg" />

        <div className="font-body-sm text-xs md:text-sm text-on-surface-variant flex items-center justify-center gap-1.5 font-label-code">
          <span
            className="material-symbols-outlined text-[16px] fill"
            style={{ color: strokeColor }}
          >
            check_circle
          </span>
          <span>{confidenceLevel}% Forensic Confidence Level</span>
        </div>
      </div>
    </div>
  );
};
