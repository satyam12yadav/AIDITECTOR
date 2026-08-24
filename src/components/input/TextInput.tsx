import React from 'react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onClear,
  disabled = false,
}) => {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  return (
    <div className="relative w-full flex flex-col space-y-2">
      <div className="bg-background border border-outline-variant rounded p-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={6}
          placeholder="Paste full article text, statement transcript, or press release here for claim decomposition..."
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm md:text-base font-body-base text-primary placeholder-outline resize-y min-h-[140px]"
          aria-label="Article text content"
        />
      </div>

      <div className="flex justify-between items-center text-xs font-label-code text-on-surface-variant px-1">
        <div className="flex space-x-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        {value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-outline hover:text-error transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            Clear text
          </button>
        )}
      </div>
    </div>
  );
};
