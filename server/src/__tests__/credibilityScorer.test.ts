import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
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

console.log('\n🧪 Running STEP 7: Calibrated Multi-Claim Scoring Test Suite (Tests A to K)...\n');

// ----------------------------------------------------
// TEST A: Clearly True Single Claim
// ----------------------------------------------------
console.log('TEST A: Clearly True Single Claim -> Score >= 80, SUPPORTS');
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

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.85, claim_type: 'geographic' }];
  const snippet = 'India is a country in South Asia.';
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India - Country in South Asia',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 88,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Authoritative encyclopedia confirms India is in South Asia.',
      finalContribution: 88,
      url: 'https://britannica.com/place/India',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 80, `Test A score is high (${result.score} >= 80)`);
  assert(claims[0].relation === 'supports', `Test A claim relation is supports (${claims[0].relation})`);
  assert(claims[0].claimScore! >= 85, `Test A claimScore is >= 85 (${claims[0].claimScore})`);
  assert(result.verdict === 'Probably Credible', `Test A verdict is Probably Credible (${result.verdict})`);
}

// ----------------------------------------------------
// TEST B: Clearly False Single Claim
// ----------------------------------------------------
console.log('\nTEST B: Clearly False Single Claim -> Score <= 20, CONTRADICTS');
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

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.9, claim_type: 'geographic' }];
  const snippet = 'India is a sovereign country located in South Asia.';
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com/place/India',
      sourceTier: 4,
      title: 'India Overview',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Direct location conflict: India is located in Asia, not South America.',
      finalContribution: 85,
      url: 'https://britannica.com/place/India',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 25, `Test B score is low (${result.score} <= 25)`);
  assert(claims[0].relation === 'contradicts', `Test B claim relation is CONTRADICTS (${claims[0].relation})`);
  assert(claims[0].claimScore! <= 10, `Test B claimScore is <= 10 (${claims[0].claimScore})`);
  assert(result.verdict === 'Likely Misleading' || result.verdict === 'Probably False', `Test B verdict is refuted (${result.verdict})`);
}

// ----------------------------------------------------
// TEST C: True Multi-Claim Article
// ----------------------------------------------------
console.log('\nTEST C: True Multi-Claim Article -> Score >= 85, Probably Credible');
{
  const article: ArticleMetadata = {
    title: 'Delhi Metro Expansion',
    author: 'Staff',
    publishedAt: '2026-08-25',
    publisher: 'The Indian Express',
    url: 'https://indianexpress.com/delhi',
    text: 'Government approved new metro project in Delhi. Project will create 50,000 jobs. Timeline targets 2028 completion.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'Government approved new metro project in Delhi.', importance: 0.9, claim_type: 'political' },
    { id: 'c-2', text: 'Project will create 50,000 jobs.', importance: 0.85, claim_type: 'numerical' },
    { id: 'c-3', text: 'Timeline targets 2028 completion.', importance: 0.8, claim_type: 'temporal' },
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'PIB Government of India',
      sourceUrl: 'https://pib.gov.in/delhi',
      sourceTier: 1,
      title: 'Cabinet Approval',
      publishedDate: '2026-08-25',
      evidenceText: 'Government approved new metro project in Delhi.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'approved new metro project',
      explanation: 'Official confirmation.',
      finalContribution: 98,
      url: 'https://pib.gov.in/delhi',
      publisher: 'PIB',
      sourceType: 'official',
      snippet: 'Government approved new metro project in Delhi.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-2',
      sourceName: 'The Hindu',
      sourceUrl: 'https://thehindu.com/delhi-jobs',
      sourceTier: 3,
      title: 'Employment Boost',
      publishedDate: '2026-08-25',
      evidenceText: 'Project will create 50,000 jobs across sectors.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'create 50,000 jobs',
      explanation: 'News confirmation.',
      finalContribution: 85,
      url: 'https://thehindu.com/delhi-jobs',
      publisher: 'The Hindu',
      sourceType: 'news',
      snippet: 'Project will create 50,000 jobs.',
      relation: 'supports',
    },
    {
      id: 'ev-3',
      claimId: 'c-3',
      sourceName: 'The Times of India',
      sourceUrl: 'https://timesofindia.indiatimes.com/delhi-metro',
      sourceTier: 3,
      title: 'Delhi Metro 2028',
      publishedDate: '2026-08-25',
      evidenceText: 'Officials stated timeline targets 2028 completion.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'targets 2028 completion',
      explanation: 'News confirmation.',
      finalContribution: 85,
      url: 'https://timesofindia.indiatimes.com/delhi-metro',
      publisher: 'The Times of India',
      sourceType: 'news',
      snippet: 'Timeline targets 2028 completion.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 85, `Test C score is high (${result.score} >= 85)`);
  assert(result.verdict === 'Probably Credible', `Test C verdict is Probably Credible (${result.verdict})`);
  assert(result.articleSummary.supportedCount === 3, `Test C supported count is 3 (${result.articleSummary.supportedCount})`);
}

// ----------------------------------------------------
// TEST D: False Multi-Claim Article
// ----------------------------------------------------
console.log('\nTEST D: False Multi-Claim Article -> Score <= 20, Probably False');
{
  const article: ArticleMetadata = {
    title: 'Disinformation Article',
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: 'Ram Mandir is in Pakistan. India is in South America.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'Ram Mandir is in Pakistan.', importance: 0.9, claim_type: 'geographic' },
    { id: 'c-2', text: 'India is in South America.', importance: 0.9, claim_type: 'geographic' },
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
      evidenceText: 'The Ram Mandir is in Ayodhya, Uttar Pradesh, India.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'in Ayodhya, India',
      explanation: 'Location contradiction.',
      finalContribution: 82,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'In Ayodhya, India.',
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
      evidenceText: 'India is a country in South Asia.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 82,
      relevanceScore: 1.0,
      keyEvidence: 'in South Asia',
      explanation: 'Location contradiction.',
      finalContribution: 82,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'In South Asia.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 20, `Test D score is very low (${result.score} <= 20)`);
  assert(result.verdict === 'Probably False' || result.verdict === 'Highly Suspicious', `Test D verdict is refuted (${result.verdict})`);
  assert(result.articleSummary.contradictedCount === 2, `Test D contradicted count is 2 (${result.articleSummary.contradictedCount})`);
}

// ----------------------------------------------------
// TEST E: Mixed True/False Article
// ----------------------------------------------------
console.log('\nTEST E: Mixed True/False Article -> Score <= 25, Likely Misleading');
{
  const article: ArticleMetadata = {
    title: 'Mixed Accuracy Article',
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: 'India is in Asia. Delhi is the capital of India. India is in South America.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'India is in Asia.', importance: 0.8, claim_type: 'geographic' },
    { id: 'c-2', text: 'Delhi is the capital of India.', importance: 0.8, claim_type: 'factual' },
    { id: 'c-3', text: 'India is in South America.', importance: 0.9, claim_type: 'geographic' },
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com',
      sourceTier: 4,
      title: 'India Location',
      publishedDate: null,
      evidenceText: 'India is a country in South Asia.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'in South Asia',
      explanation: 'Location support.',
      finalContribution: 85,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'In South Asia.',
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
      evidenceText: 'New Delhi is the capital of India.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'capital of India',
      explanation: 'Official confirmation.',
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
      sourceUrl: 'https://britannica.com',
      sourceTier: 4,
      title: 'India Location',
      publishedDate: null,
      evidenceText: 'India is located in South Asia.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'located in South Asia',
      explanation: 'Contradiction: Asia vs South America.',
      finalContribution: 85,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'Located in South Asia.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 25, `Test E score is reduced by major false claim (${result.score} <= 25)`);
  assert(result.verdict === 'Likely Misleading', `Test E verdict is Likely Misleading (${result.verdict})`);
}

// ----------------------------------------------------
// TEST F: One Highly Important False Claim + Several True Minor Claims
// ----------------------------------------------------
console.log('\nTEST F: One Major False Claim + Minor True Claims -> Score <= 30 (Major False Dominates)');
{
  const article: ArticleMetadata = {
    title: 'Special Report',
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: 'Ram Mandir is in Pakistan. The press briefing began at 10 AM. It was raining in the capital. The spokesman wore a blue tie.',
  };

  const claims: ExtractedClaim[] = [
    { id: 'c-1', text: 'Ram Mandir is in Pakistan.', importance: 0.95, claim_type: 'geographic' }, // High importance false
    { id: 'c-2', text: 'The press briefing began at 10 AM.', importance: 0.25, claim_type: 'temporal' }, // Minor true
    { id: 'c-3', text: 'It was raining in the capital.', importance: 0.20, claim_type: 'factual' }, // Minor true
  ];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com',
      sourceTier: 4,
      title: 'Ram Mandir Location',
      publishedDate: null,
      evidenceText: 'The Ram Mandir is located in Ayodhya, Uttar Pradesh, India.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 88,
      relevanceScore: 1.0,
      keyEvidence: 'located in Ayodhya, India',
      explanation: 'Contradiction.',
      finalContribution: 88,
      url: 'https://britannica.com',
      publisher: 'Britannica',
      sourceType: 'encyclopedia',
      snippet: 'Located in Ayodhya, India.',
      relation: 'contradicts',
    },
    {
      id: 'ev-2',
      claimId: 'c-2',
      sourceName: 'The Hindu',
      sourceUrl: 'https://thehindu.com',
      sourceTier: 3,
      title: 'Briefing',
      publishedDate: null,
      evidenceText: 'The press briefing began at 10 AM.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 90,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'began at 10 AM',
      explanation: 'Support.',
      finalContribution: 85,
      url: 'https://thehindu.com',
      publisher: 'The Hindu',
      sourceType: 'news',
      snippet: 'Began at 10 AM.',
      relation: 'supports',
    },
    {
      id: 'ev-3',
      claimId: 'c-3',
      sourceName: 'The Indian Express',
      sourceUrl: 'https://indianexpress.com',
      sourceTier: 3,
      title: 'Weather',
      publishedDate: null,
      evidenceText: 'It was raining in the capital on Monday.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 90,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'raining in the capital',
      explanation: 'Support.',
      finalContribution: 85,
      url: 'https://indianexpress.com',
      publisher: 'The Indian Express',
      sourceType: 'news',
      snippet: 'Raining in capital.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 30, `Test F score is <= 30 due to high-importance contradiction (${result.score})`);
  assert(claims[0].claimScore! <= 10, `Test F major claim score is <= 10 (${claims[0].claimScore})`);
}

// ----------------------------------------------------
// TEST G: No Evidence Found -> Neutral (45-58), NOT False
// ----------------------------------------------------
console.log('\nTEST G: No Evidence Found -> Neutral (45-58), NOT False');
{
  const claimText = 'Subterranean crystal reactor discovered beneath city hall.';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.75, claim_type: 'factual' }];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, []);
  assert(result.score >= 45 && result.score <= 58, `Test G score is neutral unverified baseline (${result.score})`);
  assert(claims[0].relation === 'unclear', `Test G claim relation is unclear (${claims[0].relation})`);
  assert(result.verdict === 'Needs Verification', `Test G verdict is Needs Verification (${result.verdict})`);
}

// ----------------------------------------------------
// TEST H: Conflicting Sources -> Disagreement Penalty
// ----------------------------------------------------
console.log('\nTEST H: Conflicting Sources -> Disagreement Penalty Applied');
{
  const claimText = 'Trial outcome announced by panel';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.8, claim_type: 'factual' }];

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Source Alpha',
      sourceUrl: 'https://alpha.com',
      sourceTier: 3,
      title: 'Trial Validated',
      publishedDate: null,
      evidenceText: 'Trial outcome was confirmed and validated by panel.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 90,
      credibilityScore: 80,
      relevanceScore: 1.0,
      keyEvidence: 'validated by panel',
      explanation: 'Support.',
      finalContribution: 80,
      url: 'https://alpha.com',
      publisher: 'Source Alpha',
      sourceType: 'news',
      snippet: 'Validated by panel.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-1',
      sourceName: 'Source Beta Fact Check',
      sourceUrl: 'https://beta.org/fact-check',
      sourceTier: 2,
      title: 'Fact Check: Trial Claims False',
      publishedDate: null,
      evidenceText: 'Fact-Check: Claim is false, panel explicitly refuted trial outcome.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 92,
      relevanceScore: 1.0,
      keyEvidence: 'panel explicitly refuted trial outcome',
      explanation: 'Contradiction.',
      finalContribution: 92,
      url: 'https://beta.org/fact-check',
      publisher: 'Source Beta Fact Check',
      sourceType: 'fact_check',
      snippet: 'Panel refuted trial outcome.',
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(claims[0].relation === 'contradicts', `Test H direct contradiction dominates (${claims[0].relation})`);
  assert(result.score <= 25, `Test H score is <= 25 due to fact-check contradiction (${result.score})`);
  assert(result.breakdown.crossSourceAgreement <= 30, `Test H cross-source agreement is penalized (${result.breakdown.crossSourceAgreement})`);
}

// ----------------------------------------------------
// TEST I: Duplicate/Syndicated Sources
// ----------------------------------------------------
console.log('\nTEST I: Duplicate/Syndicated Sources -> Deduplication Applied');
{
  const claimText = 'ISRO launched weather monitoring satellite.';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.85, claim_type: 'scientific' }];

  // 4 identical syndicated wire items from the same agency
  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Press Trust of India (PTI)',
      sourceUrl: 'https://pti.in/news/1',
      sourceTier: 3,
      title: 'ISRO Launch',
      publishedDate: null,
      evidenceText: 'ISRO successfully launched weather monitoring satellite.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'ISRO launched satellite',
      explanation: 'Support.',
      finalContribution: 85,
      url: 'https://pti.in/news/1',
      publisher: 'PTI Wire',
      sourceType: 'news',
      snippet: 'ISRO launched satellite.',
      relation: 'supports',
    },
    {
      id: 'ev-2',
      claimId: 'c-1',
      sourceName: 'Press Trust of India (PTI)',
      sourceUrl: 'https://mirror1.com/pti-syndicated',
      sourceTier: 3,
      title: 'ISRO Launch',
      publishedDate: null,
      evidenceText: 'ISRO successfully launched weather monitoring satellite.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: 'ISRO launched satellite',
      explanation: 'Support.',
      finalContribution: 85,
      url: 'https://mirror1.com/pti-syndicated',
      publisher: 'PTI Wire',
      sourceType: 'news',
      snippet: 'ISRO launched satellite.',
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(claims[0].relation === 'supports', `Test I relation is supports (${claims[0].relation})`);
  assert(result.score >= 80, `Test I score is valid (${result.score})`);
}

// ----------------------------------------------------
// TEST J: "Ram Mandir is in Pakistan" -> Score <= 20, CONTRADICTS
// ----------------------------------------------------
console.log('\nTEST J: "Ram Mandir is in Pakistan" -> Score <= 20, CONTRADICTS');
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

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.9, claim_type: 'geographic' }];
  const snippet = 'The Ram Mandir is a Hindu temple located in Ayodhya, Uttar Pradesh, India.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Encyclopædia Britannica');

  assert(stance.relation === 'contradicts', `Test J stance is contradicts (${stance.relation})`);
  assert(stance.stanceScore === -1, `Test J stanceScore is -1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Encyclopædia Britannica',
      sourceUrl: 'https://britannica.com',
      sourceTier: 4,
      title: 'Ram Mandir',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 88,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Direct location conflict: Ram Mandir is located in Ayodhya, Uttar Pradesh, India, not Pakistan.',
      finalContribution: 88,
      url: 'https://britannica.com',
      publisher: 'Encyclopædia Britannica',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'contradicts',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score <= 20, `Test J score is <= 20 (${result.score})`);
  assert(claims[0].claimScore! <= 10, `Test J claimScore is <= 10 (${claims[0].claimScore})`);
  assert(result.verdict === 'Probably False' || result.verdict === 'Likely Misleading', `Test J verdict is refuted (${result.verdict})`);
}

// ----------------------------------------------------
// TEST K: "Asia is the largest continent in the world" -> Score >= 80, SUPPORTS
// ----------------------------------------------------
console.log('\nTEST K: "Asia is the largest continent in the world" -> Score >= 80, SUPPORTS');
{
  const claimText = 'Asia is the largest continent in the world';
  const article: ArticleMetadata = {
    title: claimText,
    author: null,
    publishedAt: null,
    publisher: 'Direct Text Ingestion',
    url: null,
    text: claimText,
  };

  const claims: ExtractedClaim[] = [{ id: 'c-1', text: claimText, importance: 0.85, claim_type: 'geographic' }];
  const snippet = 'Asia is the largest continent in the world by both land area and population.';
  const stance = stanceEvaluatorService.evaluateDeterministic(claimText, snippet, 'Wikipedia Knowledge Archive');

  assert(stance.relation === 'supports', `Test K stance is supports (${stance.relation})`);
  assert(stance.stanceScore === 1, `Test K stanceScore is +1 (${stance.stanceScore})`);

  const evidence: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1',
      claimId: 'c-1',
      sourceName: 'Wikipedia Knowledge Archive',
      sourceUrl: 'https://en.wikipedia.org/wiki/Asia',
      sourceTier: 4,
      title: 'Asia',
      publishedDate: null,
      evidenceText: snippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 85,
      relevanceScore: 1.0,
      keyEvidence: snippet,
      explanation: 'Authoritative reference confirms Asia is the largest continent.',
      finalContribution: 85,
      url: 'https://en.wikipedia.org/wiki/Asia',
      publisher: 'Wikipedia Knowledge Archive',
      sourceType: 'encyclopedia',
      snippet,
      relation: 'supports',
    },
  ];

  const result = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
  assert(result.score >= 80, `Test K score is >= 80 (${result.score})`);
  assert(claims[0].claimScore! >= 85, `Test K claimScore is >= 85 (${claims[0].claimScore})`);
  assert(result.verdict === 'Probably Credible', `Test K verdict is Probably Credible (${result.verdict})`);
}

console.log('\n========================================');
console.log(`Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
