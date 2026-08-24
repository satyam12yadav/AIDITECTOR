import React, { useState } from 'react';
import { ActiveResultsTab, AnalysisResult } from '../../types/analysis';
import { CredibilityScore } from './CredibilityScore';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ClaimCard } from './ClaimCard';
import { ArticleInfo } from './ArticleInfo';
import { Limitations } from './Limitations';
import { Disclaimer } from './Disclaimer';
import { ForensicReportView } from './ForensicReportView';
import { SourceCard } from './SourceCard';

interface ResultsPageProps {
  result: AnalysisResult;
  onNewAnalysis: () => void;
  activeTab?: ActiveResultsTab;
  onTabChange?: (tab: ActiveResultsTab) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  result,
  onNewAnalysis,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<ActiveResultsTab>('overview');
  const [claimFilter, setClaimFilter] = useState<'all' | 'contradicted' | 'supported' | 'unverified'>('all');

  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = (tab: ActiveResultsTab) => {
    if (externalOnTabChange) {
      externalOnTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const filteredClaims = result.claims.filter((c) => {
    if (claimFilter === 'all') return true;
    return c.status === claimFilter;
  });

  return (
    <div className="flex-1 w-full px-4 md:px-margin-desktop max-w-container-max mx-auto py-8">
      {/* Top Banner Header */}
      <div className="mb-8 border-b border-outline-variant pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-label-caps text-xs text-outline uppercase tracking-wider font-bold">
              VERITAS FORENSIC DOSSIER
            </span>
            <span className="text-outline">·</span>
            <span className="font-mono text-xs text-primary font-semibold">{result.id}</span>
          </div>

          <h2 className="font-headline-lg-mobile lg:font-headline-lg text-2xl md:text-3xl text-primary font-bold tracking-tight">
            Analysis Report: {result.id}
          </h2>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3">
            <span className="font-label-code text-xs text-on-surface-variant bg-surface-container py-1 px-2.5 rounded border border-outline-variant">
              GENERATED: {result.analyzedAt}
            </span>
            {result.sourceUrl && (
              <span className="font-label-code text-xs text-on-surface-variant bg-surface-container py-1 px-2.5 rounded border border-outline-variant flex items-center max-w-xs md:max-w-md truncate">
                <span className="material-symbols-outlined text-[14px] mr-1">link</span>
                {result.sourceUrl}
              </span>
            )}
            <span className="font-label-code text-xs text-on-surface-variant bg-surface-container py-1 px-2.5 rounded border border-outline-variant">
              CLAIMS EXTRACTED: {result.totalClaimsIdentified}
            </span>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onNewAnalysis}
            className="px-4 py-2 border border-outline-variant rounded font-label-caps text-xs text-primary hover:bg-surface-variant transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Verification
          </button>
        </div>
      </div>

      {/* Sub-view Navigation Tabs */}
      <div className="flex border-b border-outline-variant mb-8 space-x-2 md:space-x-4 no-print overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs md:text-sm font-label-caps uppercase font-bold tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">speed</span>
          Overview & Diagnostic Scores
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`py-3 px-4 text-xs md:text-sm font-label-caps uppercase font-bold tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'claims'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">fact_check</span>
          Claim Breakdown ({result.claims.length})
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`py-3 px-4 text-xs md:text-sm font-label-caps uppercase font-bold tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'report'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">description</span>
          Full Forensic Report
        </button>
      </div>

      {/* View Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* 1. Main Grid: Credibility Gauge + 5-Pillar Score Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-7 flex">
              <CredibilityScore
                score={result.credibilityScore}
                confidenceLevel={result.confidenceLevel}
                verdict={result.verdict}
                verdictLabel={result.verdictLabel}
              />
            </div>
            <div className="lg:col-span-5 flex">
              <ScoreBreakdown diagnostics={result.diagnostics} />
            </div>
          </div>

          {/* 2. "Why This Score?" Explanation & Article Information */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 md:p-6 shadow-subtle flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
                    <h3 className="font-headline-md text-base md:text-lg font-bold text-on-surface">
                      Why this Score?
                    </h3>
                  </div>

                  <p className="font-body-md text-xs md:text-sm text-on-surface-variant leading-relaxed">
                    {result.summary ||
                      (result.executiveSummary && result.executiveSummary[0]) ||
                      'The overall credibility assessment is synthesized deterministically from corroborating evidence, independent wire consensus, and source reliability.'}
                  </p>
                </div>

                {result.limitations && result.limitations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-outline-variant/60">
                    <Limitations limitations={result.limitations} />
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 flex">
              <div className="w-full">
                <ArticleInfo
                  title={result.title}
                  publisher={result.publisher}
                  author={result.author}
                  publishedAt={result.analyzedAt}
                  url={result.sourceUrl}
                  wordCount={result.wordCount}
                />
              </div>
            </div>
          </div>

          {/* 3. Key Claims Preview */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-base md:text-lg text-primary font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-outline">fact_check</span>
                Key Claims & Verified Evidence ({result.claims.length})
              </h3>
              <button
                onClick={() => setActiveTab('claims')}
                className="font-label-code text-xs text-primary underline hover:text-secondary font-semibold"
              >
                View Full Breakdown ({result.claims.length} Claims) →
              </button>
            </div>

            <div className="space-y-4">
              {result.claims.slice(0, 3).map((claim) => (
                <ClaimCard key={claim.id} claim={claim} defaultExpanded={true} />
              ))}
            </div>
          </div>

          {/* 4. Institutional Source Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pt-2">
            <div className="lg:col-span-12">
              <SourceCard source={result.sourceProfile} />
            </div>
          </div>

          {/* 5. Forensic Disclaimer */}
          <div className="pt-2">
            <Disclaimer />
          </div>
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low p-4 rounded border border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="font-label-code text-xs text-outline uppercase font-semibold">
                Filter Claims:
              </span>
              <button
                onClick={() => setClaimFilter('all')}
                className={`font-label-code text-xs px-3 py-1 rounded border transition-colors ${
                  claimFilter === 'all'
                    ? 'bg-primary text-on-primary border-primary font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-outline'
                }`}
              >
                All ({result.claims.length})
              </button>
              <button
                onClick={() => setClaimFilter('supported')}
                className={`font-label-code text-xs px-3 py-1 rounded border transition-colors ${
                  claimFilter === 'supported'
                    ? 'bg-secondary-container text-on-secondary-container border-secondary font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-outline'
                }`}
              >
                Supported
              </button>
              <button
                onClick={() => setClaimFilter('contradicted')}
                className={`font-label-code text-xs px-3 py-1 rounded border transition-colors ${
                  claimFilter === 'contradicted'
                    ? 'bg-error-container text-on-error-container border-error font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-outline'
                }`}
              >
                Contradicted
              </button>
              <button
                onClick={() => setClaimFilter('unverified')}
                className={`font-label-code text-xs px-3 py-1 rounded border transition-colors ${
                  claimFilter === 'unverified'
                    ? 'bg-surface-container-highest text-on-surface-variant border-outline font-bold'
                    : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:border-outline'
                }`}
              >
                Unverified
              </button>
            </div>
            <div className="font-label-code text-xs text-outline">
              Showing {filteredClaims.length} of {result.claims.length} assertions
            </div>
          </div>

          {/* Claims List */}
          {filteredClaims.length > 0 ? (
            <div className="flex flex-col gap-6">
              {filteredClaims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} defaultExpanded={true} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-10 text-center flex flex-col items-center justify-center shadow-subtle">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4">
                <span className="material-symbols-outlined text-2xl">content_paste_search</span>
              </div>
              <h4 className="font-headline-md text-base font-bold text-on-surface mb-1">
                No Claims Found in Selected Filter
              </h4>
              <p className="font-body-sm text-xs md:text-sm text-on-surface-variant max-w-md">
                Try selecting "All ({result.claims.length})" to view all extracted assertions.
              </p>
            </div>
          )}

          <div className="pt-4">
            <Disclaimer />
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="animate-fadeIn space-y-6">
          <ForensicReportView result={result} />
          <Disclaimer />
        </div>
      )}
    </div>
  );
};
