import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
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

console.log('\n🧪 Running Verification Test Suite (General Facts, Superlatives & Geographic Hierarchies)...\n');

// ----------------------------------------------------
// Test Case 1: "Asia is the largest continent." (Expected: SUPPORTS, Score >= 85)
// ----------------------------------------------------
console.log('Test Case 1: "Asia is the largest continent." -> SUPPORTS (Score >= 85)');
{
  const claimText = 'Asia is the largest continent.';
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
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://www.britannica.com/place/Asia',
      sourceTier: 4,
      title: 'Asia | Continent, Countries, Regions, Map, & Facts',
      publishedDate: null,
      evidenceText: "Asia is the world's largest and most diverse continent.",
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: "Asia is the world's largest and most diverse continent",
      explanation: 'Authoritative encyclopedic reference corroboration.',
      finalContribution: 82,
      url: 'https://www.britannica.com/place/Asia',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet: "Asia is the world's largest and most diverse continent.",
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'claim-1',
      sourceName: 'thoughtco.com',
      sourceUrl: 'https://www.thoughtco.com/continents-ranked-by-size-and-population-4163436',
      sourceTier: 5,
      title: 'The 7 Continents Ranked by Size and Population',
      publishedDate: null,
      evidenceText: "What is the largest continent in the world? That's easy: Asia. It's the biggest in terms of both size and population.",
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 50,
      relevanceScore: 1.0,
      keyEvidence: "Asia. It's the biggest in terms of both size and population",
      explanation: 'Reference source confirmation.',
      finalContribution: 50,
      url: 'https://www.thoughtco.com/continents-ranked-by-size-and-population-4163436',
      publisher: 'thoughtco.com',
      sourceType: 'reference',
      snippet: "What is the largest continent in the world? That's easy: Asia. It's the biggest in terms of both size and population.",
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 85, `Score is >= 85 for "Asia is the largest continent." (${result.score}/100)`);
  assert(result.verdict === 'Probably Credible' || result.verdict === 'Highly Credible', `Verdict is Credible (${result.verdict})`);
  assert(result.breakdown.evidenceSupport >= 85, `Evidence Support is >= 85 (${result.breakdown.evidenceSupport})`);
}

// ----------------------------------------------------
// Test Case 2: "India is in Asia." (Expected: SUPPORTS, Score >= 90)
// ----------------------------------------------------
console.log('\nTest Case 2: "India is in Asia." -> SUPPORTS (Score >= 90)');
{
  const claimText = 'India is in Asia.';
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
      sourceName: 'India Today Fact Check',
      sourceUrl: 'https://indiatoday.in/fact-check',
      sourceTier: 2,
      title: 'Women’s Asia Cup: India in Asia',
      publishedDate: '2026-08-25',
      evidenceText: 'Reporting confirms India in Asia tournament.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 92,
      relevanceScore: 1.0,
      keyEvidence: 'India in Asia',
      explanation: 'Verified Fact-Check source confirmation.',
      finalContribution: 92,
      url: 'https://indiatoday.in/fact-check',
      publisher: 'India Today Fact Check',
      sourceType: 'fact_check',
      snippet: 'Reporting confirms India in Asia tournament.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'claim-1',
      sourceName: 'The Indian Express',
      sourceUrl: 'https://indianexpress.com/article',
      sourceTier: 3,
      title: 'India Central Asia strategy',
      publishedDate: '2026-08-25',
      evidenceText: 'India regional policy in Central Asia.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'India in Central Asia',
      explanation: 'Broadsheet news verification.',
      finalContribution: 85,
      url: 'https://indianexpress.com/article',
      publisher: 'The Indian Express',
      sourceType: 'news',
      snippet: 'India regional policy in Central Asia.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 for "India is in Asia." (${result.score}/100)`);
  assert(result.verdict === 'Highly Credible', `Verdict is Highly Credible (${result.verdict})`);
}

// ----------------------------------------------------
// Test Case 3: "Ram Mandir is in Ayodhya, India." (Expected: SUPPORTS, Score >= 90)
// ----------------------------------------------------
console.log('\nTest Case 3: "Ram Mandir is in Ayodhya, India." -> SUPPORTS (Score >= 90)');
{
  const claimText = 'Ram Mandir is in Ayodhya, India.';
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
      sourceName: 'India Today Fact Check',
      sourceUrl: 'https://indiatoday.in/fact-check',
      sourceTier: 2,
      title: 'Ram Mandir in Ayodhya',
      publishedDate: '2026-08-25',
      evidenceText: 'Ram temple in Ayodhya Uttar Pradesh India.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 92,
      relevanceScore: 1.0,
      keyEvidence: 'Ayodhya Ram temple',
      explanation: 'Fact-check corroboration.',
      finalContribution: 92,
      url: 'https://indiatoday.in/fact-check',
      publisher: 'India Today Fact Check',
      sourceType: 'fact_check',
      snippet: 'Ram temple in Ayodhya Uttar Pradesh India.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 90, `Score is >= 90 for "Ram Mandir is in Ayodhya, India." (${result.score}/100)`);
}

// ----------------------------------------------------
// Test Case 4: Deliberately false geographical claim ("Asia is the smallest continent.")
// ----------------------------------------------------
console.log('\nTest Case 4: Deliberately false claim ("Asia is the smallest continent.") -> CONTRADICTS (Score <= 30)');
{
  const claimText = 'Asia is the smallest continent.';
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
      sourceUrl: 'https://britannica.com/place/Asia',
      sourceTier: 4,
      title: 'Asia Facts',
      publishedDate: null,
      evidenceText: "Asia is the world's largest continent by area and population.",
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: "world's largest continent",
      explanation: "Direct contradiction: Reference documents Asia as largest continent, disproving claim of smallest.",
      finalContribution: 82,
      url: 'https://britannica.com/place/Asia',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet: "Asia is the world's largest continent by area and population.",
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 30, `Score is low (${result.score} <= 30)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Verdict refutes false claim (${result.verdict})`);
  assert(result.breakdown.evidenceSupport === 0, `Evidence Support is 0 on direct contradiction (${result.breakdown.evidenceSupport})`);
}

// ----------------------------------------------------
// Test Case 5: Query Generation Validation
// ----------------------------------------------------
console.log('\nTest Case 5: Semantic Search Query Generation');
{
  const queries = evidenceRetrieverService.generateSearchQueries('Asia is the largest continent.');
  assert(queries.length >= 2, `Generated at least 2 queries (${queries.length})`);
  assert(queries.some((q) => q.toLowerCase().includes('largest continent')), `Includes 'largest continent' query (${JSON.stringify(queries)})`);
}

console.log(`\n========================================`);
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
