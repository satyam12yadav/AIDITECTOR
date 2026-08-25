import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
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

console.log('\n🧪 Running Credibility Scoring Calibration & Timeout Optimization Test Suite (Step 7)...\n');

const baseArticle: ArticleMetadata = {
  title: 'Global Economic Indicators in 2024',
  author: 'Dr. Jane Miller',
  publishedAt: '2024-05-15 12:00 UTC',
  publisher: 'reuters.com',
  url: 'https://reuters.com/markets/indicators-2024',
  text: 'Global economic indicators displayed resilience across diverse industrial segments throughout the 2024 fiscal cycle. Comprehensive reports confirmed steady trajectory.',
};

// ----------------------------------------------------
// Test 1: Obvious Verified Factual Claim Reaches 90-100% (Test A)
// ----------------------------------------------------
console.log('Test 1: Obvious verified factual claim reaches 90-100% credibility');
{
  const claimText = 'Ram Mandir is located in Ayodhya, Uttar Pradesh, India.';
  const directArticle: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'The Hindu',
      sourceUrl: 'https://thehindu.com/ram-mandir',
      sourceTier: 3,
      title: 'Ram Mandir Record',
      publishedDate: '2024-01-22',
      evidenceText: 'Shri Ram Janmbhoomi Mandir is a Hindu temple complex located in Ayodhya, Uttar Pradesh, India.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'located in Ayodhya, Uttar Pradesh, India',
      explanation: 'Direct confirmation',
      finalContribution: 85,
      url: 'https://thehindu.com/ram-mandir',
      publisher: 'The Hindu',
      sourceType: 'news',
      snippet: 'Shri Ram Janmbhoomi Mandir is a Hindu temple complex located in Ayodhya, Uttar Pradesh, India.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'claim-1',
      sourceName: 'PIB Fact Check',
      sourceUrl: 'https://pib.gov.in/ayodhya',
      sourceTier: 1,
      title: 'Ayodhya Mandir PIB Release',
      publishedDate: '2024-01-22',
      evidenceText: 'The historic temple complex in Ayodhya, UP, India was officially consecrated.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'Ayodhya, UP, India',
      explanation: 'Official government verification',
      finalContribution: 98,
      url: 'https://pib.gov.in/ayodhya',
      publisher: 'PIB Fact Check',
      sourceType: 'official',
      snippet: 'The historic temple complex in Ayodhya, UP, India was officially consecrated.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(directArticle, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 for obvious verified factual claim (${result.score})`);
  assert(result.verdict === 'Highly Credible', `Verdict is Highly Credible (${result.verdict})`);
  assert(result.breakdown.evidenceSupport >= 95, `Evidence Support is >= 95 (${result.breakdown.evidenceSupport})`);
  assert(result.breakdown.crossSourceAgreement >= 95, `Cross Source Agreement is >= 95 (${result.breakdown.crossSourceAgreement})`);
  assert(result.diagnostics.length === 2, `Diagnostics generated 2 items (${result.diagnostics.length})`);
}

// ----------------------------------------------------
// Test 2: Clearly False Claim (Test B)
// ----------------------------------------------------
console.log('\nTest 2: Clearly false claim receives low score <= 35');
{
  const claimText = 'Ram Mandir is located in London.';
  const directArticle: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.9, claim_type: 'factual' }];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'The Times of India',
      sourceUrl: 'https://timesofindia.com/ram-mandir',
      sourceTier: 3,
      title: 'Ram Mandir Ayodhya',
      publishedDate: '2024-01-22',
      evidenceText: 'Shri Ram Janmbhoomi Mandir is located in Ayodhya, Uttar Pradesh, India.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 92,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'Ayodhya, Uttar Pradesh',
      explanation: 'Location conflict',
      finalContribution: 85,
      url: 'https://timesofindia.com/ram-mandir',
      publisher: 'The Times of India',
      sourceType: 'news',
      snippet: 'Shri Ram Janmbhoomi Mandir is located in Ayodhya, Uttar Pradesh, India.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(directArticle, claims, evidence);
  assert(result.score <= 35, `Score is low (${result.score} <= 35)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict is refuting (${result.verdict})`);
  assert(result.breakdown.evidenceSupport <= 20, `Evidence support is penalized (${result.breakdown.evidenceSupport} <= 20)`);
}

// ----------------------------------------------------
// Test 3: Ambiguous / Insufficient Evidence Claim (Test C)
// ----------------------------------------------------
console.log('\nTest 3: Ambiguous claim returns UNCERTAIN / INSUFFICIENT EVIDENCE (approx 50)');
{
  const claimText = 'Secret underground bunker built under city park.';
  const directArticle: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.7, claim_type: 'factual' }];
  const evidence: RetrievedEvidenceItem[] = [];

  const result = credibilityScorerService.computeCredibilityScore(directArticle, claims, evidence);
  assert(result.score >= 45 && result.score <= 65, `Neutral score for ambiguous claim (${result.score})`);
  assert(result.verdict === 'Needs Verification', `Verdict is Needs Verification (${result.verdict})`);

  const reasoning = geminiReasoningService.evaluateDeterministic(claims[0], [], [], [], []);
  assert(reasoning.verdict === 'UNVERIFIED', `Gemini verdict is UNVERIFIED (${reasoning.verdict})`);
}

// ----------------------------------------------------
// Test 4: Transparent Diagnostics Detail
// ----------------------------------------------------
console.log('\nTest 4: Transparent diagnostics detail mapping');
{
  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: 'Inflation fell to 2.1%.', importance: 0.8, claim_type: 'statistical' }];
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'RBI Official',
      sourceUrl: 'https://rbi.org.in/inflation',
      sourceTier: 1,
      title: 'Monetary Policy Report',
      publishedDate: '2024-06-01',
      evidenceText: 'Headline inflation moderated to 2.1%.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 96,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'inflation moderated to 2.1%',
      explanation: 'Direct statistical confirmation',
      finalContribution: 98,
      url: 'https://rbi.org.in/inflation',
      publisher: 'RBI Official',
      sourceType: 'official',
      snippet: 'Headline inflation moderated to 2.1%.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(baseArticle, claims, evidence);
  assert(result.diagnostics.length > 0, `Diagnostics present (${result.diagnostics.length})`);
  const diag = result.diagnostics[0];
  assert(diag.source === 'RBI Official', `Diagnostic source is RBI Official (${diag.source})`);
  assert(diag.sourceTier === 1, `Diagnostic sourceTier is 1 (${diag.sourceTier})`);
  assert(diag.relation === 'supports', `Diagnostic relation is supports (${diag.relation})`);
  assert(diag.relevance === 'direct', `Diagnostic relevance is direct (${diag.relevance})`);
  assert(diag.contributionToFinalScore === 98, `Diagnostic contribution is 98 (${diag.contributionToFinalScore})`);
}

console.log(`\n========================================`);
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
