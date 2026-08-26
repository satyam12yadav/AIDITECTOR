import { apiFetch } from './apiClient';

export interface BackendArticleMetadata {
  title: string;
  url: string | null;
  author: string | null;
  publishedAt: string | null;
  updatedAt?: string | null;
  retrievedAt?: string;
  publisher?: string | null;
  canonicalUrl?: string | null;
  text?: string;
  isPartial?: boolean;
  extractionStatus?: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  extractionQualityScore?: number;
  warning?: string;
}

export interface BackendScoreBreakdown {
  evidenceSupport: number;
  sourceReliability: number;
  crossSourceAgreement: number;
  claimVerification: number;
  articleQuality: number;
}

export interface BackendAnalyzeResponse {
  article: BackendArticleMetadata;
  claims: any[];
  evidence?: any[];
  score: number;
  verdict: string;
  breakdown?: BackendScoreBreakdown;
  confidence: number;
  summary?: string;
  limitations?: string[];
  reasons: string[];
  sources: any[];
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface AnalyzePayload {
  url?: string;
  text?: string;
}

export const analysisService = {
  /**
   * Sends an article URL or text for analysis to POST /api/analyze
   */
  async analyzeArticle(
    payload: AnalyzePayload,
    signal?: AbortSignal,
    timeoutMs = 35000
  ): Promise<BackendAnalyzeResponse> {
    return apiFetch<BackendAnalyzeResponse>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
      timeoutMs,
    });
  },

  /**
   * Checks the health of the backend server GET /api/health
   */
  async checkHealth(signal?: AbortSignal): Promise<BackendHealthResponse> {
    return apiFetch<BackendHealthResponse>('/api/health', {
      method: 'GET',
      signal,
      timeoutMs: 5000,
    });
  },
};
