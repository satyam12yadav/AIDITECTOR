import React from 'react';

interface HeaderProps {
  onNewAnalysis?: () => void;
  currentStatus?: string;
}

export const Header: React.FC<HeaderProps> = ({ onNewAnalysis, currentStatus = 'Local AI Ready' }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md text-zinc-900 border-b border-zinc-200/80 w-full sticky top-0 z-40">
      <div className="flex justify-between items-center w-full px-4 md:px-8 max-w-6xl mx-auto h-16">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={onNewAnalysis}>
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight text-zinc-900 flex items-center gap-1.5">
              AIDetector <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">v1.0</span>
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm">
          <button 
            onClick={onNewAnalysis}
            className="text-zinc-900 font-medium hover:text-zinc-600 transition-colors"
          >
            Fact Checker
          </button>
          <a href="#how-it-works" className="text-zinc-500 hover:text-zinc-900 transition-colors">
            How It Works
          </a>
          <a href="#sources" className="text-zinc-500 hover:text-zinc-900 transition-colors">
            Sources
          </a>
        </nav>

        {/* Right Status & Action */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 font-mono text-xs text-emerald-800 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{currentStatus}</span>
          </div>

          <button
            onClick={onNewAnalysis}
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-all active:scale-95 shadow-sm flex items-center space-x-1.5"
            aria-label="Start new verification"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New Check</span>
          </button>
        </div>
      </div>
    </header>
  );
};
