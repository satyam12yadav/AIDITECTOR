import React from 'react';

interface HeaderProps {
  onNewAnalysis?: () => void;
  currentStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({ onNewAnalysis, currentStatus = 'System Online' }) => {
  return (
    <header className="bg-background text-primary font-body-base border-b border-outline-variant w-full sticky top-0 z-40">
      <div className="flex justify-between items-center w-full px-4 md:px-margin-desktop max-w-container-max mx-auto h-16">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNewAnalysis}>
          <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-mono font-bold text-sm">
            FNK
          </div>
          <div>
            <div className="font-headline-md text-xl md:text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              Fake News Killer
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-sm">
          <button 
            onClick={onNewAnalysis}
            className="text-primary font-semibold hover:text-secondary transition-colors"
          >
            Dashboard
          </button>
          <a href="#features" className="text-on-surface-variant hover:text-primary transition-colors">
            Methodology
          </a>
          <a href="#standards" className="text-on-surface-variant hover:text-primary transition-colors">
            Forensic Standards
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:inline-flex items-center space-x-2 px-2.5 py-1 rounded border border-outline-variant bg-surface-container-low font-label-code text-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-emerald-soft animate-pulse"></span>
            <span>{currentStatus}</span>
          </div>

          <button
            onClick={onNewAnalysis}
            className="bg-primary text-on-primary px-4 md:px-5 py-2 rounded text-xs font-bold tracking-wider uppercase hover:bg-neutral-800 transition-colors active:opacity-80 flex items-center space-x-1.5"
            aria-label="Start new article verification"
          >
            <span className="material-symbols-outlined text-[16px]">troubleshoot</span>
            <span>Verify Now</span>
          </button>
        </div>
      </div>
    </header>
  );
};
