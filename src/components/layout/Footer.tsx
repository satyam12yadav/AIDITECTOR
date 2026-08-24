import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-container-highest text-on-surface-variant font-label-code text-xs border-t border-outline-variant w-full py-8 px-4 md:px-margin-desktop mt-auto no-print">
      <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="font-label-caps font-bold tracking-wider text-center md:text-left text-on-surface">
          © 2026 Fake News Killer · Forensic Intelligence & Verification Protocol
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-on-surface-variant">
          <span className="hover:text-primary transition-colors cursor-pointer">
            Privacy Policy
          </span>
          <span className="hover:text-primary transition-colors cursor-pointer">
            Terms of Service
          </span>
          <span className="hover:text-primary transition-colors cursor-pointer">
            Verification Standards
          </span>
          <span className="hover:text-primary transition-colors cursor-pointer">
            API Documentation
          </span>
        </nav>
      </div>
    </footer>
  );
};
