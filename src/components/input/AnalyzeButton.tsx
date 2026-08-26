import React from 'react';

interface AnalyzeButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm ${
        disabled
          ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200'
          : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] cursor-pointer'
      }`}
      aria-label="Check Credibility"
    >
      {isLoading ? (
        <>
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span>Checking Evidence...</span>
        </>
      ) : (
        <>
          <span>Check Credibility</span>
          <span className="material-symbols-outlined text-[18px]">search</span>
        </>
      )}
    </button>
  );
};
