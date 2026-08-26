import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { claimExtractorService } from '../services/claimExtractor.service.js';
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

console.log('\n🧪 Running Multi-Claim & Regression Test Suite...\n');

// ====================================================
// MULTI-CLAIM ARTICLE VERIFICATION TEST SUITE (Cases A to J)
// ====================================================

// ----------------------------------------------------
// CASE A: Article with 3 supported claims -> High Credibility (>= 85)
// ----------------------------------------------------
console.log('CASE A: Article with 3 supported claims -> High Credibility (>= 85)');
{
  const article: ArticleMetadata = {
    title: 'Delhi Infrastructure Developments',
    author: 'Staff Reporter',
    publishedAt: '2026-08-25',
    publisher: 'The Times of India',
    url: 'https://timesofindia.indiatimes.com/city/delhi/metro',
    text: 'Government announced a new railway project in Delhi. The project will create 50,000 jobs. Officials confirmed operations will begin in 2028.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'Government announced a new railway project in Delhi.', importance: 0.9, claim_type: 'political' },
    { id: 'c-2', text: 'The project will create 50,000 jobs.', importance: 0.85, claim_type: 'numerical' },
    { id: 'c-3', text: 'Officials confirmed operations will begin in 2028.', importance: 0.8, claim_type: 'temporal' },
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'The Indian Express',
      sourceUrl: 'https://indianexpress.com/article/delhi-railway',
      sourceTier: 3,
      title: 'Delhi Railway Project Approved',
      publishedDate: '2026-08-25',
      evidenceText: 'Government announced a new railway project in Delhi to expand connectivity.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'Government announced a new railway project in Delhi',
      explanation: 'Direct confirmation of railway project announcement.',
      finalContribution: 85,
      url: 'https://indianexpress.com/article/delhi-railway',
      publisher: 'The Indian Express',
      sourceType: 'news',
      snippet: 'Government announced a new railway project in Delhi.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-2',
      sourceName: 'Press Information Bureau (PIB)',
      sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=90123',
      sourceTier: 1,
      title: 'Cabinet approves Delhi Project',
      publishedDate: '2026-08-25',
      evidenceText: 'The project will create 50,000 jobs across engineering and urban transit sectors.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'create 50,000 jobs',
      explanation: 'Official government release verifies employment generation figures.',
      finalContribution: 98,
      url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=90123',
      publisher: 'Press Information Bureau (PIB)',
      sourceType: 'official',
      snippet: 'The project will create 50,000 jobs.',
      relation: 'supports',
    },
    {
      id: 'ev-3',
      claimId: 'c-3',
      sourceName: 'The Hindu',
      sourceUrl: 'https://thehindu.com/news/national/delhi-rail',
      sourceTier: 3,
      title: 'Delhi Metro Timeline',
      publishedDate: '2026-08-25',
      evidenceText: 'Officials confirmed operations will begin in 2028 after final track commissioning.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'begin in 2028',
      explanation: 'Reputable news outlet verifies 2028 operational timeline.',
      finalContribution: 85,
      url: 'https://thehindu.com/news/national/delhi-rail',
      publisher: 'The Hindu',
      sourceType: 'news',
      snippet: 'Officials confirmed operations will begin in 2028.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 85, `Case A Score is high (${result.score} >= 85)`);
  assert(result.verdict === 'Probably Credible' || result.verdict === 'Highly Credible', `Case A Verdict is credible (${result.verdict})`);
  assert(result.articleSummary.supportedCount === 3, `Case A Supported count is 3 (${result.articleSummary.supportedCount})`);
  assert(result.articleSummary.contradictedCount === 0, `Case A Contradicted count is 0 (${result.articleSummary.contradictedCount})`);
}

// ----------------------------------------------------
// CASE B: Article with 2 supported + 1 contradicted major claim -> Reduced Credibility (<= 35)
// ----------------------------------------------------
console.log('\nCASE B: Article with 2 supported + 1 contradicted major claim -> Reduced Credibility (<= 35)');
{
  const article: ArticleMetadata = {
    title: 'Regional Geography Overview',
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: 'India is in Asia. Delhi is the capital of India. India is in South America.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'India is in Asia.', importance: 0.8, claim_type: 'geographic' },
    { id: 'c-2', text: 'Delhi is the capital of India.', importance: 0.8, claim_type: 'factual' },
    { id: 'c-3', text: 'India is in South America.', importance: 0.9, claim_type: 'geographic' }, // Major false claim
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India Overview',
      publishedDate: null,
      evidenceText: 'India is a country in South Asia.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'country in South Asia',
      explanation: 'Confirms India in South Asia.',
      finalContribution: 82,
      url: 'https://britannica.com/place/India',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet: 'India is a country in South Asia.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-2',
      sourceName: 'National Portal of India',
      sourceUrl: 'https://india.gov.in',
      sourceTier: 1,
      title: 'National Capital',
      publishedDate: null,
      evidenceText: 'New Delhi is the official capital of India.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'New Delhi is the official capital',
      explanation: 'Official portal verifies national capital.',
      finalContribution: 98,
      url: 'https://india.gov.in',
      publisher: 'National Portal of India',
      sourceType: 'official',
      snippet: 'New Delhi is the capital.',
      relation: 'supports',
    },
    {
      id: 'ev-3',
      claimId: 'c-3',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India Location',
      publishedDate: null,
      evidenceText: 'India is located in South Asia, bordered by the Indian Ocean.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'located in South Asia',
      explanation: 'Direct location conflict: India is located in Asia, not South America.',
      finalContribution: 82,
      url: 'https://britannica.com/place/India',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet: 'India is in South Asia.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 35, `Case B Score is reduced due to major contradiction (${result.score} <= 35)`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Highly Suspicious', `Case B Verdict is refuted (${result.verdict})`);
  assert(result.articleSummary.majorContradictedCount >= 1, `Case B Major contradicted count >= 1 (${result.articleSummary.majorContradictedCount})`);
}

// ----------------------------------------------------
// CASE C: Article with mostly unclear claims -> Needs Verification (40-60)
// ----------------------------------------------------
console.log('\nCASE C: Article with mostly unclear claims -> Needs Verification (40-60)');
{
  const article: ArticleMetadata = {
    title: 'Obscure Speculative Story',
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: 'Subterranean crystal reactor discovered beneath city hall. Secret energy experiments began last winter.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'Subterranean crystal reactor discovered beneath city hall.', importance: 0.8, claim_type: 'factual' },
    { id: 'c-2', text: 'Secret energy experiments began last winter.', importance: 0.7, claim_type: 'temporal' },
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Wikipedia Knowledge Archive',
      sourceUrl: 'https://en.wikipedia.org/wiki/Subterranean',
      sourceTier: 5,
      title: 'Subterranean (Knowledge Archive)',
      publishedDate: null,
      evidenceText: 'Subterranea refers to underground structures, both natural and man-made.',
      relationToClaim: 'NEUTRAL',
      relevance: 'related',
      confidence: 50,
      credibilityScore: 50,
      relevanceScore: 0.2,
      keyEvidence: '',
      explanation: 'General context only, does not verify crystal reactor.',
      finalContribution: 10,
      url: 'https://en.wikipedia.org/wiki/Subterranean',
      publisher: 'Wikipedia Knowledge Archive',
      sourceType: 'encyclopedia',
      snippet: 'Subterranea refers to underground structures.',
      relation: 'unclear',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 40 && result.score <= 60, `Case C Score is neutral unverified baseline (${result.score} between 40-60)`);
  assert(result.verdict === 'Needs Verification', `Case C Verdict is Needs Verification (${result.verdict})`);
  assert(result.articleSummary.unclearCount === 2, `Case C Unclear count is 2 (${result.articleSummary.unclearCount})`);
}

// ----------------------------------------------------
// CASE D: Article with 4 supported + 1 minor unclear claim -> Still Credible (>= 75)
// ----------------------------------------------------
console.log('\nCASE D: Article with 4 supported + 1 minor unclear claim -> Still Credible (>= 75)');
{
  const article: ArticleMetadata = {
    title: 'Space Exploration Milestones',
    author: 'Science Desk',
    publishedAt: '2026-08-25',
    publisher: 'The Hindu',
    url: 'https://thehindu.com/sci-tech/space',
    text: 'ISRO launched new lunar mission. Spacecraft entered lunar orbit successfully. Solar panels deployed. Telemetry signals received at tracking station. The lead engineer smiled during the press briefing.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'ISRO launched new lunar mission.', importance: 0.9, claim_type: 'scientific' },
    { id: 'c-2', text: 'Spacecraft entered lunar orbit successfully.', importance: 0.9, claim_type: 'scientific' },
    { id: 'c-3', text: 'Solar panels deployed.', importance: 0.75, claim_type: 'factual' },
    { id: 'c-4', text: 'Telemetry signals received at tracking station.', importance: 0.75, claim_type: 'factual' },
    { id: 'c-5', text: 'The lead engineer smiled during the press briefing.', importance: 0.2, claim_type: 'other' }, // Minor unclear
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Press Information Bureau (PIB)',
      sourceUrl: 'https://pib.gov.in/space',
      sourceTier: 1,
      title: 'ISRO Lunar Launch',
      publishedDate: '2026-08-25',
      evidenceText: 'ISRO launched lunar mission successfully from Sriharikota.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'ISRO launched lunar mission',
      explanation: 'Official confirmation.',
      finalContribution: 98,
      url: 'https://pib.gov.in/space',
      publisher: 'PIB',
      sourceType: 'official',
      snippet: 'ISRO launched lunar mission.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-2',
      sourceName: 'ISRO Official Portal',
      sourceUrl: 'https://isro.gov.in/lunar',
      sourceTier: 1,
      title: 'Orbit Insertion',
      publishedDate: '2026-08-25',
      evidenceText: 'Spacecraft entered intended lunar orbit precisely.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'Spacecraft entered lunar orbit',
      explanation: 'Official confirmation.',
      finalContribution: 98,
      url: 'https://isro.gov.in/lunar',
      publisher: 'ISRO',
      sourceType: 'official',
      snippet: 'Spacecraft entered lunar orbit.',
      relation: 'supports',
    },
    {
      id: 'ev-3',
      claimId: 'c-3',
      sourceName: 'The Indian Express',
      sourceUrl: 'https://indianexpress.com/space',
      sourceTier: 3,
      title: 'Power Systems Nominal',
      publishedDate: '2026-08-25',
      evidenceText: 'Solar panels were fully deployed generating peak power.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'Solar panels deployed',
      explanation: 'Verified news reporting.',
      finalContribution: 85,
      url: 'https://indianexpress.com/space',
      publisher: 'The Indian Express',
      sourceType: 'news',
      snippet: 'Solar panels deployed.',
      relation: 'supports',
    },
    {
      id: 'ev-4',
      claimId: 'c-4',
      sourceName: 'The Hindu',
      sourceUrl: 'https://thehindu.com/space',
      sourceTier: 3,
      title: 'Ground Station Telemetry',
      publishedDate: '2026-08-25',
      evidenceText: 'Telemetry signals received loud and clear at ISTRAC ground tracking station.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'Telemetry signals received',
      explanation: 'Verified news reporting.',
      finalContribution: 85,
      url: 'https://thehindu.com/space',
      publisher: 'The Hindu',
      sourceType: 'news',
      snippet: 'Telemetry signals received.',
      relation: 'supports',
    },
    // Claim 5 has no evidence (minor detail)
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 75, `Case D Score remains credible despite minor unclear claim (${result.score} >= 75)`);
  assert(result.verdict === 'Probably Credible' || result.verdict === 'Highly Credible', `Case D Verdict is credible (${result.verdict})`);
  assert(result.articleSummary.unclearCount === 1, `Case D Unclear count is 1 (${result.articleSummary.unclearCount})`);
  assert(result.articleSummary.supportedCount === 4, `Case D Supported count is 4 (${result.articleSummary.supportedCount})`);
}

// ----------------------------------------------------
// CASE E: Article with multiple contradicted major claims -> Very Low Credibility (<= 20)
// ----------------------------------------------------
console.log('\nCASE E: Article with multiple contradicted major claims -> Very Low Credibility (<= 20)');
{
  const article: ArticleMetadata = {
    title: 'Disinformation Package',
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: 'Ram Mandir is in Pakistan. India is in South America. Asia is the smallest continent.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'Ram Mandir is in Pakistan.', importance: 0.9, claim_type: 'geographic' },
    { id: 'c-2', text: 'India is in South America.', importance: 0.9, claim_type: 'geographic' },
    { id: 'c-3', text: 'Asia is the smallest continent.', importance: 0.85, claim_type: 'geographic' },
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com',
      sourceTier: 4,
      title: 'Ram Mandir',
      publishedDate: null,
      evidenceText: 'The Ram Mandir is a temple located in Ayodhya, Uttar Pradesh, India.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'located in Ayodhya, India',
      explanation: 'Location contradiction.',
      finalContribution: 82,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'Located in Ayodhya, India.',
      relation: 'contradicts',
    },
    {
      id: 'ev-2',
      claimId: 'c-2',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com',
      sourceTier: 4,
      title: 'India',
      publishedDate: null,
      evidenceText: 'India is a country located in South Asia.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'located in South Asia',
      explanation: 'Location contradiction.',
      finalContribution: 82,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'Located in South Asia.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 20, `Case E Score is very low (${result.score} <= 20)`);
  assert(result.verdict === 'Highly Suspicious', `Case E Verdict is Highly Suspicious (${result.verdict})`);
  assert(result.articleSummary.contradictedCount >= 2, `Case E Contradicted count >= 2 (${result.articleSummary.contradictedCount})`);
}

// ----------------------------------------------------
// CASE F: Article containing unrelated evidence -> Irrelevant evidence must not become contradiction
// ----------------------------------------------------
console.log('\nCASE F: Article containing unrelated evidence -> Irrelevant evidence is UNCLEAR, not contradiction');
{
  const claimText = 'Deep ocean research platform launched in Arctic waters.';
  const snippet = 'The Atlantic salmon migration patterns were studied by marine biologists in Norway.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Marine Biology Review');

  assert(stance.relation === 'unclear', `Stance is UNCLEAR (${stance.relation})`);
  assert(stance.stanceScore === 0, `Stance score is 0 (${stance.stanceScore})`);
  assert(stance.relationToClaim === 'NEUTRAL', `Relation is NEUTRAL (${stance.relationToClaim})`);
}

// ----------------------------------------------------
// CASE G: Numerical conflict -> CONTRADICTS
// ----------------------------------------------------
console.log('\nCASE G: Numerical conflict -> CONTRADICTS');
{
  const claimText = 'The project cost ₹50,000 crore.';
  const snippet = 'Official budget documents confirm the project cost ₹5,000 crore in total expenditure.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Official Budget Gazette');

  assert(stance.relation === 'contradicts', `Stance on numerical discrepancy is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);
  assert(stance.relationToClaim === 'CONTRADICTS', `RelationToClaim is CONTRADICTS (${stance.relationToClaim})`);
}

// ----------------------------------------------------
// CASE H: Location conflict -> CONTRADICTS
// ----------------------------------------------------
console.log('\nCASE H: Location conflict -> CONTRADICTS');
{
  const claimText = 'Ram Mandir is in Pakistan.';
  const snippet = 'The Ram Mandir is a Hindu temple complex in Ayodhya, Uttar Pradesh, India.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Ram Mandir (Knowledge Archive)');

  assert(stance.relation === 'contradicts', `Location conflict is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);
}

// ----------------------------------------------------
// CASE I: Date conflict -> CONTRADICTS
// ----------------------------------------------------
console.log('\nCASE I: Date conflict -> CONTRADICTS');
{
  const claimText = 'Event happened on January 10.';
  const snippet = 'Official records document that the event occurred on January 15.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Event Gazette');

  assert(stance.relation === 'contradicts', `Date conflict is CONTRADICTS (${stance.relation})`);
  assert(stance.stanceScore === -1, `Stance score is -1 (${stance.stanceScore})`);
}

// ----------------------------------------------------
// CASE J: No evidence -> UNCLEAR, NOT false
// ----------------------------------------------------
console.log('\nCASE J: No evidence -> UNCLEAR, NOT false');
{
  const claim: ExtractedClaim = {
    id: 'c-1',
    text: 'Ancient manuscript discovered in Himalayan cave.',
    importance: 0.7,
    claim_type: 'factual',
  };
  const article: ArticleMetadata = {
    title: claim.text,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claim.text,
  };

  const result = credibilityScorerService.computeCredibilityScore(article, [claim], []);
  assert(result.score >= 40 && result.score <= 60, `Score is neutral unverified baseline (${result.score})`);
  assert(result.verdict === 'Needs Verification', `Verdict is Needs Verification (${result.verdict})`);
}

// ====================================================
// REGRESSION VERIFICATION (Tests A to F)
// ====================================================
console.log('\n----------------------------------------------------');
console.log('REGRESSION TESTS (Tests A to F)...');
console.log('----------------------------------------------------');

// Regression A: "Ram Mandir is in Pakistan" -> CONTRADICTS
{
  const claimText = 'Ram Mandir is in Pakistan';
  const snippet = 'The Ram Mandir is a Hindu temple complex in Ayodhya, Uttar Pradesh, India.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Britannica');
  assert(stance.relation === 'contradicts', `Regression A is CONTRADICTS (${stance.relation})`);
}

// Regression B: "Ram Mandir is in Ayodhya, India" -> SUPPORTS
{
  const claimText = 'Ram Mandir is in Ayodhya, India';
  const snippet = 'The Ram Mandir is a Hindu temple complex in Ayodhya, Uttar Pradesh, India.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Britannica');
  assert(stance.relation === 'supports', `Regression B is SUPPORTS (${stance.relation})`);
}

// Regression C: "India is in South America" -> CONTRADICTS
{
  const claimText = 'India is in South America';
  const snippet = 'India is a country in South Asia.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Britannica');
  assert(stance.relation === 'contradicts', `Regression C is CONTRADICTS (${stance.relation})`);
}

// Regression D: "India is in Asia" -> SUPPORTS
{
  const claimText = 'India is in Asia';
  const snippet = 'India is a country in South Asia.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Britannica');
  assert(stance.relation === 'supports', `Regression D is SUPPORTS (${stance.relation})`);
}

// Regression E: "Asia is the largest continent" -> SUPPORTS
{
  const claimText = 'Asia is the largest continent';
  const snippet = 'Asia is the largest continent in the world by both land area and population.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Wikipedia');
  assert(stance.relation === 'supports', `Regression E is SUPPORTS (${stance.relation})`);
}

// Regression F: "Asia is the smallest continent" -> CONTRADICTS
{
  const claimText = 'Asia is the smallest continent';
  const snippet = 'Asia is the largest continent in the world by both land area and population.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Wikipedia');
  assert(stance.relation === 'contradicts', `Regression F is CONTRADICTS (${stance.relation})`);
}

console.log('\n========================================');
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
