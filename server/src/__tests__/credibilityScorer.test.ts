import { credibilityScorerService } from '../services/credibilityScorer.service.js';
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

console.log('\n🧪 Running Comprehensive Evidence Retrieval & Scoring Verification Test Suite...\n');

// ----------------------------------------------------
// Test Case A: "India is in Asia" (Expected: VERIFIED, approx 95-100)
// ----------------------------------------------------
console.log('Test Case A: "India is in Asia" -> VERIFIED (Score >= 90)');
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

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'claim-1',
      sourceName: 'Wikipedia Knowledge Archive',
      sourceUrl: 'https://en.wikipedia.org/wiki/India',
      sourceTier: 4,
      title: 'India (Knowledge Archive)',
      publishedDate: null,
      evidenceText: 'India, officially the Republic of India, is a country in South Asia.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'country in South Asia',
      explanation: 'Geographic corroboration: Evidence confirms location in South Asia, consistent with Asia.',
      finalContribution: 82,
      url: 'https://en.wikipedia.org/wiki/India',
      publisher: 'Wikipedia',
      sourceType: 'other',
      snippet: 'India, officially the Republic of India, is a country in South Asia.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'claim-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India | History, Map, & Facts',
      publishedDate: null,
      evidenceText: 'India, country that occupies the greater part of South Asia.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'greater part of South Asia',
      explanation: 'Geographic corroboration: Authoritative encyclopedia confirms India is in South Asia.',
      finalContribution: 82,
      url: 'https://britannica.com/place/India',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'other',
      snippet: 'India, country that occupies the greater part of South Asia.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 for "India is in Asia" (${result.score}/100)`);
  assert(result.verdict === 'Highly Credible', `Verdict is Highly Credible (${result.verdict})`);
  assert(result.breakdown.evidenceSupport >= 90, `Evidence Support is >= 90 (${result.breakdown.evidenceSupport})`);
  assert(result.breakdown.crossSourceAgreement >= 95, `Cross Source Agreement is >= 95 (${result.breakdown.crossSourceAgreement})`);
}

// ----------------------------------------------------
// Test Case B: "Ram Mandir is in Ayodhya, India" (Expected: VERIFIED, approx 95-100)
// ----------------------------------------------------
console.log('\nTest Case B: "Ram Mandir is in Ayodhya, India" -> VERIFIED (Score >= 90)');
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

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.85, claim_type: 'factual' }];

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
      explanation: 'Direct confirmation by national wire broadsheet',
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
      evidenceText: 'The historic temple complex in Ayodhya, UP, India was consecrated.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'Ayodhya, UP, India',
      explanation: 'Official statutory record',
      finalContribution: 98,
      url: 'https://pib.gov.in/ayodhya',
      publisher: 'PIB Fact Check',
      sourceType: 'official',
      snippet: 'The historic temple complex in Ayodhya, UP, India was consecrated.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 for "Ram Mandir is in Ayodhya, India" (${result.score}/100)`);
  assert(result.verdict === 'Highly Credible', `Verdict is Highly Credible (${result.verdict})`);
  assert(result.breakdown.evidenceSupport >= 95, `Evidence Support is >= 95 (${result.breakdown.evidenceSupport})`);
}

// ----------------------------------------------------
// Test Case C: Deliberately false geographical claim ("India is in Europe")
// ----------------------------------------------------
console.log('\nTest Case C: Deliberately false geographical claim ("India is in Europe") -> Low Score (<= 30)');
{
  const claimText = 'India is in Europe';
  const article: ArticleMetadata = {
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
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India Facts',
      publishedDate: null,
      evidenceText: 'India is a country located in South Asia.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'located in South Asia',
      explanation: 'Location conflict: Claim asserts Europe, whereas reference documents South Asia.',
      finalContribution: 82,
      url: 'https://britannica.com/place/India',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'other',
      snippet: 'India is a country located in South Asia.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 30, `Score is low (${result.score} <= 30)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict refutes false claim (${result.verdict})`);
  assert(result.breakdown.evidenceSupport === 0, `Evidence Support is 0 on direct contradiction (${result.breakdown.evidenceSupport})`);
}

// ----------------------------------------------------
// Test Case D: Genuinely uncertain claim (No reliable evidence -> UNVERIFIED, approx 40-60)
// ----------------------------------------------------
console.log('\nTest Case D: Genuinely uncertain claim -> UNVERIFIED (Score 40-60)');
{
  const claimText = 'Secret underground government installation discovered under park.';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'claim-1', text: claimText, importance: 0.7, claim_type: 'factual' }];
  const evidence: RetrievedEvidenceItem[] = [];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 40 && result.score <= 60, `Score is neutral/unverified between 40-60 (${result.score})`);
  assert(result.verdict === 'Needs Verification', `Verdict is Needs Verification (${result.verdict})`);

  const reasoning = geminiReasoningService.evaluateDeterministic(claims[0], [], [], [], []);
  assert(reasoning.verdict === 'UNVERIFIED', `Gemini verdict is UNVERIFIED (${reasoning.verdict})`);
}

// ----------------------------------------------------
// Test Case E: Location Hierarchy Entity Containment
// ----------------------------------------------------
console.log('\nTest Case E: Location Hierarchy Entity Containment');
{
  const compat1 = entityExtractorService.checkLocationCompatibility('asia', 'south asia');
  assert(compat1 === 'SUPPORTIVE', `Asia contains South Asia (${compat1})`);

  const compat2 = entityExtractorService.checkLocationCompatibility('india', 'ayodhya');
  assert(compat2 === 'SUPPORTIVE', `India contains Ayodhya (${compat2})`);

  const compat3 = entityExtractorService.checkLocationCompatibility('europe', 'india');
  assert(compat3 === 'CONTRADICTORY', `Europe and India are contradictory locations (${compat3})`);
}

console.log(`\n========================================`);
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
