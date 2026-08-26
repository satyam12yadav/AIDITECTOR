import React from 'react';
import { AnalysisInputMode } from '../../types/analysis';
import { ArticleInputSection } from '../input/ArticleInputSection';

interface LandingPageProps {
  onAnalyze: (payload: { mode: AnalysisInputMode; value: string; selectedPresetIdx?: number }) => void;
  isLoading?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAnalyze, isLoading = false }) => {
  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-3xl flex flex-col items-center text-center space-y-6 pt-12 md:pt-20 pb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-zinc-200 bg-white text-zinc-600 text-xs font-medium shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Local BERT Neural Engine & Live Evidence Retrieval</span>
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl text-zinc-900 font-extrabold tracking-tight leading-tight">
          Verify Any Claim or News Story <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 bg-clip-text text-transparent">in Seconds</span>
        </h1>

        <p className="text-sm md:text-base lg:text-lg text-zinc-600 max-w-xl leading-relaxed">
          Instantly evaluate claim credibility with in-process transformer classification, semantic stance detection, and live source evidence cross-referencing.
        </p>

        {/* Input Card Container */}
        <div className="w-full mt-4">
          <ArticleInputSection onAnalyze={onAnalyze} isLoading={isLoading} />
        </div>
      </section>

      {/* Feature Grid */}
      <section id="how-it-works" className="w-full max-w-5xl flex flex-col space-y-8 pt-16 border-t border-zinc-200/80 pb-20 mt-8">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2 tracking-tight">
            How AIDetector Works
          </h2>
          <p className="text-sm text-zinc-500">
            A transparent, evidence-grounded approach to truth and credibility determination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex flex-col h-full shadow-sm hover:shadow-md hover:border-zinc-300 transition-all">
            <div className="w-10 h-10 bg-zinc-100 text-zinc-900 rounded-xl mb-4 flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">
              Local BERT Model
            </h3>
            <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
              Runs in-process sequence classification on device using fine-tuned BERT weights in ~5ms without cloud API latency.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex flex-col h-full shadow-sm hover:shadow-md hover:border-zinc-300 transition-all">
            <div className="w-10 h-10 bg-zinc-100 text-zinc-900 rounded-xl mb-4 flex items-center justify-center font-bold text-lg">
              🔍
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">
              Live Source Retrieval
            </h3>
            <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
              Extracts core factual propositions and queries accredited news publishers and fact-checkers for ground-truth evidence.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-zinc-200 p-6 rounded-2xl flex flex-col h-full shadow-sm hover:shadow-md hover:border-zinc-300 transition-all">
            <div className="w-10 h-10 bg-zinc-100 text-zinc-900 rounded-xl mb-4 flex items-center justify-center font-bold text-lg">
              🎯
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">
              Semantic Stance Engine
            </h3>
            <p className="text-xs md:text-sm text-zinc-600 leading-relaxed">
              Compares evidence against claims using Natural Language Inference (NLI) to reliably detect support and contradiction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
