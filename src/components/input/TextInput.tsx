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
      <div className="bg-zinc-50/70 border border-zinc-200 rounded-xl p-3.5 focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={5}
          placeholder="Enter a claim, news excerpt, or full article text to verify..."
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm md:text-base text-zinc-900 placeholder-zinc-400 resize-y min-h-[120px] font-normal"
          aria-label="Article or claim text content"
        />
      </div>

      <div className="flex justify-between items-center text-xs text-zinc-400 px-1">
        <div className="flex space-x-3">
          <span>{wordCount} words</span>
          <span>·</span>
          <span>{charCount} characters</span>
        </div>
        {value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            className="text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-1 font-medium"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
