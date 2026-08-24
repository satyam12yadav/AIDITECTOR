export interface AnalyzeRequestBody {
  url?: string;
  text?: string;
}

export interface ArticleMetadata {
  title: string;
  author: string | null;
  publishedAt: string | null;
  publisher: string | null;
  url: string | null;
  text: string;
}

export interface ExtractedClaim {
  id: string;
  text: string;
  importance: number;
  claim_type: 'factual' | 'statistical' | 'historical' | 'quote' | string;
}

export type SourceType = 'official' | 'news' | 'fact_check' | 'academic' | 'other';

export type EvidenceRelation = 'supports' | 'contradicts' | 'unclear';

export interface RetrievedEvidenceItem {
  id: string;
  claimId: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: SourceType;
  snippet: string;
  relation: EvidenceRelation;
}

export type CredibilityVerdict =
  | 'Highly Credible'
  | 'Probably Credible'
  | 'Needs Verification'
  | 'Likely Misleading'
  | 'Highly Suspicious';

export interface ScoreBreakdown {
  evidenceSupport: number;
  sourceReliability: number;
  crossSourceAgreement: number;
  claimVerification: number;
  articleQuality: number;
}

export interface AnalyzeResponseData {
  article: ArticleMetadata;
  claims: ExtractedClaim[];
  evidence: RetrievedEvidenceItem[];
  score: number;
  verdict: CredibilityVerdict;
  breakdown: ScoreBreakdown;
  confidence: number;
  summary: string;
  limitations: string[];
  reasons: string[];
  sources: any[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}
