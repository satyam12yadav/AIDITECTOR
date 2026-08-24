import React from 'react';

interface LimitationsProps {
  limitations?: string[];
}

export const Limitations: React.FC<LimitationsProps> = ({ limitations }) => {
  if (!limitations || limitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-4 md:p-5 shadow-subtle">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#b45309] text-[18px]">info</span>
        <h4 className="font-label-caps text-xs text-[#92400e] font-bold uppercase tracking-wider">
          Verification Notes & Limitations ({limitations.length})
        </h4>
      </div>
      <ul className="space-y-1.5 mt-2">
        {limitations.map((limitation, idx) => (
          <li
            key={idx}
            className="font-body-sm text-xs text-[#78350f] flex items-start gap-2 leading-relaxed"
          >
            <span className="text-[#d97706] font-bold mt-0.5">•</span>
            <span>{limitation}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
