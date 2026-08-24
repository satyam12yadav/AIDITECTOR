import React from 'react';
import { AnalysisResult, AnalysisStatus } from '../../types/analysis';
import {
  mockResultCredible,
  mockResultDebunked,
  mockResultSensationalized,
} from '../../mocks/mockAnalysisData';

interface DemoControlBarProps {
  currentStatus: AnalysisStatus;
  onSelectState: (status: AnalysisStatus, mockResult?: AnalysisResult) => void;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  currentStatus,
  onSelectState,
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 no-print max-w-[95vw]">
      <div className="bg-primary text-on-primary border border-outline-variant px-3 py-2 md:px-4 md:py-2.5 rounded-full shadow-2xl flex items-center space-x-1.5 md:space-x-2 text-xs font-label-code overflow-x-auto">
        <span className="hidden sm:inline font-bold text-outline-variant text-[11px] uppercase tracking-wider pl-1 pr-2 border-r border-neutral-700">
          Demo Mock Controls:
        </span>

        <button
          onClick={() => onSelectState('idle')}
          className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
            currentStatus === 'idle'
              ? 'bg-on-primary text-primary font-bold shadow'
              : 'hover:bg-neutral-800 text-neutral-300'
          }`}
        >
          Landing View
        </button>

        <button
          onClick={() => onSelectState('loading')}
          className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
            currentStatus === 'loading'
              ? 'bg-on-primary text-primary font-bold shadow'
              : 'hover:bg-neutral-800 text-neutral-300'
          }`}
        >
          Loading State
        </button>

        <button
          onClick={() => onSelectState('results', mockResultCredible)}
          className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
            currentStatus === 'results'
              ? 'bg-emerald-soft text-primary font-bold shadow'
              : 'hover:bg-neutral-800 text-neutral-300'
          }`}
        >
          Credible (78%)
        </button>

        <button
          onClick={() => onSelectState('results', mockResultSensationalized)}
          className="px-2.5 py-1 rounded-full hover:bg-neutral-800 text-neutral-300 transition-all whitespace-nowrap"
        >
          Sensationalized (64%)
        </button>

        <button
          onClick={() => onSelectState('results', mockResultDebunked)}
          className="px-2.5 py-1 rounded-full hover:bg-neutral-800 text-neutral-300 transition-all whitespace-nowrap"
        >
          Debunked (24%)
        </button>

        <button
          onClick={() => onSelectState('error')}
          className={`px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
            currentStatus === 'error'
              ? 'bg-error text-on-error font-bold shadow'
              : 'hover:bg-neutral-800 text-neutral-300'
          }`}
        >
          Error (404)
        </button>
      </div>
    </div>
  );
};
