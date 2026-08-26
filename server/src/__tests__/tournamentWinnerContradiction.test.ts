import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { sourceRegistry } from '../services/sourceRegistry.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
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
console.log('🏆 TOURNAMENT WINNER & TEMPORAL CONTRADICTION TEST SUITE');
console.log('============================================================\n');

const dummyArticle: ArticleMetadata = {
  title: "World Cup Forensic Ingestion",
  author: null,
  publishedAt: null,
  publisher: "Direct Ingestion",
  url: null,
  text: "Tournament result claim verification.",
};

const fifa2026Evidence = "Spain won the 2026 FIFA World Cup by defeating Argentina 1-0 in the final.";
const fifa2026Title = "FIFA World Cup 2026 Final: Spain Crowned World Champions";

// ----------------------------------------------------------------------
// 1. REQUISITE TEST 1: "India won the 2026 FIFA World Cup." -> CONTRADICTS
// ----------------------------------------------------------------------
console.log('--- TEST 1: "India won the 2026 FIFA World Cup." ---');
{
  const claimText = "India won the 2026 FIFA World Cup.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, fifa2026Evidence, fifa2026Title, true);
  assert(stance.relation === 'contradicts', 'T1: Stance is CONTRADICTS for false winner (India vs Spain)', { relation: stance.relation });
  assert(stance.stanceScore === -1, 'T1: Stance score is -1', { stanceScore: stance.stanceScore });
  assert(stance.confidence >= 95, 'T1: Confidence >= 95%', { confidence: stance.confidence });

  const claim: ExtractedClaim = {
    id: "cl-fifa-1",
    text: claimText,
    importance: 0.95,
  };

  const evidenceItem: RetrievedEvidenceItem = {
    id: "ev-fifa-1",
    claimId: "cl-fifa-1",
    sourceName: "FIFA Official",
    sourceUrl: "https://www.fifa.com/tournaments/mens/worldcup/2026/news",
    domain: "fifa.com",
    sourceTier: 1,
    sourceReliability: 98,
    title: fifa2026Title,
    publishedDate: "2026-07-20T10:00:00Z",
    evidenceText: fifa2026Evidence,
    relationToClaim: "CONTRADICTS",
    relevance: "direct",
    confidence: 98,
    credibilityScore: 98,
    relevanceScore: 1.0,
    keyEvidence: "Spain won the 2026 FIFA World Cup defeating Argentina 1-0",
    explanation: "Official FIFA record confirms Spain won, refuting India.",
    finalContribution: 98,
    stance: "contradicts",
    url: "https://www.fifa.com/tournaments/mens/worldcup/2026/news",
    publisher: "FIFA Official",
    sourceType: "official",
    snippet: fifa2026Evidence,
    relation: "contradicts",
  };

  const res = credibilityScorerService.computeCredibilityScore(dummyArticle, [claim], [evidenceItem]);
  assert(claim.relation === 'contradicts', 'T1: Claim level relation is CONTRADICTS', { relation: claim.relation });
  assert(claim.claimScore <= 10, 'T1: Claim score <= 10', { claimScore: claim.claimScore });
  assert(res.score <= 20, 'T1: Final credibility score <= 20', { score: res.score });
  assert(res.verdict === 'Probably False' || res.verdict === 'Likely Misleading', 'T1: Verdict is Probably False', { verdict: res.verdict });
}

// ----------------------------------------------------------------------
// 2. REQUISITE TEST 2: "Spain won the 2026 FIFA World Cup." -> SUPPORTS
// ----------------------------------------------------------------------
console.log('\n--- TEST 2: "Spain won the 2026 FIFA World Cup." ---');
{
  const claimText = "Spain won the 2026 FIFA World Cup.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, fifa2026Evidence, fifa2026Title, true);
  assert(stance.relation === 'supports', 'T2: Stance is SUPPORTS for actual winner (Spain)', { relation: stance.relation });
  assert(stance.stanceScore === 1, 'T2: Stance score is +1', { stanceScore: stance.stanceScore });
  assert(stance.confidence >= 95, 'T2: Confidence >= 95%', { confidence: stance.confidence });

  const claim: ExtractedClaim = {
    id: "cl-fifa-2",
    text: claimText,
    importance: 0.9,
  };

  const evidenceItem: RetrievedEvidenceItem = {
    id: "ev-fifa-2",
    claimId: "cl-fifa-2",
    sourceName: "FIFA Official",
    sourceUrl: "https://www.fifa.com/tournaments/mens/worldcup/2026/news",
    domain: "fifa.com",
    sourceTier: 1,
    sourceReliability: 98,
    title: fifa2026Title,
    publishedDate: "2026-07-20T10:00:00Z",
    evidenceText: fifa2026Evidence,
    relationToClaim: "SUPPORTS",
    relevance: "direct",
    confidence: 98,
    credibilityScore: 98,
    relevanceScore: 1.0,
    keyEvidence: "Spain won the 2026 FIFA World Cup",
    explanation: "Official FIFA record confirms Spain won.",
    finalContribution: 98,
    stance: "supports",
    url: "https://www.fifa.com/tournaments/mens/worldcup/2026/news",
    publisher: "FIFA Official",
    sourceType: "official",
    snippet: fifa2026Evidence,
    relation: "supports",
  };

  const res = credibilityScorerService.computeCredibilityScore(dummyArticle, [claim], [evidenceItem]);
  assert(claim.relation === 'supports', 'T2: Claim level relation is SUPPORTS');
  assert(res.score >= 85, 'T2: Final credibility score >= 85', { score: res.score });
  assert(res.verdict === 'Probably Credible' || res.verdict === 'Highly Credible', 'T2: Verdict is Probably Credible', { verdict: res.verdict });
}

// ----------------------------------------------------------------------
// 3. REQUISITE TEST 3: "Argentina won the 2026 FIFA World Cup." -> CONTRADICTS
// ----------------------------------------------------------------------
console.log('\n--- TEST 3: "Argentina won the 2026 FIFA World Cup." ---');
{
  const claimText = "Argentina won the 2026 FIFA World Cup.";
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, fifa2026Evidence, fifa2026Title, true);
  assert(stance.relation === 'contradicts', 'T3: Runner-up / conflicting winner evaluated as CONTRADICTS (-1)', { relation: stance.relation });
  assert(stance.stanceScore === -1, 'T3: Stance score is -1', { stanceScore: stance.stanceScore });
}

// ----------------------------------------------------------------------
// 4. REQUISITE TEST 4: "India won the 2026 ICC Men's T20 World Cup." -> SUPPORTS
// ----------------------------------------------------------------------
console.log('\n--- TEST 4: "India won the 2026 ICC Men\'s T20 World Cup." ---');
{
  const claimText = "India won the 2026 ICC Men's T20 World Cup.";
  const t20Evidence = "India won the 2026 ICC Men's T20 World Cup by defeating South Africa in a thrilling final.";
  const t20Title = "ICC World Cup 2026: India Crowned Champions";

  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, t20Evidence, t20Title, true);
  assert(stance.relation === 'supports', 'T4: Stance is SUPPORTS for actual T20 champion', { relation: stance.relation });
  assert(stance.stanceScore === 1, 'T4: Stance score is +1');
}

// ----------------------------------------------------------------------
// 5. REQUISITE TEST 5: "Suryakumar Yadav is currently India's T20 captain." -> CONTRADICTED
// ----------------------------------------------------------------------
console.log('\n--- TEST 5: "Suryakumar Yadav is currently India\'s T20 captain." ---');
{
  const claimText = "Suryakumar Yadav is currently India's T20 captain.";
  const transitionEvidence = "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.";
  const transitionTitle = "BCCI Press Release on T20I Leadership";

  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, transitionEvidence, transitionTitle, true);
  assert(stance.relation === 'contradicts', 'T5: Replaced captain is CONTRADICTED using current evidence', { relation: stance.relation });
  assert(stance.stanceScore === -1, 'T5: Stance score is -1');
}

// ----------------------------------------------------------------------
// 6. REQUISITE TEST 6: Historical winner claim not contradicted by newer result
// ----------------------------------------------------------------------
console.log('\n--- TEST 6: Historical Winner Claim ("Argentina won the 2022 FIFA World Cup") ---');
{
  const claimText = "Argentina won the 2022 FIFA World Cup.";
  const histEvidence = "Argentina won the 2022 FIFA World Cup in Qatar by defeating France in the final.";
  const histTitle = "FIFA World Cup 2022 Qatar Final";

  // 6a: Evaluated against 2022 historical evidence -> SUPPORTS
  const stanceHist = stanceEvaluatorService.evaluateDeterministic(claimText, histEvidence, histTitle, false);
  assert(stanceHist.relation === 'supports', 'T6a: Historical 2022 winner assertion supported by 2022 evidence', { relation: stanceHist.relation });

  // 6b: Evaluated against 2026 evidence (different tournament edition) -> NOT falsely contradicted
  const stance2026 = stanceEvaluatorService.evaluateDeterministic(claimText, fifa2026Evidence, fifa2026Title, false);
  assert(stance2026.relation !== 'contradicts', 'T6b: 2026 tournament evidence does NOT falsely contradict 2022 historical fact', { relation: stance2026.relation });
}

// ----------------------------------------------------------------------
// 7. SOURCE REGISTRY FIFA TIER 1 CHECK
// ----------------------------------------------------------------------
console.log('\n--- TEST 7: Source Registry FIFA Authority Check ---');
{
  const fifa = sourceRegistry.getSourceCredibility('https://www.fifa.com/worldcup');
  assert(fifa.credibilityTier === 1 && fifa.reliabilityScore >= 95, 'T7: FIFA official domain recognized as Tier 1 (Score >= 95)', { tier: fifa.credibilityTier, score: fifa.reliabilityScore });
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
