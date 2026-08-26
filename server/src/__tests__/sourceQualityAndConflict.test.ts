import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { sourceRegistry } from '../services/sourceRegistry.service.js';
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
console.log('🏛️  STEP 11: EVIDENCE QUALITY & CONFLICT RESOLUTION TEST SUITE');
console.log('============================================================\n');

const dummyArticle: ArticleMetadata = {
  title: "Test Ingestion",
  author: null,
  publishedAt: null,
  publisher: "Direct Ingestion",
  url: null,
  text: "Test content for source quality verification.",
};

// ----------------------------------------------------------------------
// 1. SOURCE REGISTRY & TRUST TIER CLASSIFICATION
// ----------------------------------------------------------------------
console.log('--- SECTION 1: SOURCE TRUST TIER CLASSIFICATION ---');
{
  const bcci = sourceRegistry.getSourceCredibility('https://www.bcci.tv/news/t20-captaincy');
  assert(bcci.credibilityTier === 1 && bcci.reliabilityScore >= 95, '1: BCCI classified as Tier 1 Official (Score >= 95)', { tier: bcci.credibilityTier, score: bcci.reliabilityScore });

  const pib = sourceRegistry.getSourceCredibility('https://pib.gov.in/pressrelease');
  assert(pib.credibilityTier === 1 && pib.reliabilityScore >= 95, '1: PIB classified as Tier 1 Official (Score >= 95)', { tier: pib.credibilityTier, score: pib.reliabilityScore });

  const reuters = sourceRegistry.getSourceCredibility('https://www.reuters.com/world/india');
  assert(reuters.credibilityTier === 2 && bcci.reliabilityScore >= 80, '1: Reuters classified as Tier 2 Wire Service', { tier: reuters.credibilityTier });

  const boom = sourceRegistry.getSourceCredibility('https://www.boomlive.in/fact-check');
  assert(boom.credibilityTier === 3 && boom.reliabilityScore >= 75, '1: BOOM classified as Tier 3 Fact-Checker', { tier: boom.credibilityTier, score: boom.reliabilityScore });

  const britannica = sourceRegistry.getSourceCredibility('https://www.britannica.com/place/Asia');
  assert(britannica.credibilityTier === 4, '1: Britannica classified as Tier 4 Reference Repository', { tier: britannica.credibilityTier });

  const unknownBlog = sourceRegistry.getSourceCredibility('https://random-tech-blog.xyz/news/story');
  assert(unknownBlog.credibilityTier === 5 && unknownBlog.reliabilityScore <= 50, '1: Unknown blog classified as Tier 5 (Score <= 50)', { tier: unknownBlog.credibilityTier, score: unknownBlog.reliabilityScore });
}

// ----------------------------------------------------------------------
// TEST A: Official source supports + several reputable sources support
// ----------------------------------------------------------------------
console.log('\n--- TEST A: Official Source + Reputable Corroboration ---');
{
  const claimA: ExtractedClaim = {
    id: "cl-a",
    text: "Shreyas Iyer is currently India's T20I captain.",
    importance: 0.9,
  };

  const evidenceA: RetrievedEvidenceItem[] = [
    {
      id: "ev-a1",
      claimId: "cl-a",
      sourceName: "BCCI",
      sourceUrl: "https://bcci.tv/news/captaincy",
      domain: "bcci.tv",
      sourceTier: 1,
      sourceReliability: 98,
      title: "BCCI Announcement",
      publishedDate: "2026-08-25T10:00:00Z",
      evidenceText: "BCCI officially names Shreyas Iyer as T20I captain.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: "BCCI names Shreyas Iyer as T20I captain",
      explanation: "Official announcement confirms captaincy.",
      finalContribution: 98,
      stance: "supports",
      url: "https://bcci.tv/news/captaincy",
      publisher: "BCCI",
      sourceType: "official",
      snippet: "BCCI officially names Shreyas Iyer as T20I captain.",
      relation: "supports",
    },
    {
      id: "ev-a2",
      claimId: "cl-a",
      sourceName: "The Indian Express",
      sourceUrl: "https://indianexpress.com/article/sports/cricket",
      domain: "indianexpress.com",
      sourceTier: 2,
      sourceReliability: 90,
      title: "Leadership Handover",
      publishedDate: "2026-08-25T11:00:00Z",
      evidenceText: "The Indian Express confirms Shreyas Iyer takes over as T20 captain.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 95,
      credibilityScore: 90,
      relevanceScore: 1.0,
      keyEvidence: "Shreyas Iyer takes over as T20 captain",
      explanation: "News report corroborates captaincy.",
      finalContribution: 90,
      stance: "supports",
      url: "https://indianexpress.com/article/sports/cricket",
      publisher: "The Indian Express",
      sourceType: "news",
      snippet: "The Indian Express confirms Shreyas Iyer takes over as T20 captain.",
      relation: "supports",
    },
  ];

  const resA = credibilityScorerService.computeCredibilityScore(dummyArticle, [claimA], evidenceA);
  assert(claimA.relation === 'supports', 'A: Claim evaluated as SUPPORTS', { relation: claimA.relation });
  assert(claimA.confidence >= 95, 'A: High confidence (>= 95%)', { confidence: claimA.confidence });
  assert(resA.score >= 85, 'A: Overall score is high (>= 85)', { score: resA.score });
  assert(resA.verdict === 'Probably Credible' || resA.verdict === 'Highly Credible', 'A: High credibility verdict', { verdict: resA.verdict });
}

// ----------------------------------------------------------------------
// TEST B: Unknown blog supports + reputable sources unavailable
// ----------------------------------------------------------------------
console.log('\n--- TEST B: Unknown Blog Only (No Reputable Corroboration) ---');
{
  const claimB: ExtractedClaim = {
    id: "cl-b",
    text: "Secret alien technology tested in remote desert.",
    importance: 0.8,
  };

  const evidenceB: RetrievedEvidenceItem[] = [
    {
      id: "ev-b1",
      claimId: "cl-b",
      sourceName: "ConspiracyBlogXYZ",
      sourceUrl: "https://conspiracy-blog.xyz/alien-tech",
      domain: "conspiracy-blog.xyz",
      sourceTier: 5,
      sourceReliability: 35,
      title: "Alien Tech Leaks",
      publishedDate: "2026-08-20T00:00:00Z",
      evidenceText: "Unverified claims of alien technology tested in desert.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 45,
      credibilityScore: 35,
      relevanceScore: 1.0,
      keyEvidence: "Alien technology tested in desert",
      explanation: "Low-trust blog mentions testing.",
      finalContribution: 35,
      stance: "supports",
      url: "https://conspiracy-blog.xyz/alien-tech",
      publisher: "ConspiracyBlogXYZ",
      sourceType: "other",
      snippet: "Unverified claims of alien technology tested in desert.",
      relation: "supports",
    },
  ];

  const resB = credibilityScorerService.computeCredibilityScore(dummyArticle, [claimB], evidenceB);
  assert(claimB.relation === 'unclear', 'B: Low trust blog alone evaluated as UNCLEAR / NEEDS VERIFICATION', { relation: claimB.relation });
  assert(claimB.confidence <= 50, 'B: Low confidence (<= 50%)', { confidence: claimB.confidence });
  assert(claimB.claimScore <= 55, 'B: Neutral unverified score (<= 55)', { claimScore: claimB.claimScore });
  assert(resB.verdict === 'Needs Verification', 'B: Overall verdict is Needs Verification', { verdict: resB.verdict });
}

// ----------------------------------------------------------------------
// TEST C: Official source contradicts + random blogs support
// ----------------------------------------------------------------------
console.log('\n--- TEST C: Official Source Contradicts vs Random Blogs Support ---');
{
  const claimC: ExtractedClaim = {
    id: "cl-c",
    text: "Central Bank abolishes cash transactions permanently.",
    importance: 0.95,
  };

  const evidenceC: RetrievedEvidenceItem[] = [
    {
      id: "ev-c1",
      claimId: "cl-c",
      sourceName: "Reserve Bank of India",
      sourceUrl: "https://rbi.org.in/press/cash-clarification",
      domain: "rbi.org.in",
      sourceTier: 1,
      sourceReliability: 98,
      title: "RBI Clarification on Currency",
      publishedDate: "2026-08-25T10:00:00Z",
      evidenceText: "RBI confirms rumors of cash abolishment are false and fabricated.",
      relationToClaim: "CONTRADICTS",
      relevance: "direct",
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: "RBI confirms cash abolishment rumors are false",
      explanation: "Primary authority refutes the claim.",
      finalContribution: 98,
      stance: "contradicts",
      url: "https://rbi.org.in/press/cash-clarification",
      publisher: "Reserve Bank of India",
      sourceType: "official",
      snippet: "RBI confirms rumors of cash abolishment are false and fabricated.",
      relation: "contradicts",
    },
    {
      id: "ev-c2",
      claimId: "cl-c",
      sourceName: "ClickbaitViralDaily",
      sourceUrl: "https://viral-daily.club/cash-banned",
      domain: "viral-daily.club",
      sourceTier: 5,
      sourceReliability: 30,
      title: "Cash Banned Forever!",
      publishedDate: "2026-08-24T12:00:00Z",
      evidenceText: "Cash is being completely discontinued starting tomorrow.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 40,
      credibilityScore: 30,
      relevanceScore: 1.0,
      keyEvidence: "Cash is being completely discontinued",
      explanation: "Viral blog claims ban.",
      finalContribution: 30,
      stance: "supports",
      url: "https://viral-daily.club/cash-banned",
      publisher: "ClickbaitViralDaily",
      sourceType: "other",
      snippet: "Cash is being completely discontinued starting tomorrow.",
      relation: "supports",
    },
  ];

  const resC = credibilityScorerService.computeCredibilityScore(dummyArticle, [claimC], evidenceC);
  assert(claimC.relation === 'contradicts', 'C: Official Tier 1 contradiction overrides Tier 5 support', { relation: claimC.relation });
  assert(claimC.claimScore <= 15, 'C: Claim score capped low (<= 15)', { claimScore: claimC.claimScore });
  assert(resC.score <= 25, 'C: Overall article score is <= 25', { score: resC.score });
  assert(resC.verdict === 'Probably False' || resC.verdict === 'Likely Misleading', 'C: Final verdict is FALSE / MISLEADING', { verdict: resC.verdict });
}

// ----------------------------------------------------------------------
// TEST D: Two reputable sources conflict (Same date/tier)
// ----------------------------------------------------------------------
console.log('\n--- TEST D: Two Reputable Sources Conflict (Same Date / Tier) ---');
{
  const claimD: ExtractedClaim = {
    id: "cl-d",
    text: "Trade negotiations concluded successfully with bilateral deal signed.",
    importance: 0.8,
  };

  const evidenceD: RetrievedEvidenceItem[] = [
    {
      id: "ev-d1",
      claimId: "cl-d",
      sourceName: "Reuters",
      sourceUrl: "https://reuters.com/article/trade-talks-signed",
      domain: "reuters.com",
      sourceTier: 2,
      sourceReliability: 90,
      title: "Trade Talks Conclude",
      publishedDate: "2026-08-25T14:00:00Z",
      evidenceText: "Envoys confirm trade agreement has been signed.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 85,
      credibilityScore: 90,
      relevanceScore: 1.0,
      keyEvidence: "Trade agreement signed",
      explanation: "Reuters reports deal signed.",
      finalContribution: 90,
      stance: "supports",
      url: "https://reuters.com/article/trade-talks-signed",
      publisher: "Reuters",
      sourceType: "news",
      snippet: "Envoys confirm trade agreement has been signed.",
      relation: "supports",
    },
    {
      id: "ev-d2",
      claimId: "cl-d",
      sourceName: "Associated Press",
      sourceUrl: "https://apnews.com/article/trade-talks-stalemate",
      domain: "apnews.com",
      sourceTier: 2,
      sourceReliability: 90,
      title: "Trade Talks Hit Stalemate",
      publishedDate: "2026-08-25T14:30:00Z",
      evidenceText: "Negotiators dispute signature claims, stating talks remain stalled without agreement.",
      relationToClaim: "CONTRADICTS",
      relevance: "direct",
      confidence: 85,
      credibilityScore: 90,
      relevanceScore: 1.0,
      keyEvidence: "Talks remain stalled without agreement",
      explanation: "AP reports dispute and stalemate.",
      finalContribution: 90,
      stance: "contradicts",
      url: "https://apnews.com/article/trade-talks-stalemate",
      publisher: "Associated Press",
      sourceType: "news",
      snippet: "Negotiators dispute signature claims, stating talks remain stalled without agreement.",
      relation: "contradicts",
    },
  ];

  const resD = credibilityScorerService.computeCredibilityScore(dummyArticle, [claimD], evidenceD);
  assert(claimD.relation === 'unclear', 'D: Equal reputable conflict evaluated as UNCLEAR (NEEDS VERIFICATION)', { relation: claimD.relation });
  assert(claimD.consensusStatus === 'CONFLICTING_EVIDENCE', 'D: Consensus marked CONFLICTING_EVIDENCE');
  assert(claimD.reasoning?.includes('Reliable sources disagree'), 'D: Disagreement explanation provided', { reasoning: claimD.reasoning });
  assert(resD.verdict === 'Needs Verification', 'D: Final verdict is Needs Verification', { verdict: resD.verdict });
}

// ----------------------------------------------------------------------
// TEST E: Old reputable source supports + new authoritative source contradicts
// ----------------------------------------------------------------------
console.log('\n--- TEST E: Old Source Supports + New Authoritative Source Contradicts ---');
{
  const claimE: ExtractedClaim = {
    id: "cl-e",
    text: "Now T20 captain of India is Suryakumar Yadav.",
    importance: 0.9,
    isTimeSensitive: true,
  };

  const evidenceE: RetrievedEvidenceItem[] = [
    {
      id: "ev-e1",
      claimId: "cl-e",
      sourceName: "The Hindu",
      sourceUrl: "https://thehindu.com/sports/cricket/surya-named-captain",
      domain: "thehindu.com",
      sourceTier: 2,
      sourceReliability: 90,
      title: "Suryakumar Appointed T20 Captain",
      publishedDate: "2026-02-10T10:00:00Z", // OLD
      freshness: "OLD",
      evidenceText: "Suryakumar Yadav has been named India T20 captain.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 90,
      credibilityScore: 90,
      relevanceScore: 1.0,
      keyEvidence: "Suryakumar named captain in February",
      explanation: "Old report shows appointment in Feb.",
      finalContribution: 90,
      stance: "supports",
      url: "https://thehindu.com/sports/cricket/surya-named-captain",
      publisher: "The Hindu",
      sourceType: "news",
      snippet: "Suryakumar Yadav has been named India T20 captain.",
      relation: "supports",
    },
    {
      id: "ev-e2",
      claimId: "cl-e",
      sourceName: "The Indian Express",
      sourceUrl: "https://indianexpress.com/sports/shreyas-replaces-surya",
      domain: "indianexpress.com",
      sourceTier: 2,
      sourceReliability: 90,
      title: "Shreyas Iyer Named New Captain",
      publishedDate: "2026-08-25T10:00:00Z", // CURRENT
      freshness: "CURRENT",
      temporalRelevance: "TEMPORALLY_RELEVANT",
      evidenceText: "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.",
      relationToClaim: "CONTRADICTS",
      relevance: "direct",
      confidence: 98,
      credibilityScore: 90,
      relevanceScore: 1.0,
      keyEvidence: "Shreyas Iyer replaced Suryakumar Yadav as captain",
      explanation: "Current report confirms replacement.",
      finalContribution: 90,
      stance: "contradicts",
      url: "https://indianexpress.com/sports/shreyas-replaces-surya",
      publisher: "The Indian Express",
      sourceType: "news",
      snippet: "Shreyas Iyer has been unveiled as India's new T20I captain, replacing Suryakumar Yadav.",
      relation: "contradicts",
    },
  ];

  const resE = credibilityScorerService.computeCredibilityScore(dummyArticle, [claimE], evidenceE);
  assert(claimE.relation === 'contradicts', 'E: Newer authoritative contradiction dominates older supportive report', { relation: claimE.relation });
  assert(claimE.claimScore <= 15, 'E: Claim score <= 15 for superseded claim', { claimScore: claimE.claimScore });
  assert(resE.score <= 25, 'E: Overall article score is <= 25', { score: resE.score });
}

// ----------------------------------------------------------------------
// TEST F: Same article syndicated across multiple domains
// ----------------------------------------------------------------------
console.log('\n--- TEST F: Syndicated Wire Article Across Multiple Domains ---');
{
  const claimF: ExtractedClaim = {
    id: "cl-f",
    text: "India achieves record export target in merchandise.",
    importance: 0.7,
  };

  const evidenceF: RetrievedEvidenceItem[] = [
    {
      id: "ev-f1",
      claimId: "cl-f",
      sourceName: "PTI News",
      sourceUrl: "https://ptinews.com/news/exports-record",
      domain: "ptinews.com",
      sourceTier: 2,
      sourceReliability: 90,
      title: "PTI: India Achieves Record Exports",
      publishedDate: "2026-08-25T10:00:00Z",
      evidenceText: "India achieves record export target in merchandise, PTI reports.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 90,
      credibilityScore: 90,
      relevanceScore: 1.0,
      keyEvidence: "Record export target",
      explanation: "PTI wire report.",
      finalContribution: 90,
      stance: "supports",
      url: "https://ptinews.com/news/exports-record",
      publisher: "PTI News",
      sourceType: "news",
      snippet: "India achieves record export target in merchandise, PTI reports.",
      relation: "supports",
    },
    {
      id: "ev-f2",
      claimId: "cl-f",
      sourceName: "SyndicatedAggregator1",
      sourceUrl: "https://aggregator1.com/reprint/exports-record",
      domain: "ptinews.com", // Same underlying wire attribution
      sourceTier: 4,
      sourceReliability: 60,
      title: "PTI: India Achieves Record Exports",
      publishedDate: "2026-08-25T10:05:00Z",
      evidenceText: "India achieves record export target in merchandise, PTI reports.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 90,
      credibilityScore: 60,
      relevanceScore: 1.0,
      keyEvidence: "Record export target",
      explanation: "Republished wire feed.",
      finalContribution: 60,
      stance: "supports",
      url: "https://aggregator1.com/reprint/exports-record",
      publisher: "SyndicatedAggregator1",
      sourceType: "news",
      snippet: "India achieves record export target in merchandise, PTI reports.",
      relation: "supports",
    },
    {
      id: "ev-f3",
      claimId: "cl-f",
      sourceName: "SyndicatedAggregator2",
      sourceUrl: "https://aggregator2.com/reprint/exports-record",
      domain: "ptinews.com", // Same underlying wire attribution
      sourceTier: 4,
      sourceReliability: 60,
      title: "PTI: India Achieves Record Exports",
      publishedDate: "2026-08-25T10:10:00Z",
      evidenceText: "India achieves record export target in merchandise, PTI reports.",
      relationToClaim: "SUPPORTS",
      relevance: "direct",
      confidence: 90,
      credibilityScore: 60,
      relevanceScore: 1.0,
      keyEvidence: "Record export target",
      explanation: "Republished wire feed.",
      finalContribution: 60,
      stance: "supports",
      url: "https://aggregator2.com/reprint/exports-record",
      publisher: "SyndicatedAggregator2",
      sourceType: "news",
      snippet: "India achieves record export target in merchandise, PTI reports.",
      relation: "supports",
    },
  ];

  credibilityScorerService.computeCredibilityScore(dummyArticle, [claimF], evidenceF);
  assert(claimF.independentSourceCount === 1, 'F: Syndicated copies correctly grouped into 1 independent source (not 3)', { count: claimF.independentSourceCount });
  assert(claimF.independentSupportingSources === 1, 'F: Independent supporting count is 1', { supCount: claimF.independentSupportingSources });
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
