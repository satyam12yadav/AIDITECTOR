import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { ExtractedClaim, RetrievedEvidenceItem, ArticleMetadata } from '../types/api.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, diagnostics?: Record<string, any>) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (diagnostics) {
      console.error(`     Diagnostic Report:`, JSON.stringify(diagnostics, null, 2));
    }
    failedCount++;
  }
}

console.log('\n============================================================');
console.log('🔍 STEP 9: ADVANCED EVIDENCE RETRIEVAL & SOURCE QUALITY TESTS');
console.log('============================================================\n');

// -------------------------------------------------------------
// TEST 1: "Asia is the largest continent."
// -------------------------------------------------------------
console.log('--- TEST 1: "Asia is the largest continent." ---');
{
  const claimText = 'Asia is the largest continent.';
  const queries = evidenceRetrieverService.generateSearchQueries(claimText);
  assert(queries.length >= 2, 'T1: Generated 2-4 semantic search queries', { queries });
  assert(queries.some((q) => q.toLowerCase().includes('largest continent') || q.toLowerCase().includes('asia')), 'T1: Queries include semantic topic');

  const snippet = 'Asia is the world\'s largest and most populous continent, covering 30% of Earth\'s land area.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Encyclopædia Britannica');
  assert(stance.relation === 'supports' && stance.relevance === 'direct', 'T1: Direct authoritative reference evaluated as SUPPORTS', { relation: stance.relation, relevance: stance.relevance });
}

// -------------------------------------------------------------
// TEST 2: "India is in Asia."
// -------------------------------------------------------------
console.log('\n--- TEST 2: "India is in Asia." ---');
{
  const claimText = 'India is in Asia.';
  const queries = evidenceRetrieverService.generateSearchQueries(claimText);
  assert(queries.some((q) => q.toLowerCase().includes('india') && (q.toLowerCase().includes('location') || q.toLowerCase().includes('asia'))), 'T2: Generated focused location queries', { queries });

  const snippet = 'India, officially the Republic of India, is a country in South Asia.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'National Portal of India');
  assert(stance.relation === 'supports' && stance.stanceScore === 1, 'T2: Authoritative evidence corroborates location (+1)', { stanceScore: stance.stanceScore });
}

// -------------------------------------------------------------
// TEST 3: "Ram Mandir is in Pakistan."
// -------------------------------------------------------------
console.log('\n--- TEST 3: "Ram Mandir is in Pakistan." ---');
{
  const claimText = 'Ram Mandir is in Pakistan.';
  const queries = evidenceRetrieverService.generateSearchQueries(claimText);
  assert(queries.some((q) => q.toLowerCase().includes('ram mandir') && q.toLowerCase().includes('location')), 'T3: Generates underlying factual location query', { queries });

  const snippet = 'The Ram Mandir is a Hindu temple located at the Ram Janmabhoomi site in Ayodhya, Uttar Pradesh, India.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Encyclopædia Britannica');
  assert(stance.relation === 'contradicts' && stance.stanceScore === -1, 'T3: Authoritative record refutes Pakistan location (-1)', { relation: stance.relation });
}

// -------------------------------------------------------------
// TEST 4: "Ram Mandir is in Ayodhya, India."
// -------------------------------------------------------------
console.log('\n--- TEST 4: "Ram Mandir is in Ayodhya, India." ---');
{
  const claimText = 'Ram Mandir is in Ayodhya, India.';
  const snippet = 'The Ram Mandir is located in Ayodhya, Uttar Pradesh, India.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Encyclopædia Britannica');
  assert(stance.relation === 'supports' && stance.confidence >= 95, 'T4: Strong supporting evidence verified (Conf >= 95%)', { relation: stance.relation, conf: stance.confidence });
}

// -------------------------------------------------------------
// TEST 5: Deliberately obscure unsupported claim -> UNCLEAR
// -------------------------------------------------------------
console.log('\n--- TEST 5: Deliberately obscure unsupported claim -> UNCLEAR ---');
{
  const claimText = 'An unrecognized metallic artifact was extracted from the Marianas trench yesterday by unknown diver.';
  const article: ArticleMetadata = { title: claimText, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimText };
  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const res = credibilityScorerService.computeCredibilityScore(article, claims, []);
  assert(claims[0].relation === 'unclear', 'T5: Obscure assertion evaluates as UNCLEAR', { rel: claims[0].relation });
  assert(res.score >= 45 && res.score <= 58, 'T5: Neutral score assigned (45-58), NOT FALSE', { score: res.score });
  assert(res.verdict === 'Needs Verification', 'T5: Verdict is Needs Verification', { verdict: res.verdict });
}

// -------------------------------------------------------------
// TEST 6: Current news claim -> Freshness evaluated
// -------------------------------------------------------------
console.log('\n--- TEST 6: Current news claim -> Freshness Evaluated ---');
{
  const freshCurrent = evidenceRetrieverService.computeFreshness(new Date().toISOString(), true);
  assert(freshCurrent === 'CURRENT', 'T6: Current timestamp categorized as CURRENT', { freshCurrent });

  const oldDate = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
  const freshOld = evidenceRetrieverService.computeFreshness(oldDate, true);
  assert(freshOld === 'OLD', 'T6: 400-day old timestamp categorized as OLD', { freshOld });
}

// -------------------------------------------------------------
// TEST 7: Historical claim -> Authoritative historical evidence accepted
// -------------------------------------------------------------
console.log('\n--- TEST 7: Historical claim -> Authoritative historical evidence accepted ---');
{
  const freshHist = evidenceRetrieverService.computeFreshness(null, false);
  assert(freshHist === 'RECENT', 'T7: Permanent / historical fact with null date retains valid freshness', { freshHist });
}

// -------------------------------------------------------------
// TEST 8: Two reputable sources disagree -> CONFLICTING_EVIDENCE
// -------------------------------------------------------------
console.log('\n--- TEST 8: Two reputable sources disagree -> CONFLICTING_EVIDENCE ---');
{
  const claimText = 'Trial outcome was approved by committee';
  const article: ArticleMetadata = { title: claimText, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimText };
  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const evItems: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1', claimId: 'c-1', sourceName: 'News Agency Alpha', sourceUrl: 'https://newsalpha.com/article', sourceTier: 3,
      domain: 'newsalpha.com', title: 'Committee Approval', publishedDate: '2026-08-20', evidenceText: 'Committee approved trial outcome.',
      relationToClaim: 'SUPPORTS', relevance: 'direct', confidence: 80, credibilityScore: 75, relevanceScore: 1.0, keyEvidence: 'approved outcome',
      explanation: 'Support.', finalContribution: 75, url: 'https://newsalpha.com/article', publisher: 'News Agency Alpha', sourceType: 'news', snippet: 'Approved outcome.', relation: 'supports'
    },
    {
      id: 'ev-2', claimId: 'c-1', sourceName: 'News Agency Beta', sourceUrl: 'https://newsbeta.com/article', sourceTier: 3,
      domain: 'newsbeta.com', title: 'Committee Rejection', publishedDate: '2026-08-20', evidenceText: 'Committee rejected and denied trial outcome.',
      relationToClaim: 'CONTRADICTS', relevance: 'direct', confidence: 80, credibilityScore: 75, relevanceScore: 1.0, keyEvidence: 'rejected outcome',
      explanation: 'Contradiction.', finalContribution: 75, url: 'https://newsbeta.com/article', publisher: 'News Agency Beta', sourceType: 'news', snippet: 'Rejected outcome.', relation: 'contradicts'
    },
  ];

  evidenceRetrieverService.calculateClaimConsensusMetrics(claims[0], evItems);
  assert(claims[0].consensusStatus === 'CONFLICTING_EVIDENCE', 'T8: Consensus detected as CONFLICTING_EVIDENCE', { status: claims[0].consensusStatus });
  assert(claims[0].independentSourceCount === 2, 'T8: Independent sources count is 2', { count: claims[0].independentSourceCount });

  const res = credibilityScorerService.computeCredibilityScore(article, claims, evItems);
  assert(claims[0].confidence <= 70, 'T8: Confidence reduced for conflicting sources', { conf: claims[0].confidence });
  assert(claims[0].reasoning?.includes('disagree') || claims[0].reasoning?.includes('conflicting'), 'T8: Reasoning notes disagreement', { reasoning: claims[0].reasoning });
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
