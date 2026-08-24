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
      <div className="flex items-center bg-background border border-outline-variant rounded p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        <span className="material-symbols-outlined text-outline ml-2 mr-3 text-xl select-none">
          link
        </span>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://example.com/article/investigation-report..."
          className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 text-sm md:text-base font-body-base text-primary placeholder-outline p-1 h-10 w-full"
          aria-label="Target article URL"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-outline hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors"
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
