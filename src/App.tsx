import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveResultsTab,
  AnalysisInputMode,
  AnalysisResult,
  AnalysisStatus,
  ErrorDetails,
} from './types/analysis';
import {
  mockErrorDetails,
  mockResultCredible,
} from './mocks/mockAnalysisData';
import { analysisService } from './services/analysisService';
import { ApiError } from './services/apiClient';
import { transformBackendResponseToUi } from './utils/responseAdapter';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { AnalysisLoadingState } from './components/loading/AnalysisLoadingState';
import { ResultsPage } from './components/results/ResultsPage';
import { ErrorState } from './components/error/ErrorState';
import { DemoControlBar } from './components/demo/DemoControlBar';

export const App: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [activeTab, setActiveTab] = useState<ActiveResultsTab>('overview');
  const [currentResult, setCurrentResult] = useState<AnalysisResult>(mockResultCredible);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails>(mockErrorDetails);
  const [targetInputText, setTargetInputText] = useState<string>('');
  const [lastPayload, setLastPayload] = useState<{
    mode: AnalysisInputMode;
    value: string;
    selectedPresetIdx?: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Extension deep-link support: ?url=https://...
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const targetUrl = params.get('url');
      if (targetUrl && targetUrl.trim()) {
        handleStartAnalysis({
          mode: 'url',
          value: targetUrl.trim(),
        });
      }
    }
  }, []);

  const handleStartAnalysis = async (payload: {
    mode: AnalysisInputMode;
    value: string;
    selectedPresetIdx?: number;
  }) => {
    // Save last payload for retry support
    setLastPayload(payload);
    setTargetInputText(payload.value);

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('loading');

    // Prepare API body based on mode
    const apiPayload =
      payload.mode === 'url'
        ? { url: payload.value.trim() }
        : { text: payload.value.trim() };

    try {
      // Real API Call to Node.js Backend: POST /api/analyze
      const response = await analysisService.analyzeArticle(apiPayload, controller.signal);

      // Transform the structured real backend response to UI AnalysisResult format
      const transformed = transformBackendResponseToUi(response, payload.value);
      setCurrentResult(transformed);
      setStatus('results');
      setActiveTab('overview');
    } catch (err: any) {
      if (err instanceof ApiError && err.errorCode === 'REQUEST_ABORTED') {
        // User aborted intentionally, no error needed
        return;
      }

      console.error('[API Error in analyzeArticle]:', err);

      const errorMessage =
        err instanceof ApiError
          ? err.message
          : 'Unable to complete verification. Please check backend connection.';
      const errorCode = err instanceof ApiError ? err.errorCode : 'API_CONNECTION_ERROR';
      const statusCode = err instanceof ApiError ? err.statusCode : 500;

      const diagnosticTrace = `[HTTP_STATUS] ${statusCode}
[ERROR_CODE] ${errorCode}
[TIMESTAMP] ${new Date().toISOString()}
[TARGET_INPUT] ${payload.value}
[DIAGNOSTICS] ${err.details ? JSON.stringify(err.details, null, 2) : err.message || 'No additional trace.'}
[SUGGESTION] Verify that the backend server is running on http://localhost:5001 and that input is non-empty.`;

      setErrorDetails({
        title: err.isTimeout ? 'Request Timed Out' : 'Analysis Request Failed',
        message: errorMessage,
        errorCode: errorCode,
        targetInput: payload.value,
        diagnosticLog: diagnosticTrace,
      });

      setStatus('error');
    }
  };

  const handleLoadingComplete = () => {
    // When the loading animation concludes, switch to results view
    setStatus('results');
    setActiveTab('overview');
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
  };

  const handleNewAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
  };

  const handleRetry = () => {
    if (lastPayload) {
      handleStartAnalysis(lastPayload);
    } else {
      setStatus('idle');
    }
  };

  const handleDemoSelectState = (newStatus: AnalysisStatus, mock?: AnalysisResult) => {
    if (mock) {
      setCurrentResult(mock);
    }
    setStatus(newStatus);
    if (newStatus === 'results') {
      setActiveTab('overview');
    }
  };

  const isResultsView = status === 'results';

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      {/* Top Header */}
      <Header onNewAnalysis={handleNewAnalysis} />

      {/* Main Layout Area */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar (visible on results page) */}
        {isResultsView && (
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewAnalysis={handleNewAnalysis}
          />
        )}

        {/* Dynamic View Canvas */}
        <main className="flex-1 flex flex-col min-w-0">
          {status === 'idle' && (
            <div className="px-4 md:px-margin-desktop max-w-container-max mx-auto w-full">
              <LandingPage onAnalyze={handleStartAnalysis} isLoading={false} />
            </div>
          )}

          {status === 'loading' && (
            <AnalysisLoadingState
              onCancel={handleCancelAnalysis}
              onComplete={handleLoadingComplete}
              targetInputText={targetInputText}
            />
          )}

          {status === 'results' && (
            <ResultsPage
              result={currentResult}
              onNewAnalysis={handleNewAnalysis}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          )}

          {status === 'error' && (
            <ErrorState
              error={errorDetails}
              onRetry={handleRetry}
              onSwitchToText={() => {
                setStatus('idle');
              }}
              onBackToHome={() => setStatus('idle')}
            />
          )}
        </main>
      </div>

      {/* Global Footer */}
      <Footer />

      {/* Demo Floating Toolbar */}
      <DemoControlBar currentStatus={status} onSelectState={handleDemoSelectState} />
    </div>
  );
};

export default App;
