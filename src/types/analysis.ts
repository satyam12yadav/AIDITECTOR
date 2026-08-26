export type ClaimStatus = 'supported' | 'contradicted' | 'partially_supported' | 'unverified' | 'exaggerated';

export type ReliabilityTier = 'high' | 'medium' | 'low';

export type EvidenceRelation = 'supports' | 'contradicts' | 'unclear';

export interface EvidenceItem {
  id: string;
  sourceName: string;
  domain?: string;
  publisher?: string;
  title?: string;
  sourceType?: string;
  sourceTier?: 1 | 2 | 3 | 4 | 5;
  sourceTierLabel?: string;
  publishedDate?: string | null;
  publicationDate?: string | null;
  sourceReliability?: number;
  reliabilityScore?: number;
  reliabilityBadge: string;
  reliabilityTier: ReliabilityTier;
  quote: string;
  url: string;
  relation?: EvidenceRelation;
  temporalRelevance?: string;
  isSyndicated?: boolean;
  note?: string;
  isAvailable: boolean;
}

export interface SubClaimItem {
  id: string;
  subject: string;
  predicate: string;
  attribute?: string;
  text: string;
  relation?: 'supports' | 'contradicts' | 'unclear';
  confidence?: number;
  reasoning?: string;
}

export interface ClaimItem {
  id: string;
  claimId: string;
  statement: string;
  status: ClaimStatus;
  statusLabel: string;
  importance?: number;
  claimType?: string;
  classification?: string;
  isVerifiable?: boolean;
  notVerifiableReason?: string;
  flagReason?: string;
  claimScore?: number;
  confidence?: number;
  evidenceCount?: number;
  supportingEvidenceCount?: number;
  contradictingEvidenceCount?: number;
  strongestSource?: string;
  evidenceQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning?: string;
  isCompound?: boolean;
  subclaims?: SubClaimItem[];
  isTimeSensitive?: boolean;
  referenceDate?: string;
  latestEvidenceDate?: string | null;
  evidence: EvidenceItem[];
  auditTrail?: EvidenceAuditTrail;
}

export interface EvidenceAuditTrail {
  supportStrength: number; // 0.0 - 1.0
  contradictionStrength: number; // 0.0 - 1.0
  evidenceCoverage: number; // 0.0 - 1.0
  supportingSourcesCount: number;
  contradictingSourcesCount: number;
  ignoredSourcesCount: number;
  calculationReason: string;
  sourceIndependence: number;
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
  | 'MOSTLY_CREDIBLE'
  | 'NEEDS_VERIFICATION'
  | 'UNCERTAIN'
  | 'LIKELY_MISLEADING'
  | 'HIGHLY_SUSPICIOUS'
  | 'PROBABLY_FALSE'
  | 'UNVERIFIED';

export interface MultiClaimArticleSummary {
  claimsAnalyzed: number;
  supportedCount: number;
  contradictedCount: number;
  unclearCount: number;
  majorContradictedCount: number;
  whyThisScore: string;
}

export interface SourceDistributionStats {
  totalAnalyzed: number;
  independentCount: number;
  highQualityCount: number;
  conflictingCount: number;
  supportingCount: number;
  contradictingCount: number;
  unclearCount: number;
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
  sourceStats?: SourceDistributionStats;
  recommendation?: string;
  referenceDate?: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  retrievedAt?: string;
  extractionStatus?: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  isPartial?: boolean;
  extractionWarning?: string;
  auditTrail?: EvidenceAuditTrail;
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
