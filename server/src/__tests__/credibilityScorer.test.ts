import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

// Simple lightweight test runner helper
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

console.log('\n🧪 Running Credibility Scoring Engine Unit Tests (Module 7)...\n');

const baseArticle: ArticleMetadata = {
  title: 'Global Economic Indicators in 2024',
  author: 'Dr. Jane Miller',
  publishedAt: '2024-05-15 12:00 UTC',
  publisher: 'reuters.com',
  url: 'https://reuters.com/markets/indicators-2024',
  text: 'Global economic indicators displayed resilience across diverse industrial segments throughout the 2024 fiscal cycle. Comprehensive reports confirmed steady trajectory.',
};

// ----------------------------------------------------
// Test 1: All Claims Supported
// ----------------------------------------------------
console.log('Test 1: All claims supported by reliable independent sources');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Household expenditures rose by 3.8%.', importance: 0.9, claim_type: 'statistical' },
    { id: 'claim-2', text: 'Industrial output expanded in Q3.', importance: 0.7, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'BIS Report', url: 'https://bis.org/rep', publisher: 'bis.org', sourceType: 'official', snippet: 'Confirmed household expenditures rose by 3.8%.', relation: 'supports' },
    { id: 'ev-2', claimId: 'claim-1', title: 'Reuters Market', url: 'https://reuters.com/a', publisher: 'reuters.com', sourceType: 'news', snippet: 'Expenditures grew 3.8%.', relation: 'supports' },
    { id: 'ev-3', claimId: 'claim-2', title: 'CBO Data', url: 'https://cbo.gov/data', publisher: 'cbo.gov', sourceType: 'official', snippet: 'Industrial output expansion confirmed.', relation: 'supports' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.score >= 85, `Score is high (${result.score} >= 85)`);
  assert(result.verdict === 'Probably Credible' || result.verdict === 'Highly Credible', `Verdict is ${result.verdict}`);
  assert(result.breakdown.evidenceSupport >= 90, `Evidence Support is ${result.breakdown.evidenceSupport}`);
  assert(result.breakdown.claimVerification === 100, `Claim Verification is ${result.breakdown.claimVerification}`);
}

// ----------------------------------------------------
// Test 2: Several Claims Contradicted
// ----------------------------------------------------
console.log('\nTest 2: Several claims contradicted by fact-checking registries');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Taxes were increased by 80%.', importance: 0.9, claim_type: 'statistical' },
    { id: 'claim-2', text: 'A secret treaty was enacted.', importance: 0.8, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'Snopes Fact Check', url: 'https://snopes.com/tax', publisher: 'snopes.com', sourceType: 'fact_check', snippet: 'False. The claim that taxes rose 80% is disproven and fabricated.', relation: 'contradicts' },
    { id: 'ev-2', claimId: 'claim-2', title: 'PolitiFact Check', url: 'https://politifact.com/treaty', publisher: 'politifact.com', sourceType: 'fact_check', snippet: 'Pants on fire. No secret treaty exists.', relation: 'contradicts' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.score <= 35, `Score is low (${result.score} <= 35)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict is ${result.verdict}`);
  assert(result.breakdown.evidenceSupport <= 20, `Evidence Support heavily penalized (${result.breakdown.evidenceSupport})`);
}

// ----------------------------------------------------
// Test 3: All Claims Unverified
// ----------------------------------------------------
console.log('\nTest 3: All claims unverified (absence of evidence is NOT false)');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Obscure municipal committee meeting convened.', importance: 0.5, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.score >= 50 && result.score <= 74, `Score is in neutral Needs Verification range (${result.score})`);
  assert(result.verdict === 'Needs Verification', `Verdict is 'Needs Verification' (${result.verdict})`);
  assert(result.breakdown.claimVerification === 50, `Claim Verification is 50 neutral baseline`);
  assert(result.breakdown.evidenceSupport === 50, `Evidence Support is 50 neutral baseline`);
}

// ----------------------------------------------------
// Test 4: Mixed Supported / Contradicted / Unverified
// ----------------------------------------------------
console.log('\nTest 4: Mixed supported, contradicted, and unverified claims');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Verified market metric.', importance: 0.6, claim_type: 'statistical' },
    { id: 'claim-2', text: 'Debunked false claim.', importance: 0.6, claim_type: 'factual' },
    { id: 'claim-3', text: 'Unverified statement.', importance: 0.4, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'AP News', url: 'https://apnews.com/m', publisher: 'apnews.com', sourceType: 'news', snippet: 'Metric verified.', relation: 'supports' },
    { id: 'ev-2', claimId: 'claim-2', title: 'FactCheck.org', url: 'https://factcheck.org/d', publisher: 'factcheck.org', sourceType: 'fact_check', snippet: 'Debunked as false.', relation: 'contradicts' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.score > 25 && result.score < 75, `Mixed score balances deterministically (${result.score})`);
  assert(result.breakdown.crossSourceAgreement <= 45, `Cross source conflict detected (${result.breakdown.crossSourceAgreement})`);
}

// ----------------------------------------------------
// Test 5: High-Quality Sources (.gov, .edu, fact_check)
// ----------------------------------------------------
console.log('\nTest 5: High-quality authoritative sources');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Climate metrics confirmed.', importance: 0.8, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'NASA JPL', url: 'https://nasa.gov/climate', publisher: 'nasa.gov', sourceType: 'official', snippet: 'Confirmed.', relation: 'supports' },
    { id: 'ev-2', claimId: 'claim-1', title: 'Nature Journal', url: 'https://nature.com/article', publisher: 'nature.com', sourceType: 'academic', snippet: 'Confirmed.', relation: 'supports' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.breakdown.sourceReliability >= 90, `Source reliability is exceptionally high (${result.breakdown.sourceReliability})`);
}

// ----------------------------------------------------
// Test 6: Low-Quality / Unknown Sources
// ----------------------------------------------------
console.log('\nTest 6: Low-quality / unclassified sources');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Web claim statement.', importance: 0.6, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'Random Blog', url: 'https://unknownblog.xyz/p', publisher: 'unknownblog.xyz', sourceType: 'other', snippet: 'Statement.', relation: 'supports' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.breakdown.sourceReliability <= 55, `Source reliability reflects unknown origin (${result.breakdown.sourceReliability})`);
}

// ----------------------------------------------------
// Test 7: No Evidence
// ----------------------------------------------------
console.log('\nTest 7: Empty evidence set');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Random statement with no hits.', importance: 0.7, claim_type: 'factual' },
  ];
  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, []);
  assert(result.breakdown.evidenceSupport === 50, 'Evidence support is neutral 50');
  assert(result.breakdown.crossSourceAgreement === 50, 'Cross source agreement is neutral 50');
  assert(result.limitations.length > 0, 'Limitations noted for missing evidence');
}

// ----------------------------------------------------
// Test 8: Duplicate Sources Deduplication
// ----------------------------------------------------
console.log('\nTest 8: Duplicate sources deduplication check');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Statement.', importance: 0.7, claim_type: 'factual' },
  ];
  // 3 items from the exact same publisher domain
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'Page 1', url: 'https://reuters.com/1', publisher: 'reuters.com', sourceType: 'news', snippet: 'Supported.', relation: 'supports' },
    { id: 'ev-2', claimId: 'claim-1', title: 'Page 2', url: 'https://reuters.com/2', publisher: 'reuters.com', sourceType: 'news', snippet: 'Supported.', relation: 'supports' },
    { id: 'ev-3', claimId: 'claim-1', title: 'Page 3', url: 'https://reuters.com/3', publisher: 'reuters.com', sourceType: 'news', snippet: 'Supported.', relation: 'supports' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  // Cross source agreement should cap at single source level (75 max) and not award multi-source bonus
  assert(result.breakdown.crossSourceAgreement <= 75, `Single domain deduplication applied (${result.breakdown.crossSourceAgreement} <= 75)`);
}

// ----------------------------------------------------
// Test 9: One Highly Important Contradicted Claim
// ----------------------------------------------------
console.log('\nTest 9: One highly important claim contradicted');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Central thesis of the entire article.', importance: 0.95, claim_type: 'factual' },
    { id: 'claim-2', text: 'Minor background detail.', importance: 0.2, claim_type: 'factual' },
  ];
  const evidence: RetrievedEvidenceItem[] = [
    { id: 'ev-1', claimId: 'claim-1', title: 'Debunk', url: 'https://reuters.com/fact-check', publisher: 'reuters.com', sourceType: 'fact_check', snippet: 'False and disproven.', relation: 'contradicts' },
    { id: 'ev-2', claimId: 'claim-2', title: 'Minor note', url: 'https://bbc.com/m', publisher: 'bbc.com', sourceType: 'news', snippet: 'Minor detail mentioned.', relation: 'supports' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.score <= 45, `Contradicting high importance claim severely drops score (${result.score} <= 45)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict reflects contradiction (${result.verdict})`);
}

// ----------------------------------------------------
// Test 10: Missing Article Metadata
// ----------------------------------------------------
console.log('\nTest 10: Missing article metadata (short text, no author, no date)');
{
  const sparseArticle: ArticleMetadata = {
    title: 'Short Unsigned Post',
    author: null,
    publishedAt: null,
    publisher: null,
    url: null,
    text: 'Short unverified snippet.',
  };
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Short unverified snippet.', importance: 0.5, claim_type: 'factual' },
  ];

  const result = credibilityScorerService.computeCredibilityScore(sparseArticle, claims, []);
  assert(result.breakdown.articleQuality <= 50, `Article Quality is low for missing metadata (${result.breakdown.articleQuality})`);
  assert(result.limitations.some(l => l.includes('author') || l.includes('Publication')), 'Limitations report missing metadata');
}

console.log(`\n========================================`);
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
