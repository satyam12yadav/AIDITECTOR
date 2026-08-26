import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
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
console.log('🔬 CONTRADICTION VS UNCERTAINTY TEST SUITE');
console.log('============================================================\n');

const dummyArticle: ArticleMetadata = {
  title: "Scientific Knowledge Forensic Ingestion",
  author: null,
  publishedAt: null,
  publisher: "Direct Ingestion",
  url: null,
  text: "Scientific and general knowledge factual verification.",
};

// ----------------------------------------------------------------------
// 1. REQUISITE TEST 1: "The Earth is the largest planet in the Solar System." -> CONTRADICTS
// ----------------------------------------------------------------------
console.log('--- TEST 1: "The Earth is the largest planet in the Solar System." ---');
{
  const claimText = "The Earth is the largest planet in the Solar System.";
  const jupiterEvidence = "Jupiter is the largest planet in the Solar System, with a mass more than two and a half times that of all the other planets combined.";
  const jupiterTitle = "NASA Solar System Exploration: Jupiter Overview";

  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, jupiterEvidence, jupiterTitle, true);
  assert(stance.relation === 'contradicts', 'T1: Stance is CONTRADICTS for false superlative claim (Earth vs Jupiter)', { relation: stance.relation });
  assert(stance.stanceScore === -1, 'T1: Stance score is -1', { stanceScore: stance.stanceScore });
  assert(stance.confidence >= 95, 'T1: Confidence >= 95%', { confidence: stance.confidence });

  const claim: ExtractedClaim = {
    id: "cl-earth-planet",
    text: claimText,
    importance: 0.9,
  };

  const evidenceItem: RetrievedEvidenceItem = {
    id: "ev-jupiter-1",
    claimId: "cl-earth-planet",
    sourceName: "NASA Solar System Exploration",
    sourceUrl: "https://solarsystem.nasa.gov/planets/jupiter/overview/",
    domain: "nasa.gov",
    sourceTier: 1,
    sourceReliability: 98,
    title: jupiterTitle,
    publishedDate: "2026-01-15T00:00:00Z",
    evidenceText: jupiterEvidence,
    relationToClaim: "CONTRADICTS",
    relevance: "direct",
    confidence: 99,
    credibilityScore: 98,
    relevanceScore: 1.0,
    keyEvidence: "Jupiter is the largest planet in the Solar System",
    explanation: "NASA astronomical records confirm Jupiter is largest planet, refuting Earth.",
    finalContribution: 98,
    stance: "contradicts",
    url: "https://solarsystem.nasa.gov/planets/jupiter/overview/",
    publisher: "NASA",
    sourceType: "official",
    snippet: jupiterEvidence,
    relation: "contradicts",
  };

  const res = credibilityScorerService.computeCredibilityScore(dummyArticle, [claim], [evidenceItem]);
  assert(claim.relation === 'contradicts', 'T1: Claim level relation is CONTRADICTS', { relation: claim.relation });
  assert(claim.claimScore <= 15, 'T1: Claim score <= 15', { claimScore: claim.claimScore });
  assert(res.score <= 25, 'T1: Final credibility score <= 25', { score: res.score });
  assert(res.verdict === 'Probably False' || res.verdict === 'Likely Misleading', 'T1: Verdict is Probably False', { verdict: res.verdict });
}

// ----------------------------------------------------------------------
// 2. REQUISITE TEST 2: "The Moon is made entirely of cheese." -> CONTRADICTS
// ----------------------------------------------------------------------
console.log('\n--- TEST 2: "The Moon is made entirely of cheese." ---');
{
  const claimText = "The Moon is made entirely of cheese.";
  const moonEvidence = "The Moon is a rocky planetary body composed primarily of silicate rocks, anorthosite crust, and basaltic maria with an iron-rich metallic core.";
  const moonTitle = "NASA Moon Geology & Scientific Composition";

  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, moonEvidence, moonTitle, true);
  assert(stance.relation === 'contradicts', 'T2: Stance is CONTRADICTS for false composition claim (cheese vs silicate rock)', { relation: stance.relation });
  assert(stance.stanceScore === -1, 'T2: Stance score is -1', { stanceScore: stance.stanceScore });
  assert(stance.confidence >= 95, 'T2: Confidence >= 95%', { confidence: stance.confidence });

  const claim: ExtractedClaim = {
    id: "cl-moon-cheese",
    text: claimText,
    importance: 0.9,
  };

  const evidenceItem: RetrievedEvidenceItem = {
    id: "ev-moon-rock-1",
    claimId: "cl-moon-cheese",
    sourceName: "NASA Lunar Science Institute",
    sourceUrl: "https://moon.nasa.gov/inside-and-out/composition/",
    domain: "nasa.gov",
    sourceTier: 1,
    sourceReliability: 98,
    title: moonTitle,
    publishedDate: "2026-01-10T00:00:00Z",
    evidenceText: moonEvidence,
    relationToClaim: "CONTRADICTS",
    relevance: "direct",
    confidence: 99,
    credibilityScore: 98,
    relevanceScore: 1.0,
    keyEvidence: "The Moon is a rocky planetary body composed primarily of silicate rocks",
    explanation: "Geological records confirm Moon is rocky body, refuting cheese composition.",
    finalContribution: 98,
    stance: "contradicts",
    url: "https://moon.nasa.gov/inside-and-out/composition/",
    publisher: "NASA",
    sourceType: "official",
    snippet: moonEvidence,
    relation: "contradicts",
  };

  const res = credibilityScorerService.computeCredibilityScore(dummyArticle, [claim], [evidenceItem]);
  assert(claim.relation === 'contradicts', 'T2: Claim level relation is CONTRADICTS', { relation: claim.relation });
  assert(claim.claimScore <= 15, 'T2: Claim score <= 15', { claimScore: claim.claimScore });
  assert(res.score <= 25, 'T2: Final credibility score <= 25', { score: res.score });
}

// ----------------------------------------------------------------------
// 3. REQUISITE TEST 3: "Jupiter is the largest planet in the Solar System." -> SUPPORTS
// ----------------------------------------------------------------------
console.log('\n--- TEST 3: "Jupiter is the largest planet in the Solar System." ---');
{
  const claimText = "Jupiter is the largest planet in the Solar System.";
  const jupiterEvidence = "Jupiter is the largest planet in the Solar System, with a radius of nearly 70,000 kilometers.";
  const jupiterTitle = "NASA Solar System Exploration: Jupiter";

  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, jupiterEvidence, jupiterTitle, true);
  assert(stance.relation === 'supports', 'T3: Stance is SUPPORTS for true superlative claim', { relation: stance.relation });
  assert(stance.stanceScore === 1, 'T3: Stance score is +1');

  const claim: ExtractedClaim = {
    id: "cl-jupiter-true",
    text: claimText,
    importance: 0.9,
  };

  const evidenceItem: RetrievedEvidenceItem = {
    id: "ev-jupiter-true-1",
    claimId: "cl-jupiter-true",
    sourceName: "NASA",
    sourceUrl: "https://solarsystem.nasa.gov/jupiter",
    domain: "nasa.gov",
    sourceTier: 1,
    sourceReliability: 98,
    title: jupiterTitle,
    publishedDate: "2026-01-15T00:00:00Z",
    evidenceText: jupiterEvidence,
    relationToClaim: "SUPPORTS",
    relevance: "direct",
    confidence: 99,
    credibilityScore: 98,
    relevanceScore: 1.0,
    keyEvidence: "Jupiter is the largest planet in the Solar System",
    explanation: "Astronomical record confirms Jupiter is largest.",
    finalContribution: 98,
    stance: "supports",
    url: "https://solarsystem.nasa.gov/jupiter",
    publisher: "NASA",
    sourceType: "official",
    snippet: jupiterEvidence,
    relation: "supports",
  };

  const res = credibilityScorerService.computeCredibilityScore(dummyArticle, [claim], [evidenceItem]);
  assert(claim.relation === 'supports', 'T3: Claim level relation is SUPPORTS');
  assert(res.score >= 85, 'T3: Score is high (>= 85)', { score: res.score });
  assert(res.verdict === 'Probably Credible' || res.verdict === 'Highly Credible', 'T3: Verdict is Probably Credible');
}

// ----------------------------------------------------------------------
// 4. REQUISITE TEST 4: "The Moon is a rocky body." -> SUPPORTS
// ----------------------------------------------------------------------
console.log('\n--- TEST 4: "The Moon is a rocky body." ---');
{
  const claimText = "The Moon is a rocky body.";
  const moonEvidence = "The Moon is a rocky planetary body with a differentiated structure and silicate crust.";
  const moonTitle = "NASA Moon Science";

  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, moonEvidence, moonTitle, true);
  assert(stance.relation === 'supports', 'T4: Stance is SUPPORTS for true composition claim', { relation: stance.relation });
  assert(stance.stanceScore === 1, 'T4: Stance score is +1');
}

// ----------------------------------------------------------------------
// 5. REQUISITE TEST 5: General Examples (Capital, Ocean, Boiling Point)
// ----------------------------------------------------------------------
console.log('\n--- TEST 5: General Contradiction Examples ---');
{
  // 5a: "Paris is the capital of Germany." vs "Berlin is the capital of Germany."
  const capStance = stanceEvaluatorService.evaluateDeterministic(
    "Paris is the capital of Germany.",
    "Berlin is the capital of Germany and its largest city by population.",
    "Germany Overview - Capital & Government",
    true
  );
  assert(capStance.relation === 'contradicts' && capStance.stanceScore === -1, 'T5a: Capital city contradiction (Paris vs Berlin -> -1)');

  // 5b: "The Pacific Ocean is the smallest ocean." vs "The Pacific Ocean is the largest ocean."
  const oceanStance = stanceEvaluatorService.evaluateDeterministic(
    "The Pacific Ocean is the smallest ocean.",
    "The Pacific Ocean is the largest and deepest ocean basin on Earth.",
    "NOAA Ocean Exploration: Pacific Ocean",
    true
  );
  assert(oceanStance.relation === 'contradicts' && oceanStance.stanceScore === -1, 'T5b: Ocean superlative polarity contradiction (smallest vs largest -> -1)');

  // 5c: "Water boils at 20°C at standard atmospheric pressure." vs "Water boils at approximately 100°C"
  const boilStance = stanceEvaluatorService.evaluateDeterministic(
    "Water boils at 20°C at standard atmospheric pressure.",
    "Water boils at approximately 100 °C (212 °F) at standard atmospheric pressure (1 atm).",
    "Physical Properties of Water - Thermodynamics",
    true
  );
  assert(boilStance.relation === 'contradicts' && boilStance.stanceScore === -1, 'T5c: Physical boiling point constant contradiction (20°C vs 100°C -> -1)');
}

// ----------------------------------------------------------------------
// 6. REQUISITE TEST 6: Obscure unsupported claim MUST remain UNCLEAR
// ----------------------------------------------------------------------
console.log('\n--- TEST 6: Obscure Unsupported Claim -> UNCLEAR (NOT Contradicted) ---');
{
  const obscureClaim: ExtractedClaim = {
    id: "cl-obscure-village",
    text: "A newly discovered village named Xyzoria has exactly 417 residents.",
    importance: 0.5,
  };

  const res = credibilityScorerService.computeCredibilityScore(dummyArticle, [obscureClaim], []);
  assert(obscureClaim.relation === 'unclear', 'T6: Lack of evidence produces UNCLEAR relation (NOT contradicted)', { relation: obscureClaim.relation });
  assert(obscureClaim.claimScore >= 45 && obscureClaim.claimScore <= 55, 'T6: Neutral baseline score (45-55)', { score: obscureClaim.claimScore });
  assert(res.verdict === 'Needs Verification', 'T6: Verdict is Needs Verification (NOT false)', { verdict: res.verdict });
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
