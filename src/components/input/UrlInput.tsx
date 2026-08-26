import React from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  value,
  onChange,
  onClear,
  disabled = false,
}) => {
  return (
    <div className="relative w-full">
      <div className="flex items-center bg-zinc-50/70 border border-zinc-200 rounded-xl p-2.5 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all">
        <span className="material-symbols-outlined text-zinc-400 ml-2 mr-2.5 text-xl select-none">
          link
        </span>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://example.com/news/article-headline"
          className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 text-sm md:text-base text-zinc-900 placeholder-zinc-400 p-1 h-9 w-full"
          aria-label="Article URL input"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            title="Clear URL"
            aria-label="Clear URL input"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>
    </div>
  );
};
