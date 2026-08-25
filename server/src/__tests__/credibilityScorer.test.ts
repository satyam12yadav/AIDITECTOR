import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

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

console.log('\n🧪 Running 7-Claim Comprehensive Verification Test Suite...\n');

// ----------------------------------------------------
// TEST 1: "Asia is largest continent in world" -> SUPPORTS, High Credibility (~90-100)
// ----------------------------------------------------
console.log('TEST 1: "Asia is largest continent in world" -> SUPPORTS, High Credibility (~90-100)');
{
  const claimText = 'Asia is largest continent in world';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const snippet = "Asia is the world's largest and most diverse continent. It occupies the eastern four-fifths of the giant Eurasian landmass.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Asia | Britannica');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://www.britannica.com/place/Asia',
      sourceTier: 4,
      title: 'Asia | Britannica',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: "Asia is the world's largest continent",
      explanation: 'Authoritative encyclopedia confirmation.',
      finalContribution: 82,
      url: 'https://www.britannica.com/place/Asia',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 88, `Score is >= 88 (${result.score}/100)`);
  assert(result.verdict === 'Probably Credible' || result.verdict === 'Highly Credible', `Verdict is Credible (${result.verdict})`);
}

// ----------------------------------------------------
// TEST 2: "Asia is the smallest continent in the world" -> CONTRADICTS, Low Credibility (<= 30)
// ----------------------------------------------------
console.log('\nTEST 2: "Asia is the smallest continent in the world" -> CONTRADICTS, Low Credibility (<= 30)');
{
  const claimText = 'Asia is the smallest continent in the world';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-2', text: claimText, importance: 0.9, claim_type: 'factual' }];

  const snippet = "Asia is the largest continent in the world by both land area and population.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Asia | Reference');

  assert(stance.relation === 'contradicts', `Stance is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-2',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://www.britannica.com/place/Asia',
      sourceTier: 4,
      title: 'Asia Reference',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: "Asia is the largest continent in the world",
      explanation: 'Direct contradiction of smallest.',
      finalContribution: 82,
      url: 'https://www.britannica.com/place/Asia',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 30, `Score is low (${result.score} <= 30)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict refutes false claim (${result.verdict})`);
}

// ----------------------------------------------------
// TEST 3: "Asia is located in the Northern Hemisphere" -> SUPPORTS
// ----------------------------------------------------
console.log('\nTEST 3: "Asia is located in the Northern Hemisphere" -> SUPPORTS');
{
  const claimText = 'Asia is located in the Northern Hemisphere';
  const snippet = "Asia is located primarily in the Eastern and Northern Hemispheres.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Asia Geography');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);
}

// ----------------------------------------------------
// TEST 4: "Asia has many countries" -> SUPPORTS
// ----------------------------------------------------
console.log('\nTEST 4: "Asia has many countries" -> SUPPORTS');
{
  const claimText = 'Asia has many countries';
  const snippet = "Asia contains 48 sovereign countries recognized by the United Nations.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Countries in Asia');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);
}

// ----------------------------------------------------
// TEST 5: "Asia is located entirely in South America" -> CONTRADICTS
// ----------------------------------------------------
console.log('\nTEST 5: "Asia is located entirely in South America" -> CONTRADICTS');
{
  const claimText = 'Asia is located entirely in South America';
  const snippet = "Asia is the largest continent in the Eastern Hemisphere, occupying four-fifths of Eurasia.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Asia Geography');

  assert(stance.relation === 'contradicts', `Stance is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);
}

// ----------------------------------------------------
// TEST 6: "Asia has mountains" -> SUPPORTS
// ----------------------------------------------------
console.log('\nTEST 6: "Asia has mountains" -> SUPPORTS');
{
  const claimText = 'Asia has mountains';
  const snippet = "Asia has both the highest points on Earth including the Himalayas and longest mountain ranges.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Mountains of Asia');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);
}

// ----------------------------------------------------
// TEST 7: Obscure Unsupported Claim -> UNCLEAR / INSUFFICIENT EVIDENCE (NOT CONTRADICTS)
// ----------------------------------------------------
console.log('\nTEST 7: Obscure unsupported claim -> UNCLEAR / INSUFFICIENT EVIDENCE (NOT CONTRADICTS)');
{
  const claimText = 'Ancient hidden crystal reactor discovered beneath city hall.';
  const snippet = "The city hall was built in 1924 and underwent renovations in 1980.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'City Hall Records');

  assert(stance.relation === 'unclear', `Stance is UNCLEAR (${stance.relation})`);
  assert(stance.stanceScore === 0, `Stance score is 0 (${stance.stanceScore})`);
  assert(stance.relationToClaim === 'NEUTRAL', `Relation is NEUTRAL (${stance.relationToClaim})`);

  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-7', text: claimText, importance: 0.7, claim_type: 'factual' }];
  const evidence: RetrievedEvidenceItem[] = [];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 40 && result.score <= 60, `Score is unverified neutral between 40-60 (${result.score})`);
  assert(result.verdict === 'Needs Verification', `Verdict is Needs Verification (${result.verdict})`);

  const reasoning = geminiReasoningService.evaluateDeterministic(claims[0], [], [], [], []);
  assert(reasoning.verdict === 'UNVERIFIED', `Gemini verdict is UNVERIFIED (${reasoning.verdict})`);
}

console.log(`\n========================================`);
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
