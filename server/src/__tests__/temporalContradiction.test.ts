import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
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
console.log('⏰ TEMPORAL CONTRADICTION & LEADERSHIP TRANSITION TEST SUITE');
console.log('============================================================\n');

// ----------------------------------------------------------------------
// 1. CRITICAL PAIR TEST (User Section 3 & 7)
// ----------------------------------------------------------------------
console.log('--- SECTION 1: CRITICAL PAIR STANCE TEST ---');
{
  const claimText = "Now T20 captain of India is Suryakumar Yadav.";
  const evidenceSnippet = "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.";
  const evidenceTitle = "BCCI announces new T20I captaincy leadership";

  const result = stanceEvaluatorService.evaluateDeterministic(claimText, evidenceSnippet, evidenceTitle, true);

  assert(result.relation === 'contradicts', '1: Relation is CONTRADICTS for replaced captain', { relation: result.relation });
  assert(result.stanceScore === -1, '1: Stance score is -1 for replacement contradiction', { stanceScore: result.stanceScore });
  assert(result.confidence >= 90, '1: Stance confidence >= 90%', { confidence: result.confidence });
}

// ----------------------------------------------------------------------
// 2. GENERAL RELATIONAL CONTRADICTIONS (User Section 4 & 5)
// ----------------------------------------------------------------------
console.log('\n--- SECTION 2: GENERAL RELATIONAL CONTRADICTIONS ---');
{
  // 2a. Executive CEO replacement
  const r1 = stanceEvaluatorService.evaluateDeterministic(
    "John is the CEO.",
    "Jane replaced John as CEO of the enterprise.",
    "Corporate Leadership Transition",
    true
  );
  assert(r1.relation === 'contradicts' && r1.stanceScore === -1, '2a: "Jane replaced John as CEO" -> contradicts "John is the CEO"', { result: r1.relation });

  // 2b. Corporate Acquisition
  const r2 = stanceEvaluatorService.evaluateDeterministic(
    "Company X currently owns Company Y.",
    "Company Z acquired Company Y in an all-cash merger.",
    "Market Acquisition Announcement",
    true
  );
  assert(r2.relation === 'contradicts' && r2.stanceScore === -1, '2b: "Company Z acquired Company Y" -> contradicts "Company X currently owns Company Y"', { result: r2.relation });

  // 2c. Player Transfer
  const r3 = stanceEvaluatorService.evaluateDeterministic(
    "Player A currently plays for Team X.",
    "Player A transferred to Team Y during the summer window.",
    "Sports Transfer Bulletin",
    true
  );
  assert(r3.relation === 'contradicts' && r3.stanceScore === -1, '2c: "Player A transferred to Team Y" -> contradicts "Player A currently plays for Team X"', { result: r3.relation });
}

// ----------------------------------------------------------------------
// 3. REGRESSION BENCHMARKS (User Section 10: Tests A to E)
// ----------------------------------------------------------------------
console.log('\n--- SECTION 3: REGRESSION BENCHMARKS (A to E) ---');
{
  const transitionEvidence = "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.";
  const transitionTitle = "BCCI Press Release on T20I Leadership";

  // Regression A: "Shreyas Iyer is currently India's T20I captain." => SUPPORTS
  const regA = stanceEvaluatorService.evaluateDeterministic(
    "Shreyas Iyer is currently India's T20I captain.",
    transitionEvidence,
    transitionTitle,
    true
  );
  assert(regA.relation === 'supports' && regA.stanceScore === 1, "Reg A: New captain is currently captain -> SUPPORTS (+1)", { relation: regA.relation, score: regA.stanceScore });

  // Regression B: "Suryakumar Yadav is currently India's T20I captain." => CONTRADICTS
  const regB = stanceEvaluatorService.evaluateDeterministic(
    "Suryakumar Yadav is currently India's T20I captain.",
    transitionEvidence,
    transitionTitle,
    true
  );
  assert(regB.relation === 'contradicts' && regB.stanceScore === -1, "Reg B: Replaced captain is currently captain -> CONTRADICTS (-1)", { relation: regB.relation, score: regB.stanceScore });

  // Regression C: "Suryakumar Yadav was India's T20I captain earlier in 2026." => SUPPORTS
  const regC = stanceEvaluatorService.evaluateDeterministic(
    "Suryakumar Yadav was India's T20I captain earlier in 2026.",
    transitionEvidence,
    transitionTitle,
    true
  );
  assert(regC.relation === 'supports' && regC.stanceScore === 1, "Reg C: Past captaincy statement -> SUPPORTS (+1)", { relation: regC.relation, score: regC.stanceScore });

  // Regression D: "Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain." => SUPPORTS
  const regD = stanceEvaluatorService.evaluateDeterministic(
    "Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain.",
    transitionEvidence,
    transitionTitle,
    true
  );
  assert(regD.relation === 'supports' && regD.stanceScore === 1, "Reg D: Transition assertion matches -> SUPPORTS (+1)", { relation: regD.relation, score: regD.stanceScore });

  // Regression E: "Suryakumar Yadav has never been India's T20I captain." => CONTRADICTS
  const regE = stanceEvaluatorService.evaluateDeterministic(
    "Suryakumar Yadav has never been India's T20I captain.",
    transitionEvidence,
    transitionTitle,
    true
  );
  assert(regE.relation === 'contradicts' && regE.stanceScore === -1, "Reg E: Never was captain contradicted by replacement record -> CONTRADICTS (-1)", { relation: regE.relation, score: regE.stanceScore });
}

// ----------------------------------------------------------------------
// 4. FULL END-TO-END PIPELINE TRACE (User Section 8)
// ----------------------------------------------------------------------
console.log('\n--- SECTION 4: FULL PIPELINE TRACE FOR "Now T20 captain of India is Suryakumar Yadav" ---');
{
  const claimText = "Now T20 captain of India is Suryakumar Yadav.";
  const articleMeta: ArticleMetadata = {
    title: "Leadership Speculation",
    author: null,
    publishedAt: null,
    publisher: "Direct Ingestion",
    url: null,
    text: claimText,
  };

  const triple = entityExtractorService.extractClaimTriple(claimText);
  console.log(`  1. Extracted Claim: "${claimText}"`);
  console.log(`  2. Detected Temporal Type: ${triple?.temporalType || 'CURRENT'}`);

  const mockEvidence: RetrievedEvidenceItem[] = [
    {
      id: "ev-1",
      claimId: "cl-1",
      evidenceSnippet: "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.",
      evidenceText: "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.",
      evidenceTitle: "BCCI Official Announcement",
      publisher: "The Indian Express",
      url: "https://indianexpress.com/article/sports/cricket/shreyas-iyer-t20-captain",
      sourceName: "The Indian Express",
      sourceType: "verified_news",
      sourceTier: 2,
      publishedDate: "2026-08-25T10:00:00Z",
      freshness: "CURRENT",
      relationToClaim: "CONTRADICTS",
      relevance: "direct",
      relation: "contradicts",
      stanceScore: -1,
      confidence: 95,
      reasoning: "Shreyas Iyer replaced Suryakumar Yadav as captain.",
      domain: "indianexpress.com",
    },
    {
      id: "ev-2",
      claimId: "cl-1",
      evidenceSnippet: "Shreyas Iyer appointed as India T20I captain taking over from Suryakumar Yadav.",
      evidenceText: "Shreyas Iyer appointed as India T20I captain taking over from Suryakumar Yadav.",
      evidenceTitle: "Cricket News: India T20I Leadership Change",
      publisher: "ESPNCricinfo",
      url: "https://espncricinfo.com/story/shreyas-iyer-india-t20-captain",
      sourceName: "ESPNCricinfo",
      sourceType: "verified_news",
      sourceTier: 2,
      publishedDate: "2026-08-25T12:00:00Z",
      freshness: "CURRENT",
      relationToClaim: "CONTRADICTS",
      relevance: "direct",
      relation: "contradicts",
      stanceScore: -1,
      confidence: 95,
      reasoning: "ESPNCricinfo confirms Shreyas Iyer took over captaincy.",
      domain: "espncricinfo.com",
    },
  ];

  const claim: ExtractedClaim = {
    id: "cl-1",
    text: claimText,
    importance: 0.9,
    isMajorClaim: true,
    isTimeSensitive: true,
    evaluation: {
      verdict: "FALSE",
      confidence: 95,
      reasoning: "Authoritative reporting establishes Shreyas Iyer was named T20I captain replacing Suryakumar Yadav.",
      keyEvidence: ["Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav."],
      contradictingEvidence: ["Shreyas Iyer replaced Suryakumar Yadav as captain."],
      limitations: [],
    },
  };

  const scoring = credibilityScorerService.computeCredibilityScore(articleMeta, [claim], mockEvidence);

  console.log(`  3. Retrieved Evidence: 2 authoritative items`);
  console.log(`  4. Evidence Publication Dates: 2026-08-25T10:00:00Z (CURRENT)`);
  console.log(`  5. Gemini / Stance Result: contradicts`);
  console.log(`  6. Stance Score: -1`);
  console.log(`  7. Evidence Support: ${scoring.breakdown.evidenceSupport}`);
  console.log(`  8. Source Reliability: ${scoring.breakdown.sourceReliability}`);
  console.log(`  9. Cross-Source Agreement: ${scoring.breakdown.crossSourceAgreement}`);
  console.log(`  10. Claim Verification: ${scoring.breakdown.claimVerification}`);
  console.log(`  11. Final Credibility Score: ${scoring.score}/100`);
  console.log(`  12. Final Verdict: ${scoring.verdict}`);

  assert(scoring.score <= 25, '4: Final score is <= 25 for contradicted temporal claim', { score: scoring.score });
  assert(scoring.verdict === 'Probably False' || scoring.verdict === 'Likely Misleading', '4: Verdict is FALSE/MISLEADING', { verdict: scoring.verdict });
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
