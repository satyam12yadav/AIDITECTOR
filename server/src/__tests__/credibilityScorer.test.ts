import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
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

console.log('\n🧪 Running Verification Test Suite (Tests A to G)...\n');

// ----------------------------------------------------
// TEST A: "Ram Mandir is in Pakistan" -> CONTRADICTS, Low Credibility (<= 25)
// ----------------------------------------------------
console.log('TEST A: "Ram Mandir is in Pakistan" -> CONTRADICTS (Score <= 25)');
{
  const claimText = 'Ram Mandir is in Pakistan';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-a', text: claimText, importance: 0.85, claim_type: 'factual' }];

  const snippet = "The Ram Mandir is a Hindu temple complex located in Ayodhya, Uttar Pradesh, India.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Ram Mandir (Knowledge Archive)');

  assert(stance.relation === 'contradicts', `Stance is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);
  assert(stance.relationToClaim === 'CONTRADICTS', `RelationToClaim is CONTRADICTS (${stance.relationToClaim})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-a',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://www.britannica.com/topic/Ram-Mandir',
      sourceTier: 4,
      title: 'Ram Mandir | History & Location',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Direct location conflict: Ram Mandir is located in Ayodhya, India, not Pakistan.',
      finalContribution: 82,
      url: 'https://www.britannica.com/topic/Ram-Mandir',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 25, `Final score is <= 25 (${result.score}/100)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict refutes false claim (${result.verdict})`);
  assert(result.breakdown.evidenceSupport === 0, `Evidence Support is 0 on contradiction (${result.breakdown.evidenceSupport})`);
}

// ----------------------------------------------------
// TEST B: "Ram Mandir is in Ayodhya, India" -> SUPPORTS, High Credibility (>= 90)
// ----------------------------------------------------
console.log('\nTEST B: "Ram Mandir is in Ayodhya, India" -> SUPPORTS (Score >= 90)');
{
  const claimText = 'Ram Mandir is in Ayodhya, India';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-b', text: claimText, importance: 0.85, claim_type: 'factual' }];

  const snippet = "The Ram Mandir is a Hindu temple complex located in Ayodhya, Uttar Pradesh, India.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Ram Mandir | India Today');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-b',
      sourceName: 'India Today Fact Check',
      sourceUrl: 'https://indiatoday.in/fact-check',
      sourceTier: 2,
      title: 'Ram Mandir in Ayodhya',
      publishedDate: '2026-08-25',
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 92,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Authoritative Fact-Check corroboration.',
      finalContribution: 92,
      url: 'https://indiatoday.in/fact-check',
      publisher: 'India Today Fact Check',
      sourceType: 'fact_check',
      snippet,
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 (${result.score}/100)`);
  assert(result.verdict === 'Highly Credible', `Verdict is Highly Credible (${result.verdict})`);
}

// ----------------------------------------------------
// TEST C: "India is in South America" -> CONTRADICTS, Low Credibility (<= 30)
// ----------------------------------------------------
console.log('\nTEST C: "India is in South America" -> CONTRADICTS (Score <= 30)');
{
  const claimText = 'India is in South America';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-c', text: claimText, importance: 0.9, claim_type: 'factual' }];

  const snippet = "India, officially the Republic of India, is a country in South Asia.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'India | Britannica');

  assert(stance.relation === 'contradicts', `Stance is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-c',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India | Britannica',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Geographic conflict: India is in South Asia, not South America.',
      finalContribution: 82,
      url: 'https://britannica.com/place/India',
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
// TEST D: "India is in Asia" -> SUPPORTS, High Credibility (>= 90)
// ----------------------------------------------------
console.log('\nTEST D: "India is in Asia" -> SUPPORTS (Score >= 90)');
{
  const claimText = 'India is in Asia';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-d', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const snippet = "India is a sovereign country in South Asia, occupying the major part of the subcontinent.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'India Today');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-d',
      sourceName: 'India Today Fact Check',
      sourceUrl: 'https://indiatoday.in/fact-check',
      sourceTier: 2,
      title: 'India in Asia Tournament',
      publishedDate: '2026-08-25',
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 92,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Verified Fact-Check source confirmation.',
      finalContribution: 92,
      url: 'https://indiatoday.in/fact-check',
      publisher: 'India Today Fact Check',
      sourceType: 'fact_check',
      snippet,
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-d',
      sourceName: 'The Indian Express',
      sourceUrl: 'https://indianexpress.com',
      sourceTier: 3,
      title: 'India Strategy in Asia',
      publishedDate: '2026-08-25',
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Corroboration of India in Asia.',
      finalContribution: 85,
      url: 'https://indianexpress.com',
      publisher: 'The Indian Express',
      sourceType: 'news',
      snippet,
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 (${result.score}/100)`);
}

// ----------------------------------------------------
// TEST E: "Asia is the largest continent" -> SUPPORTS, High Credibility (>= 85)
// ----------------------------------------------------
console.log('\nTEST E: "Asia is the largest continent" -> SUPPORTS (Score >= 85)');
{
  const claimText = 'Asia is the largest continent';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-e', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const snippet = "Asia is the world's largest continent by both land area and population.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Asia | Britannica');

  assert(stance.relation === 'supports', `Stance is SUPPORTS (${stance.relation})`);
  assert(stance.stanceScore === 1, `Stance score is +1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-e',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/Asia',
      sourceTier: 4,
      title: 'Asia Facts',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Authoritative encyclopedic corroboration.',
      finalContribution: 82,
      url: 'https://britannica.com/place/Asia',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 85, `Score is >= 85 (${result.score}/100)`);
}

// ----------------------------------------------------
// TEST F: "Asia is the smallest continent" -> CONTRADICTS, Low Credibility (<= 30)
// ----------------------------------------------------
console.log('\nTEST F: "Asia is the smallest continent" -> CONTRADICTS (Score <= 30)');
{
  const claimText = 'Asia is the smallest continent';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-f', text: claimText, importance: 0.9, claim_type: 'factual' }];

  const snippet = "Asia is the largest continent in the world by both land area and population.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Asia Facts');

  assert(stance.relation === 'contradicts', `Stance is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-f',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/Asia',
      sourceTier: 4,
      title: 'Asia Facts',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Direct contradiction of smallest.',
      finalContribution: 82,
      url: 'https://britannica.com/place/Asia',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 30, `Score is low (${result.score} <= 30)`);
}

// ----------------------------------------------------
// TEST G: Unrelated claim where retrieved evidence does not establish either side -> UNCLEAR
// ----------------------------------------------------
console.log('\nTEST G: Unrelated claim -> UNCLEAR / Neutral (Score 40-60, NOT False)');
{
  const claimText = 'Subterranean crystal reactor discovered beneath city hall.';
  const snippet = "The city hall was built in 1924 and renovated in 1980.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'City Hall Archive');

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

  const claims: ExtractedClaim[] = [{ id: 'c-g', text: claimText, importance: 0.7, claim_type: 'factual' }];
  const evidence: RetrievedEvidenceItem[] = [];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 40 && result.score <= 60, `Score is neutral baseline between 40-60 (${result.score})`);
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
