export type ClaimStatus = 'supported' | 'contradicted' | 'partially_supported' | 'unverified' | 'exaggerated';

export type ReliabilityTier = 'high' | 'medium' | 'low';

export type EvidenceRelation = 'supports' | 'contradicts' | 'unclear';

export interface EvidenceItem {
  id: string;
  sourceName: string;
  publisher?: string;
  title?: string;
  sourceType?: string;
  reliabilityBadge: string;
  reliabilityTier: ReliabilityTier;
  quote: string;
  url: string;
  relation?: EvidenceRelation;
  note?: string;
  isAvailable: boolean;
}

export interface ClaimItem {
  id: string;
  claimId: string;
  statement: string;
  status: ClaimStatus;
  statusLabel: string;
  importance?: number;
  claimType?: string;
  flagReason?: string;
  claimScore?: number;
  confidence?: number;
  evidenceCount?: number;
  supportingEvidenceCount?: number;
  contradictingEvidenceCount?: number;
  strongestSource?: string;
  evidenceQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning?: string;
  evidence: EvidenceItem[];
}

export interface SourceProfile {
  name: string;
  domain: string;
  reputationLevel: 'High Trust' | 'Marginal' | 'Low Trust' | 'Institutional';
  score: number;
  description: string;
  biasRating?: string;
}

export interface DiagnosticMetrics {
  evidenceSupport: number;
  sourceReliability: number;
  crossSourceAgreement: number;
  claimVerification: number;
  articleQuality: number;
}

export type VerdictType =
  | 'HIGHLY_CREDIBLE'
  | 'PROBABLY_CREDIBLE'
  | 'NEEDS_VERIFICATION'
  | 'LIKELY_MISLEADING'
  | 'HIGHLY_SUSPICIOUS'
  | 'UNVERIFIED';

export interface MultiClaimArticleSummary {
  claimsAnalyzed: number;
  supportedCount: number;
  contradictedCount: number;
  unclearCount: number;
  majorContradictedCount: number;
  whyThisScore: string;
}

export interface AnalysisResult {
  id: string;
  title: string;
  sourceUrl?: string;
  publisher: string;
  author: string;
  analyzedAt: string;
  credibilityScore: number;
  confidenceLevel: number;
  verdict: VerdictType;
  verdictLabel: string;
  executiveSummary: string[];
  summary?: string;
  limitations?: string[];
  diagnostics: DiagnosticMetrics;
  claims: ClaimItem[];
  sourceProfile: SourceProfile;
  totalClaimsIdentified: number;
  wordCount?: number;
  articleSummary?: MultiClaimArticleSummary;
}

export type AnalysisInputMode = 'url' | 'text';

export type AnalysisStatus = 'idle' | 'loading' | 'results' | 'error';

export interface LoadingStep {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
}

export interface ErrorDetails {
  title: string;
  message: string;
  errorCode: string;
  diagnosticLog: string;
  targetInput: string;
}

export type ActiveResultsTab = 'overview' | 'claims' | 'report';
