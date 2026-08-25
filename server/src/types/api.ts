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

export interface ExtractedEntities {
  people: string[];
  organizations: string[];
  locations: string[];
  dates: string[];
  numbers: string[];
  events: string[];
}

export type ClaimVerdictType = 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNVERIFIED' | 'UNKNOWN';

export interface ClaimForensicEvaluation {
  verdict: ClaimVerdictType;
  confidence: number; // 0 - 100
  reasoning: string;
  keyEvidence: string[];
  contradictingEvidence: string[];
  limitations: string[];
}

export interface ExtractedClaim {
  id: string;
  text: string;
  importance: number;
  claim_type: 'factual' | 'statistical' | 'historical' | 'quote' | string;
  entities?: ExtractedEntities;
  evaluation?: ClaimForensicEvaluation;
}

export type SourceType = 'official' | 'news' | 'fact_check' | 'academic' | 'other';

export type RelationToClaim = 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL' | 'INSUFFICIENT';
export type EvidenceRelation = 'supports' | 'contradicts' | 'unclear';

export interface RetrievedEvidenceItem {
  id: string;
  claimId: string;
  sourceName: string;
  sourceUrl: string;
  sourceTier: 1 | 2 | 3 | 4 | 5;
  title: string;
  publishedDate: string | null;
  evidenceText: string;
  relationToClaim: RelationToClaim;
  credibilityScore: number; // 0 - 100 based on Tier
  relevanceScore: number; // 0.0 - 1.0
  explanation: string;

  // Backward-compatible fields
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

export interface SourceSummary {
  name: string;
  url: string;
  type: SourceType;
  tier?: number;
  badge?: string;
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
  sources: SourceSummary[];
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
