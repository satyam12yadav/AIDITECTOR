export interface AnalyzeRequestBody {
  url?: string;
  text?: string;
}

export interface ArticleMetadata {
  title: string;
  author: string | null;
  publishedAt: string | null;
  updatedAt?: string | null;
  retrievedAt?: string;
  publisher: string | null;
  url: string | null;
  canonicalUrl?: string | null;
  text: string;
  isPartial?: boolean;
  extractionStatus?: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  extractionQualityScore?: number;
  warning?: string;
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

export type ClaimClassification =
  | 'OBJECTIVE_FACT'
  | 'CURRENT_EVENT'
  | 'HISTORICAL_FACT'
  | 'NUMERICAL_FACT'
  | 'COMPARATIVE_FACT'
  | 'PREDICTION'
  | 'OPINION'
  | 'BELIEF_OR_THEOLOGICAL'
  | 'UNVERIFIABLE';

export type ClaimType =
  | 'factual'
  | 'numerical'
  | 'geographic'
  | 'temporal'
  | 'political'
  | 'scientific'
  | 'historical'
  | 'quote'
  | 'event'
  | 'other';

export interface SubClaim {
  id: string;
  claimId?: string;
  subject: string;
  predicate: string;
  attribute?: string;
  text: string;
  relation?: 'supports' | 'contradicts' | 'unclear';
  confidence?: number;
  reasoning?: string;
  evidence?: RetrievedEvidenceItem[];
  claimScore?: number;
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

export interface ExtractedClaim {
  id: string;
  text: string;
  importance: number; // 0.1 to 1.0 (or 10 to 100)
  claim_type: ClaimType | string;
  claimType?: ClaimType | string;
  classification?: ClaimClassification;
  isVerifiable?: boolean;
  notVerifiableReason?: string;
  isTimeSensitive?: boolean;
  entity?: string;
  attribute?: string;
  value?: string;
  entities?: ExtractedEntities;
  evaluation?: ClaimForensicEvaluation;

  // Step 13: Compound Claim Fields
  isCompound?: boolean;
  subclaims?: SubClaim[];

  // Step 7 & 9: Calibrated Claim-Level Fields
  relation?: 'supports' | 'contradicts' | 'unclear';
  claimScore?: number; // 0 - 100
  confidence?: number; // 0 - 100
  evidenceCount?: number;
  rawSourceCount?: number;
  independentSourceCount?: number;
  supportingEvidenceCount?: number;
  independentSupportingSources?: number;
  contradictingEvidenceCount?: number;
  independentContradictingSources?: number;
  unclearSources?: number;
  strongestSource?: string;
  evidenceQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  consensusStatus?: 'UNANIMOUS_SUPPORT' | 'UNANIMOUS_CONTRADICTION' | 'CONFLICTING_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  reasoning?: string;
  auditTrail?: EvidenceAuditTrail;
}

export type SourceType = 'official' | 'news' | 'fact_check' | 'reference' | 'encyclopedia' | 'academic' | 'other';

export type RelationToClaim = 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL' | 'INSUFFICIENT';
export type EvidenceRelation = 'supports' | 'contradicts' | 'unclear';
export type EvidenceRelevance = 'direct' | 'related' | 'irrelevant';
export type FreshnessCategory = 'CURRENT' | 'RECENT' | 'OLD' | 'UNKNOWN';
export type RelevanceClassification = 'DIRECTLY_RELEVANT' | 'PARTIALLY_RELEVANT' | 'IRRELEVANT';

export interface RetrievedEvidenceItem {
  id: string;
  claimId: string;
  sourceName: string;
  sourceUrl: string;
  sourceTier: 1 | 2 | 3 | 4 | 5;
  sourceReliability: number; // 20 - 100
  title: string;
  publishedDate: string | null;
  publicationDate?: string | null;
  evidenceText: string;
  relationToClaim: RelationToClaim;
  relevance: EvidenceRelevance;
  confidence: number; // 0 - 100
  credibilityScore: number; // 0 - 100 based on Tier
  relevanceScore: number; // 0.0 - 1.0
  keyEvidence: string;
  explanation: string;
  finalContribution: number; // 0 - 100

  // Step 9 & 11 Enhancements
  domain: string;
  freshness?: FreshnessCategory;
  temporalRelevance?: 'TEMPORALLY_RELEVANT' | 'HISTORICAL' | 'OBSOLETE' | 'UNKNOWN';
  relevanceClassification?: RelevanceClassification;
  stance: EvidenceRelation;
  isSyndicated?: boolean;
  primarySourceDomain?: string;

  // Backward-compatible fields
  url: string;
  publisher: string;
  sourceType: SourceType;
  snippet: string;
  relation: EvidenceRelation;
  evidenceSnippet?: string;
  evidenceTitle?: string;
  stanceScore?: number;
  reasoning?: string;
}

export type CredibilityVerdict =
  | 'Highly Credible'
  | 'Probably Credible'
  | 'Mostly Credible'
  | 'Needs Verification'
  | 'Uncertain'
  | 'Likely Misleading'
  | 'Highly Suspicious'
  | 'Probably False';

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

export interface ScoreDiagnosticItem {
  claim: string;
  evidence: string;
  source: string;
  sourceTier: number;
  relation: EvidenceRelation;
  relevance: EvidenceRelevance;
  evidenceConfidence: number;
  sourceReliability: number;
  contributionToFinalScore: number;
}

export interface MultiClaimArticleSummary {
  claimsAnalyzed: number;
  supportedCount: number;
  contradictedCount: number;
  unclearCount: number;
  majorContradictedCount: number;
  whyThisScore: string;
}

export type SourceCategory =
  | 'FACT_CHECKER'
  | 'OFFICIAL_FACT_CHECK'
  | 'WIRE_SERVICE'
  | 'OFFICIAL'
  | 'NEWS'
  | 'REFERENCE';

export interface SourceRegistryEntry {
  name: string;
  domain: string;
  url: string;
  category: SourceCategory | string;
  sourceTier: 1 | 2 | 3 | 4 | 5;
  credibilityTier?: 1 | 2 | 3 | 4 | 5;
  credibilityWeight?: number;
  country: string;
  language: string;
  factCheckCapability: boolean;
  searchMethod: 'SITE_SEARCH' | 'API' | 'RSS' | 'WEB';
  isOfficial?: boolean;
  isFactChecker?: boolean;
  isWireService?: boolean;
  enabled: boolean;
}

export interface EvidenceCluster {
  clusterId: string;
  primaryDomain: string;
  origin: string; // e.g. 'Reuters', 'PTI', 'BCCI Official'
  sourceArticles: RetrievedEvidenceItem[];
  stance: EvidenceRelation;
  quality: number;
  independenceScore: number;
  representativeSnippet: string;
}

export interface MultiSourceSearchCoverage {
  sourcesSearchedCount: number;
  relevantSourcesFoundCount: number;
  supportingSourcesCount: number;
  contradictingSourcesCount: number;
  irrelevantSourcesCount: number;
  independentClustersCount: number;
  clusters: EvidenceCluster[];
}

export interface DatasetSimilarityItem {
  id: string;
  label: 'FAKE' | 'REAL';
  title: string;
  similarity: number;
}

export interface DatasetSimilaritySignal {
  datasetMatch: 'HIGH' | 'MEDIUM' | 'LOW';
  nearestExamples: DatasetSimilarityItem[];
  fakeSimilarity: number;
  realSimilarity: number;
  nearestLabel: 'FAKE' | 'REAL';
  summary: string;
}

export interface LocalModelInferenceResult {
  modelName: string;
  prediction: 'REAL' | 'FAKE';
  confidence: number;
  fakeProbability: number;
  realProbability: number;
  isLocal: boolean;
  inferenceTimeMs: number;
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
  articleSummary?: MultiClaimArticleSummary;
  diagnostics?: ScoreDiagnosticItem[];
  auditTrail?: EvidenceAuditTrail;
  coverageStats?: MultiSourceSearchCoverage;
  clusters?: EvidenceCluster[];
  datasetSimilarity?: DatasetSimilaritySignal;
  modelInference?: LocalModelInferenceResult;
  timings?: Record<string, number>;
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
