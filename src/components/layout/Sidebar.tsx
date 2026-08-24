import React from 'react';
import { ActiveResultsTab } from '../../types/analysis';

interface SidebarProps {
  activeTab: ActiveResultsTab;
  onTabChange: (tab: ActiveResultsTab) => void;
  onNewAnalysis: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewAnalysis,
}) => {
  return (
    <aside className="bg-surface-container-low hidden lg:flex flex-col h-screen sticky top-0 w-64 border-r border-outline-variant shrink-0 select-none">
      {/* Brand & Action */}
      <div className="p-6 border-b border-outline-variant flex flex-col gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-xs">
            FNK
          </div>
          <span className="font-headline-md text-lg font-bold text-primary tracking-tight">
            Veritas Forensic
          </span>
        </div>

        <button
          onClick={onNewAnalysis}
          className="bg-primary text-on-primary font-label-caps text-xs py-2.5 px-4 rounded w-full flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors uppercase tracking-wider font-bold"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Analysis
        </button>
      </div>

      {/* Investigator Badge */}
      <div className="p-4 border-b border-outline-variant flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 font-bold text-xs text-primary">
          <span className="material-symbols-outlined text-primary text-xl">shield_person</span>
        </div>
        <div>
          <div className="font-label-caps text-xs font-bold text-on-surface">Investigator</div>
          <div className="font-label-code text-[11px] text-on-surface-variant">Institutional Mode</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        <button
          onClick={() => onTabChange('overview')}
          className={`px-4 py-3 flex items-center gap-3 text-xs uppercase font-bold tracking-wider rounded transition-all text-left ${
            activeTab === 'overview'
              ? 'bg-primary-container text-on-primary-container border-l-4 border-primary shadow-subtle'
              : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-l-4 border-transparent'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${activeTab === 'overview' ? 'fill' : ''}`}>
            speed
          </span>
          Overview & Metrics
        </button>

        <button
          onClick={() => onTabChange('claims')}
          className={`px-4 py-3 flex items-center gap-3 text-xs uppercase font-bold tracking-wider rounded transition-all text-left ${
            activeTab === 'claims'
              ? 'bg-primary-container text-on-primary-container border-l-4 border-primary shadow-subtle'
              : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-l-4 border-transparent'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${activeTab === 'claims' ? 'fill' : ''}`}>
            fact_check
          </span>
          Claim Breakdown
        </button>

        <button
          onClick={() => onTabChange('report')}
          className={`px-4 py-3 flex items-center gap-3 text-xs uppercase font-bold tracking-wider rounded transition-all text-left ${
            activeTab === 'report'
              ? 'bg-primary-container text-on-primary-container border-l-4 border-primary shadow-subtle'
              : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface border-l-4 border-transparent'
          }`}
        >
          <span className={`material-symbols-outlined text-[20px] ${activeTab === 'report' ? 'fill' : ''}`}>
            description
          </span>
          Forensic Report
        </button>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-outline-variant text-[11px] font-label-code text-outline flex items-center justify-between">
        <span>VERITAS ENGINE v2.4</span>
        <span className="w-2 h-2 rounded-full bg-emerald-soft"></span>
      </div>
    </aside>
  );
};
