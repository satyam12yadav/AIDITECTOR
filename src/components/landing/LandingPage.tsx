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
      <section className="w-full max-w-4xl flex flex-col items-center text-center space-y-6 pt-10 md:pt-16 pb-12">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant font-label-code text-xs uppercase tracking-wider shadow-subtle">
          <span className="w-2 h-2 rounded-full bg-emerald-soft animate-pulse"></span>
          <span>System Online · Institutional Protocol</span>
        </div>

        <h1 className="font-headline-lg-mobile md:font-headline-lg text-3xl md:text-5xl lg:text-6xl text-primary font-bold tracking-tight">
          AI vs. Misinformation
        </h1>

        <p className="font-body-base text-sm md:text-base lg:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
          Deploy forensic-level analysis to verify claims, trace sources, and detect synthetic media in real-time. Protect your organization's credibility with military-grade intelligence.
        </p>

        {/* Input Card */}
        <div className="w-full mt-8">
          <ArticleInputSection onAnalyze={onAnalyze} isLoading={isLoading} />
        </div>
      </section>

      {/* Bento Grid: The Information Integrity Crisis */}
      <section id="features" className="w-full max-w-container-max flex flex-col space-y-10 pt-16 border-t border-outline-variant pb-16">
        <div className="max-w-2xl text-left">
          <div className="font-label-caps text-xs text-outline uppercase tracking-wider font-bold mb-2">
            Forensic Capabilities
          </div>
          <h2 className="font-headline-md text-2xl md:text-3xl text-primary font-bold mb-3">
            The Information Integrity Crisis
          </h2>
          <p className="font-body-base text-sm md:text-base text-on-surface-variant leading-relaxed">
            Sophisticated disinformation campaigns and AI-generated content are eroding trust faster than human fact-checkers can respond. Manual verification is no longer sufficient to secure the information perimeter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg flex flex-col h-full hover:border-primary transition-colors shadow-subtle group">
            <div className="w-12 h-12 bg-surface-container mb-6 flex items-center justify-center rounded text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">save_as</span>
            </div>
            <h3 className="font-headline-md text-lg font-bold text-primary mb-3">
              Automated Claim Extraction
            </h3>
            <p className="font-body-sm text-xs md:text-sm text-on-surface-variant leading-relaxed mt-auto">
              Our NLP engine parses thousands of words per second, isolating specific factual assertions from opinion and rhetoric for targeted verification.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg flex flex-col h-full hover:border-primary transition-colors shadow-subtle group">
            <div className="w-12 h-12 bg-surface-container mb-6 flex items-center justify-center rounded text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <h3 className="font-headline-md text-lg font-bold text-primary mb-3">
              Source Reliability Analysis
            </h3>
            <p className="font-body-sm text-xs md:text-sm text-on-surface-variant leading-relaxed mt-auto">
              Evaluates historical credibility of domains, authors, and networks using a continuously updated global reputation index.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg flex flex-col h-full hover:border-primary transition-colors shadow-subtle group">
            <div className="w-12 h-12 bg-surface-container mb-6 flex items-center justify-center rounded text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">account_tree</span>
            </div>
            <h3 className="font-headline-md text-lg font-bold text-primary mb-3">
              Cross-Reference Evidence
            </h3>
            <p className="font-body-sm text-xs md:text-sm text-on-surface-variant leading-relaxed mt-auto">
              Corroborates isolated claims against trusted primary sources, academic databases, and verified institutional records globally.
            </p>
          </div>
        </div>
      </section>

      {/* Trust / Forensic Method Timeline */}
      <section id="standards" className="w-full max-w-container-max pt-12 border-t border-outline-variant pb-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="font-label-caps text-xs text-outline uppercase tracking-wider font-bold mb-2">
            Verification Protocol
          </div>
          <h2 className="font-headline-md text-2xl md:text-3xl text-primary font-bold mb-3">
            The Forensic Method
          </h2>
          <p className="font-body-base text-sm md:text-base text-on-surface-variant">
            A transparent, multi-layered approach to truth determination.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="flex flex-col space-y-4">
            {/* Step 1 */}
            <div className="flex items-start space-x-4 p-5 border-l-4 border-outline hover:border-primary transition-colors bg-surface-container-lowest rounded-r shadow-subtle">
              <div className="font-label-code text-xs text-outline font-bold mt-0.5">01</div>
              <div>
                <h4 className="font-headline-md text-base font-bold text-primary mb-1">
                  Lexical Decomposition
                </h4>
                <p className="font-body-sm text-xs md:text-sm text-on-surface-variant leading-relaxed">
                  Breaking down complex narratives into testable atomic claims and identifying rhetorical bias.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-4 p-5 border-l-4 border-primary bg-surface-container-low rounded-r shadow-subtle">
              <div className="font-label-code text-xs text-primary font-bold mt-0.5">02</div>
              <div>
                <h4 className="font-headline-md text-base font-bold text-primary mb-1">
                  Database Interrogation
                </h4>
                <p className="font-body-sm text-xs md:text-sm text-on-surface-variant leading-relaxed">
                  Querying authenticated institutional repositories and wire services for corroborating or conflicting evidence.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-4 p-5 border-l-4 border-outline hover:border-primary transition-colors bg-surface-container-lowest rounded-r shadow-subtle">
              <div className="font-label-code text-xs text-outline font-bold mt-0.5">03</div>
              <div>
                <h4 className="font-headline-md text-base font-bold text-primary mb-1">
                  Syntactic Integrity Check
                </h4>
                <p className="font-body-sm text-xs md:text-sm text-on-surface-variant leading-relaxed">
                  Analyzing structural patterns common in AI-generated, synthetic, or emotionally manipulative text.
                </p>
              </div>
            </div>
          </div>

          {/* Forensic Visual Panel */}
          <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-lg relative overflow-hidden h-80 md:h-96 flex items-center justify-center shadow-subtle">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-container to-surface-container-lowest opacity-60 pointer-events-none" />
            <div className="z-10 text-center flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-primary text-primary mb-4 bg-background shadow-subtle">
                <span className="material-symbols-outlined text-5xl">policy</span>
              </div>
              <div className="font-label-code text-xs md:text-sm text-primary uppercase tracking-widest font-bold">
                Verification Engine Active
              </div>
              <p className="font-label-code text-xs text-outline mt-1">
                Forensic Protocol Ready
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
