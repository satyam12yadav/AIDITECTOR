import React, { useState } from 'react';
import { AnalysisInputMode } from '../../types/analysis';
import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';
import { AnalyzeButton } from './AnalyzeButton';

interface ArticleInputSectionProps {
  onAnalyze: (payload: { mode: AnalysisInputMode; value: string; selectedPresetIdx?: number }) => void;
  isLoading?: boolean;
}

const quickClaims = [
  { label: 'Cricket Captaincy', text: "Suryakumar Yadav is currently India's T20I captain." },
  { label: 'Six Continents', text: "Earth has six continents." },
  { label: 'Germany Capital', text: "The capital of Germany is Paris." },
  { label: 'Water Boiling Point', text: "Water boils at 100 degrees Celsius." },
  { label: 'Ram Mandir', text: "Ram Mandir is located in Ayodhya, Uttar Pradesh, India." },
];

export const ArticleInputSection: React.FC<ArticleInputSectionProps> = ({
  onAnalyze,
  isLoading = false,
}) => {
  const [mode, setMode] = useState<AnalysisInputMode>('text');
  const [urlValue, setUrlValue] = useState<string>('https://www.thehindu.com/news/national/');
  const [textValue, setTextValue] = useState<string>("Suryakumar Yadav is currently India's T20I captain.");
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const currentValue = mode === 'url' ? urlValue : textValue;
  const isInputValid = currentValue.trim().length > 0;

  const handleQuickClaim = (claimText: string, idx: number) => {
    setSelectedIdx(idx);
    setMode('text');
    setTextValue(claimText);
  };

  const handleSubmit = () => {
    if (!isInputValid) return;
    onAnalyze({
      mode,
      value: currentValue,
      selectedPresetIdx: selectedIdx,
    });
  };

  return (
    <div className="w-full bg-white border border-zinc-200 p-6 md:p-8 rounded-2xl flex flex-col space-y-6 shadow-sm hover:shadow-md transition-all">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div className="flex items-center space-x-2 bg-zinc-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'text'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Claim / Text</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'url'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            <span>Article URL</span>
          </button>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          Local BERT + Live RAG
        </span>
      </div>

      {/* Quick Test Claim Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400 font-medium">
          Quick test:
        </span>
        {quickClaims.map((item, idx) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleQuickClaim(item.text, idx)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${
              mode === 'text' && textValue === item.text
                ? 'bg-zinc-900 text-white border-zinc-900 font-medium shadow-sm'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Input Mode Component */}
      <div className="w-full">
        {mode === 'url' ? (
          <UrlInput
            value={urlValue}
            onChange={setUrlValue}
            onClear={() => setUrlValue('')}
            disabled={isLoading}
          />
        ) : (
          <TextInput
            value={textValue}
            onChange={setTextValue}
            onClear={() => setTextValue('')}
            disabled={isLoading}
          />
        )}
      </div>

      {/* Submit Action */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-2 border-t border-zinc-100">
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
          <span>Automatic claim extraction and evidence corroboration</span>
        </div>

        <AnalyzeButton
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!isInputValid}
        />
      </div>
    </div>
  );
};
