import React, { useState } from 'react';
import { AnalysisInputMode } from '../../types/analysis';
import { UrlInput } from './UrlInput';
import { TextInput } from './TextInput';
import { AnalyzeButton } from './AnalyzeButton';
import { sampleArticlePresets } from '../../mocks/mockAnalysisData';

interface ArticleInputSectionProps {
  onAnalyze: (payload: { mode: AnalysisInputMode; value: string; selectedPresetIdx?: number }) => void;
  isLoading?: boolean;
}

export const ArticleInputSection: React.FC<ArticleInputSectionProps> = ({
  onAnalyze,
  isLoading = false,
}) => {
  const [mode, setMode] = useState<AnalysisInputMode>('url');
  const [urlValue, setUrlValue] = useState<string>('https://financial-forensics.org/reports/2024/fiscal-projections-middle-class.html');
  const [textValue, setTextValue] = useState<string>('');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);

  const currentValue = mode === 'url' ? urlValue : textValue;
  const isInputValid = currentValue.trim().length > 0;

  const handlePresetSelect = (index: number) => {
    setSelectedPresetIdx(index);
    const preset = sampleArticlePresets[index];
    if (mode === 'url') {
      setUrlValue(preset.url);
    } else {
      setTextValue(preset.text);
    }
  };

  const handleToggleMode = () => {
    if (mode === 'url') {
      setMode('text');
      if (!textValue && sampleArticlePresets[selectedPresetIdx]) {
        setTextValue(sampleArticlePresets[selectedPresetIdx].text);
      }
    } else {
      setMode('url');
      if (!urlValue && sampleArticlePresets[selectedPresetIdx]) {
        setUrlValue(sampleArticlePresets[selectedPresetIdx].url);
      }
    }
  };

  const handleSubmit = () => {
    if (!isInputValid) return;
    onAnalyze({
      mode,
      value: currentValue,
      selectedPresetIdx,
    });
  };

  return (
    <div className="w-full bg-surface-container-lowest border border-outline-variant p-6 md:p-8 rounded-lg flex flex-col space-y-6 relative shadow-ambient">
      {/* Floating Header Tag */}
      <div className="absolute -top-3 left-6 bg-surface-container-lowest px-3 border border-outline-variant rounded font-label-caps text-xs text-on-surface uppercase tracking-wider font-bold shadow-subtle flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary"></span>
        {mode === 'url' ? 'Target URL' : 'Target Text Document'}
      </div>

      {/* Preset Quick Fill Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="font-label-code text-xs text-outline uppercase font-semibold">
          Sample Evidence:
        </span>
        {sampleArticlePresets.map((preset, idx) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => handlePresetSelect(idx)}
            className={`font-label-code text-xs px-2.5 py-1 rounded border transition-all ${
              selectedPresetIdx === idx
                ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-subtle'
                : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-outline'
            }`}
          >
            {preset.name}
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

      {/* Actions and Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-2 border-t border-outline-variant/60">
        <button
          type="button"
          onClick={handleToggleMode}
          className="font-label-code text-xs md:text-sm text-secondary hover:text-primary underline underline-offset-4 decoration-outline-variant hover:decoration-primary transition-all flex items-center space-x-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">
            {mode === 'url' ? 'article' : 'link'}
          </span>
          <span>{mode === 'url' ? 'Paste article text instead' : 'Switch to URL input mode'}</span>
        </button>

        <AnalyzeButton
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!isInputValid}
        />
      </div>
    </div>
  );
};
