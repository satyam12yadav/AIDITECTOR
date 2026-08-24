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
      className={`px-8 py-3 rounded font-label-caps text-xs md:text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all ${
        disabled
          ? 'bg-surface-container-high text-outline cursor-not-allowed opacity-70 border border-outline-variant'
          : 'bg-primary text-on-primary hover:bg-neutral-800 active:scale-[0.99] shadow-subtle cursor-pointer'
      }`}
      aria-label="Analyze Article"
    >
      {isLoading ? (
        <>
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span>Analyzing Evidence...</span>
        </>
      ) : (
        <>
          <span>Analyze Article</span>
          <span className="material-symbols-outlined text-[18px]">troubleshoot</span>
        </>
      )}
    </button>
  );
};
