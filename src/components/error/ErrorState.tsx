import React, { useState } from 'react';
import { ErrorDetails } from '../../types/analysis';

interface ErrorStateProps {
  error: ErrorDetails;
  onRetry: () => void;
  onSwitchToText: () => void;
  onBackToHome: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onSwitchToText,
  onBackToHome,
}) => {
  const [isLogExpanded, setIsLogExpanded] = useState<boolean>(false);

  return (
    <div className="flex-grow flex items-center justify-center p-4 md:p-margin-desktop py-16">
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        {/* Forensic Broken Icon Visual */}
        <div className="relative mb-8 w-28 h-28 md:w-32 md:h-32 flex items-center justify-center rounded-full bg-surface-container-low border border-outline-variant shadow-subtle">
          <span
            className="material-symbols-outlined text-outline"
            style={{ fontSize: '56px', fontVariationSettings: "'wght' 200" }}
          >
            search_off
          </span>
          {/* Abstract broken line overlay */}
          <div
            className="absolute inset-0 border border-error/40 opacity-40 rounded-full"
            style={{ clipPath: 'polygon(0 0, 100% 100%, 100% 0, 0 100%)' }}
          />
        </div>

        {/* Error Title and Message */}
        <div className="inline-block px-3 py-1 bg-error-container/40 border border-error/20 rounded font-label-code text-xs text-error font-bold mb-3 uppercase tracking-wider">
          {error.errorCode}
        </div>

        <h1 className="font-headline-lg-mobile md:font-headline-lg text-2xl md:text-3xl text-on-background font-bold mb-3">
          {error.title}
        </h1>

        <p className="font-body-base text-sm md:text-base text-on-surface-variant max-w-md mx-auto mb-8 leading-relaxed">
          {error.message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-10">
          <button
            type="button"
            onClick={onSwitchToText}
            className="flex-1 sm:flex-none bg-primary text-on-primary font-label-caps text-xs md:text-sm py-3 px-8 rounded border border-primary hover:bg-neutral-800 transition-colors uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-subtle"
          >
            <span className="material-symbols-outlined text-[18px]">content_paste</span>
            Paste Text Directly
          </button>

          <button
            type="button"
            onClick={onRetry}
            className="flex-1 sm:flex-none bg-surface-container-lowest text-primary font-label-caps text-xs md:text-sm py-3 px-8 rounded border border-outline-variant hover:bg-surface-container-low transition-colors uppercase tracking-wider font-bold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Try Again
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="flex-1 sm:flex-none text-on-surface-variant hover:text-primary font-label-caps text-xs py-3 px-4 rounded transition-colors uppercase tracking-wider"
          >
            Return Home
          </button>
        </div>

        {/* Collapsible Diagnostics Log */}
        <div className="w-full max-w-lg text-left">
          <div className="border-t border-outline-variant pt-4">
            <button
              type="button"
              onClick={() => setIsLogExpanded(!isLogExpanded)}
              className="w-full font-label-code text-xs text-outline cursor-pointer flex justify-between items-center hover:text-on-surface-variant transition-colors uppercase tracking-wider font-bold"
            >
              <span>Forensic Diagnostics Log</span>
              <span
                className={`material-symbols-outlined text-[18px] transition-transform ${
                  isLogExpanded ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {isLogExpanded && (
              <div className="mt-3 p-4 bg-surface-container-highest rounded border border-outline-variant font-label-code text-xs text-on-surface-variant overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {error.diagnosticLog}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
