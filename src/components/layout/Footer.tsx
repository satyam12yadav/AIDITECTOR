import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-zinc-200 text-zinc-500 text-xs w-full py-8 px-4 md:px-8 mt-auto no-print">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-800">AIDetector</span>
          <span>·</span>
          <span>Powered by Local BERT Transformer & Multi-Source Evidence Engine</span>
        </div>
        <div className="flex items-center gap-6 text-zinc-500">
          <span className="hover:text-zinc-900 transition-colors cursor-pointer">Methodology</span>
          <span className="hover:text-zinc-900 transition-colors cursor-pointer">Fact-Check Standards</span>
          <span className="hover:text-zinc-900 transition-colors cursor-pointer">API</span>
        </div>
      </div>
    </footer>
  );
};
