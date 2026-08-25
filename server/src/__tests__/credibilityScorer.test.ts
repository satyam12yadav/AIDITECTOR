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

console.log('\n🧪 Running Credibility Scoring & Claim Verification Test Suite (Step 6)...\n');

const baseArticle: ArticleMetadata = {
  title: 'Global Economic Indicators in 2024',
  author: 'Dr. Jane Miller',
  publishedAt: '2024-05-15 12:00 UTC',
  publisher: 'reuters.com',
  url: 'https://reuters.com/markets/indicators-2024',
  text: 'Global economic indicators displayed resilience across diverse industrial segments throughout the 2024 fiscal cycle. Comprehensive reports confirmed steady trajectory.',
};

// ----------------------------------------------------
// Test 1: Exact Supported Claim with Direct Evidence
// ----------------------------------------------------
console.log('Test 1: Exact supported claim with direct evidence');
{
  const claimText = 'Ram Mandir is located in India.';
  const snippet = 'Shri Ram Janmbhoomi Mandir is a Hindu temple complex located in Ayodhya, Uttar Pradesh, India.';
  const title = 'Ram Mandir Record';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, title, false);

  assert(stance.relation === 'supports', `Relation is supports (${stance.relation})`);
  assert(stance.relevance === 'direct', `Relevance is direct (${stance.relevance})`);
  assert(stance.confidence >= 80, `Confidence is high (${stance.confidence} >= 80)`);

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.8, claim_type: 'factual' }];
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'The Hindu',
      sourceUrl: 'https://thehindu.com/ram-mandir',
      sourceTier: 3,
      title,
      publishedDate: '2024-01-22',
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: stance.confidence,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: stance.keyEvidence,
      explanation: stance.explanation,
      finalContribution: 85,
      url: 'https://thehindu.com/ram-mandir',
      publisher: 'The Hindu',
      sourceType: 'news',
      snippet,
      relation: 'supports',
    },
  ];

  const reasoning = geminiReasoningService.evaluateDeterministic(claims[0], evidence, evidence, [], []);
  assert(reasoning.verdict === 'TRUE', `Verdict is TRUE (${reasoning.verdict})`);
  assert(reasoning.confidence >= 80, `Confidence is >= 80 (${reasoning.confidence})`);
}

// ----------------------------------------------------
// Test 2: Exact Contradicted Claim with Direct Evidence
// ----------------------------------------------------
console.log('\nTest 2: Exact contradicted claim with direct evidence');
{
  const claimText = 'Ram Mandir is in Delhi.';
  const snippet = 'Shri Ram Janmbhoomi Mandir is situated in Ayodhya, Uttar Pradesh.';
  const title = 'Ayodhya Temple';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, title, false);

  assert(stance.relation === 'contradicts', `Relation is contradicts (${stance.relation})`);
  assert(stance.relevance === 'direct', `Relevance is direct (${stance.relevance})`);

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.8, claim_type: 'factual' }];
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'The Times of India',
      sourceUrl: 'https://timesofindia.com/ram-mandir',
      sourceTier: 3,
      title,
      publishedDate: '2024-01-22',
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: stance.confidence,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: stance.keyEvidence,
      explanation: stance.explanation,
      finalContribution: 85,
      url: 'https://timesofindia.com/ram-mandir',
      publisher: 'The Times of India',
      sourceType: 'news',
      snippet,
      relation: 'contradicts',
    },
  ];

  const reasoning = geminiReasoningService.evaluateDeterministic(claims[0], evidence, [], evidence, []);
  assert(reasoning.verdict === 'FALSE', `Verdict is FALSE (${reasoning.verdict})`);
}

// ----------------------------------------------------
// Test 3: Unrelated Source (Same Entity, Different Predicate)
// ----------------------------------------------------
console.log('\nTest 3: Unrelated source (same entity, different predicate)');
{
  const claimText = 'BJP is ruler party of India.';
  const snippet = 'BJP workers held a local municipal protest against tariff hikes in a district council meeting.';
  const title = 'Local Municipal Meet';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, title, true);

  assert(stance.relation === 'unclear', `Relation is unclear for topical mention (${stance.relation})`);
  assert(stance.relevance === 'related' || stance.relevance === 'irrelevant', `Relevance is not direct (${stance.relevance})`);
  assert(stance.relevanceScore <= 0.2, `Relevance score is low (${stance.relevanceScore} <= 0.2)`);
}

// ----------------------------------------------------
// Test 4: Current / Time-Sensitive Claim ("BJP is ruler party of India")
// ----------------------------------------------------
console.log('\nTest 4: Current / time-sensitive claim ("BJP is ruler party of India")');
{
  const claimText = 'BJP is ruler party of India.';
  const snippet = 'The BJP-led NDA government forms the Union government in India under Prime Minister Narendra Modi.';
  const title = 'Union Government Profile';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, title, true);

  assert(stance.relation === 'supports', `Direct ruling party evidence supports claim (${stance.relation})`);
  assert(stance.relevance === 'direct', `Relevance is direct (${stance.relevance})`);

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.9, claim_type: 'factual', isTimeSensitive: true }];
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'PIB Fact Check',
      sourceUrl: 'https://pib.gov.in/profile',
      sourceTier: 1,
      title,
      publishedDate: '2024-06-10',
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: stance.keyEvidence,
      explanation: stance.explanation,
      finalContribution: 98,
      url: 'https://pib.gov.in/profile',
      publisher: 'PIB Fact Check',
      sourceType: 'official',
      snippet,
      relation: 'supports',
    },
  ];

  const reasoning = geminiReasoningService.evaluateDeterministic(claims[0], evidence, evidence, [], []);
  assert(reasoning.verdict === 'TRUE', `Verdict is TRUE for direct official evidence (${reasoning.verdict})`);
}

// ----------------------------------------------------
// Test 5: Insufficient Evidence Handling
// ----------------------------------------------------
console.log('\nTest 5: Insufficient evidence handling (Absence of evidence is NOT true or false)');
{
  const claim: ExtractedClaim = {
    id: 'claim-1',
    text: 'A novel undisclosed propulsion technology was tested in secret.',
    importance: 0.7,
    claim_type: 'factual',
  };

  const reasoning = geminiReasoningService.evaluateDeterministic(claim, [], [], [], []);
  assert(reasoning.verdict === 'UNVERIFIED', `Verdict is UNVERIFIED for zero evidence (${reasoning.verdict})`);
  assert(reasoning.confidence <= 40, `Confidence reflects uncertainty (${reasoning.confidence} <= 40)`);
}

// ----------------------------------------------------
// Test 6: 5-Pillar Credibility Calculation with Direct vs Related Evidence
// ----------------------------------------------------
console.log('\nTest 6: 5-Pillar credibility calculation scaling');
{
  const claims: ExtractedClaim[] = [
    { id: 'claim-1', text: 'Household expenditures rose by 3.8%.', importance: 0.9, claim_type: 'statistical' },
  ];
  const directEvidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'Reuters',
      sourceUrl: 'https://reuters.com/a',
      sourceTier: 3,
      title: 'Economic Bulletin',
      publishedDate: '2024-05-15',
      evidenceText: 'Household expenditures rose by 3.8%.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 90,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: '3.8%',
      explanation: 'Direct match',
      finalContribution: 85,
      url: 'https://reuters.com/a',
      publisher: 'reuters.com',
      sourceType: 'news',
      snippet: 'Expenditures grew 3.8%.',
      relation: 'supports',
    },
  ];

  const scoreResult = credibilityScorerService.computeCredibilityScore(baseArticle, claims, directEvidence);
  assert(scoreResult.score >= 80, `High score for direct authoritative evidence (${scoreResult.score} >= 80)`);
  assert(scoreResult.breakdown.claimVerification === 100, `Claim verification is 100% (${scoreResult.breakdown.claimVerification})`);
}

console.log(`\n========================================`);
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
