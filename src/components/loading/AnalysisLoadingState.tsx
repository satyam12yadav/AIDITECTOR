import React, { useEffect, useState } from 'react';
import { LoadingStep } from '../../types/analysis';

interface AnalysisLoadingStateProps {
  onCancel: () => void;
  onComplete?: () => void;
  targetInputText?: string;
}

const pipelineSteps: LoadingStep[] = [
  {
    id: 1,
    title: 'Article Extracted',
    description: 'Retrieving canonical metadata, publisher domain, and full text body...',
    status: 'completed',
  },
  {
    id: 2,
    title: 'Claims Identified',
    description: 'Decomposing factual assertions and isolating verifiable claims...',
    status: 'active',
  },
  {
    id: 3,
    title: 'Retrieving Evidence',
    description: 'Querying external knowledge repositories, news wires, and fact-checking indices...',
    status: 'pending',
  },
  {
    id: 4,
    title: 'Verifying Claims',
    description: 'Evaluating corroboration, contradiction markers, and cross-source consensus...',
    status: 'pending',
  },
  {
    id: 5,
    title: 'Calculating Credibility',
    description: 'Computing 5-pillar mathematical score and compiling limitations...',
    status: 'pending',
  },
];

export const AnalysisLoadingState: React.FC<AnalysisLoadingStateProps> = ({
  onCancel,
  targetInputText,
}) => {
  const [steps, setSteps] = useState<LoadingStep[]>(pipelineSteps);

  useEffect(() => {
    // Dynamic progressive animation while real backend HTTP request is in-flight
    const timer1 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((step) => {
          if (step.id === 1) return { ...step, status: 'completed' };
          if (step.id === 2) return { ...step, status: 'completed' };
          if (step.id === 3) return { ...step, status: 'active' };
          return step;
        })
      );
    }, 1000);

    const timer2 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((step) => {
          if (step.id <= 3) return { ...step, status: 'completed' };
          if (step.id === 4) return { ...step, status: 'active' };
          return step;
        })
      );
    }, 2200);

    const timer3 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((step) => {
          if (step.id <= 4) return { ...step, status: 'completed' };
          if (step.id === 5) return { ...step, status: 'active' };
          return step;
        })
      );
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="w-full flex-grow flex items-center justify-center p-4 md:p-margin-desktop relative overflow-hidden py-12">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-1/4 left-1/4 w-80 md:w-96 h-80 md:h-96 bg-primary-container rounded-full blur-[100px] animate-pulse-fast"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-80 md:w-96 h-80 md:h-96 bg-secondary-container rounded-full blur-[100px] animate-pulse-fast"
          style={{ animationDelay: '0.6s' }}
        ></div>
      </div>

      {/* Main Glass Panel */}
      <div className="w-full max-w-[620px] glass-panel rounded-xl shadow-ambient p-6 md:p-10 relative z-10 border border-outline-variant bg-surface-container-lowest/90">
        {/* Header Indicator */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-surface-container mx-auto mb-4 flex items-center justify-center border border-outline-variant">
            <span className="material-symbols-outlined text-3xl text-primary fill animate-spin">
              progress_activity
            </span>
          </div>
          <h2 className="font-headline-md text-xl md:text-2xl text-on-surface font-bold mb-2">
            Forensic Analysis in Progress
          </h2>
          <p className="font-body-sm text-xs md:text-sm text-on-surface-variant max-w-md mx-auto">
            Extracting claims, cross-referencing independent evidence indices, and synthesizing the deterministic credibility score.
          </p>
          {targetInputText && (
            <div className="mt-3 inline-block max-w-sm truncate text-xs font-mono bg-surface-container-low px-3 py-1 rounded border border-outline-variant text-outline">
              Target: {targetInputText}
            </div>
          )}
        </div>

        {/* Stepper Progression */}
        <div className="space-y-5 relative pl-2">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.id} className="flex items-start group relative">
                {/* Connecting Line */}
                {!isLast && (
                  <div
                    className={`step-line ${
                      isCompleted ? 'active bg-primary' : 'bg-surface-container-high'
                    }`}
                  />
                )}

                {/* Step Circle Indicator */}
                <div className="step-indicator flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 mr-4 relative">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-primary">
                      <span className="material-symbols-outlined text-on-primary text-[14px] font-bold">
                        check
                      </span>
                    </div>
                  ) : isActive ? (
                    <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center border-2 border-primary relative">
                      <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center border-2 border-outline-variant">
                      <div className="w-1.5 h-1.5 rounded-full bg-outline-variant"></div>
                    </div>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-label-caps text-xs md:text-sm uppercase tracking-wider font-bold mb-0.5 ${
                        isCompleted
                          ? 'text-on-surface'
                          : isActive
                          ? 'text-primary font-bold'
                          : 'text-outline'
                      }`}
                    >
                      {step.title}
                    </h3>
                    {isCompleted && (
                      <span className="text-[10px] font-mono text-[#065f46] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0] font-bold">
                        ✓ DONE
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] font-mono text-primary bg-surface-container px-2 py-0.5 rounded border border-outline animate-pulse font-bold">
                        ⏳ IN PROGRESS
                      </span>
                    )}
                  </div>
                  <p
                    className={`font-label-code text-xs ${
                      isActive
                        ? 'text-on-surface font-medium'
                        : isCompleted
                        ? 'text-on-surface-variant'
                        : 'text-outline-variant'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancel Action */}
        <div className="mt-8 text-center pt-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-outline-variant rounded hover:bg-surface-variant hover:border-outline transition-colors text-on-surface-variant font-label-caps text-xs uppercase font-bold tracking-wider"
          >
            Cancel Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
