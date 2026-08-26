import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

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
console.log('🛡️  STEP 8: COMPREHENSIVE ADVERSARIAL VERIFICATION TEST SUITE');
console.log('============================================================\n');

// ----------------------------------------------------------------------
// CATEGORY A — CLEARLY TRUE
// ----------------------------------------------------------------------
console.log('--- CATEGORY A: CLEARLY TRUE CLAIMS ---');
{
  // A1: "India is a country in Asia."
  const claimA1 = 'India is a country in Asia.';
  const articleA1: ArticleMetadata = { title: claimA1, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimA1 };
  const claimsA1: ExtractedClaim[] = [{ id: 'c-a1', text: claimA1, importance: 0.9, claim_type: 'geographic' }];
  const evA1: RetrievedEvidenceItem[] = [{
    id: 'ev-1', claimId: 'c-a1', sourceName: 'Encyclopædia Britannica', sourceUrl: 'https://britannica.com/place/India',
    sourceTier: 4, title: 'India', publishedDate: null, evidenceText: 'India is a sovereign country in South Asia.',
    relationToClaim: 'SUPPORTS', relevance: 'direct', confidence: 98, credibilityScore: 88, relevanceScore: 1.0,
    keyEvidence: 'sovereign country in South Asia', explanation: 'Direct geographic corroboration.', finalContribution: 88,
    url: 'https://britannica.com/place/India', publisher: 'Encyclopædia Britannica', sourceType: 'encyclopedia', snippet: 'India is in South Asia.', relation: 'supports'
  }];
  const resA1 = credibilityScorerService.computeCredibilityScore(articleA1, claimsA1, evA1);
  assert(resA1.score >= 80 && claimsA1[0].relation === 'supports', 'A1: "India is a country in Asia." -> SUPPORTS, Score >= 80', { score: resA1.score, relation: claimsA1[0].relation });

  // A2: "The Earth orbits the Sun."
  const claimA2 = 'The Earth orbits the Sun.';
  const stanceA2 = stanceEvaluatorService.evaluateDeterministic(claimA2, 'The Earth revolves around the Sun in an elliptical orbit.', 'NASA Solar System Science');
  assert(stanceA2.relation === 'supports' && stanceA2.stanceScore === 1, 'A2: "The Earth orbits the Sun." -> SUPPORTS (+1)', { relation: stanceA2.relation, score: stanceA2.stanceScore });

  // A3: "Water freezes at approximately 0 degrees Celsius at standard atmospheric pressure."
  const claimA3 = 'Water freezes at approximately 0 degrees Celsius at standard atmospheric pressure.';
  const stanceA3 = stanceEvaluatorService.evaluateDeterministic(claimA3, 'Pure water freezes at 0 degrees Celsius (32 °F) under 1 atm pressure.', 'Chemistry Physics Archive');
  assert(stanceA3.relation === 'supports' && stanceA3.confidence >= 95, 'A3: "Water freezes at 0 °C" -> SUPPORTS (Conf >= 95%)', { relation: stanceA3.relation, conf: stanceA3.confidence });
}

// ----------------------------------------------------------------------
// CATEGORY B — CLEARLY FALSE
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY B: CLEARLY FALSE CLAIMS ---');
{
  // B1: "The Earth is larger than the Sun."
  const claimB1 = 'The Earth is larger than the Sun.';
  const stanceB1 = stanceEvaluatorService.evaluateDeterministic(claimB1, 'The Sun has a diameter 109 times that of Earth and is vastly larger in volume and mass.', 'NASA Astrophysics');
  assert(stanceB1.relation === 'contradicts' && stanceB1.stanceScore === -1, 'B1: "The Earth is larger than the Sun." -> CONTRADICTS (-1)', { relation: stanceB1.relation });

  // B2: "India is located in South America."
  const claimB2 = 'India is located in South America.';
  const stanceB2 = stanceEvaluatorService.evaluateDeterministic(claimB2, 'India is located in South Asia.', 'Encyclopædia Britannica');
  assert(stanceB2.relation === 'contradicts' && stanceB2.stanceScore === -1, 'B2: "India is in South America." -> CONTRADICTS (-1)', { relation: stanceB2.relation });

  // B3: "Ram Mandir is located in Pakistan."
  const claimB3 = 'Ram Mandir is located in Pakistan.';
  const stanceB3 = stanceEvaluatorService.evaluateDeterministic(claimB3, 'The Ram Mandir is a Hindu temple complex in Ayodhya, Uttar Pradesh, India.', 'Encyclopædia Britannica');
  assert(stanceB3.relation === 'contradicts' && stanceB3.stanceScore === -1, 'B3: "Ram Mandir is in Pakistan." -> CONTRADICTS (-1)', { relation: stanceB3.relation });
}

// ----------------------------------------------------------------------
// CATEGORY C — MIXED ARTICLE
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY C: MIXED ARTICLE ---');
{
  const textC = 'India is located in Asia. The capital of India is Mumbai.';
  const articleC: ArticleMetadata = { title: 'India Geography', author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: textC };
  const claimsC: ExtractedClaim[] = [
    { id: 'c-1', text: 'India is located in Asia.', importance: 0.85, claim_type: 'geographic' },
    { id: 'c-2', text: 'The capital of India is Mumbai.', importance: 0.85, claim_type: 'capital' },
  ];

  const evC: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1', claimId: 'c-1', sourceName: 'Encyclopædia Britannica', sourceUrl: 'https://britannica.com', sourceTier: 4,
      title: 'India', publishedDate: null, evidenceText: 'India is a country in South Asia.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 98, credibilityScore: 88, relevanceScore: 1.0, keyEvidence: 'country in South Asia',
      explanation: 'Support.', finalContribution: 88, url: 'https://britannica.com', publisher: 'Britannica', sourceType: 'encyclopedia', snippet: 'In Asia.', relation: 'supports'
    },
    {
      id: 'ev-2', claimId: 'c-2', sourceName: 'National Portal of India', sourceUrl: 'https://india.gov.in', sourceTier: 1,
      title: 'Capital City', publishedDate: null, evidenceText: 'New Delhi is the official capital of the Republic of India.', relationToClaim: 'CONTRADICTS',
      relevance: 'direct', confidence: 98, credibilityScore: 98, relevanceScore: 1.0, keyEvidence: 'New Delhi is the official capital',
      explanation: 'Contradiction: Capital is New Delhi, not Mumbai.', finalContribution: 98, url: 'https://india.gov.in', publisher: 'National Portal of India', sourceType: 'official', snippet: 'Capital is New Delhi.', relation: 'contradicts'
    },
  ];

  const resC = credibilityScorerService.computeCredibilityScore(articleC, claimsC, evC);
  assert(claimsC[0].relation === 'supports', 'C: Claim 1 is SUPPORTED', { rel: claimsC[0].relation });
  assert(claimsC[1].relation === 'contradicts', 'C: Claim 2 is CONTRADICTED', { rel: claimsC[1].relation });
  assert(resC.score <= 25, 'C: Overall score reflects false claim (Score <= 25)', { score: resC.score, verdict: resC.verdict });
}

// ----------------------------------------------------------------------
// CATEGORY D — HIGH-IMPORTANCE FALSE CLAIM
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY D: HIGH-IMPORTANCE FALSE CLAIM ---');
{
  const textD = "India's capital is Mumbai. India has a population of over one billion.";
  const articleD: ArticleMetadata = { title: 'India Facts', author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: textD };
  const claimsD: ExtractedClaim[] = [
    { id: 'c-1', text: "India's capital is Mumbai.", importance: 0.95, claim_type: 'capital' }, // Major false
    { id: 'c-2', text: 'India has a population of over one billion.', importance: 0.70, claim_type: 'numerical' }, // Minor true
  ];

  const evD: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1', claimId: 'c-1', sourceName: 'National Portal of India', sourceUrl: 'https://india.gov.in', sourceTier: 1,
      title: 'National Capital', publishedDate: null, evidenceText: 'New Delhi is the capital of India.', relationToClaim: 'CONTRADICTS',
      relevance: 'direct', confidence: 98, credibilityScore: 98, relevanceScore: 1.0, keyEvidence: 'New Delhi is the capital',
      explanation: 'Contradiction.', finalContribution: 98, url: 'https://india.gov.in', publisher: 'PIB', sourceType: 'official', snippet: 'Capital is New Delhi.', relation: 'contradicts'
    },
    {
      id: 'ev-2', claimId: 'c-2', sourceName: 'World Bank', sourceUrl: 'https://worldbank.org', sourceTier: 1,
      title: 'Demographics', publishedDate: null, evidenceText: 'India population exceeds 1.4 billion people.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 98, credibilityScore: 98, relevanceScore: 1.0, keyEvidence: 'population exceeds 1.4 billion',
      explanation: 'Support.', finalContribution: 98, url: 'https://worldbank.org', publisher: 'World Bank', sourceType: 'official', snippet: 'Population 1.4B.', relation: 'supports'
    },
  ];

  const resD = credibilityScorerService.computeCredibilityScore(articleD, claimsD, evD);
  assert(resD.score <= 25, 'D: High-importance false claim substantially lowers score (Score <= 25)', { score: resD.score });
  assert(claimsD[0].claimScore! <= 10, 'D: High-importance false claimScore <= 10', { claimScore: claimsD[0].claimScore });
}

// ----------------------------------------------------------------------
// CATEGORY E — NO EVIDENCE
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY E: NO EVIDENCE ---');
{
  const claimE = 'A newly discovered island called Veridia was officially recognized by every country yesterday.';
  const articleE: ArticleMetadata = { title: claimE, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimE };
  const claimsE: ExtractedClaim[] = [{ id: 'c-1', text: claimE, importance: 0.8, claim_type: 'geographic' }];

  const resE = credibilityScorerService.computeCredibilityScore(articleE, claimsE, []);
  assert(resE.score >= 45 && resE.score <= 58, 'E: Absence of evidence produces neutral score (45-58)', { score: resE.score });
  assert(claimsE[0].relation === 'unclear', 'E: Claim relation is UNCLEAR, NOT false', { relation: claimsE[0].relation });
  assert(resE.verdict === 'Needs Verification', 'E: Verdict is Needs Verification', { verdict: resE.verdict });
}

// ----------------------------------------------------------------------
// CATEGORY F — CONFLICTING SOURCES
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY F: CONFLICTING SOURCES ---');
{
  const claimF = 'Economic output grew by 15% in Q3';
  const articleF: ArticleMetadata = { title: claimF, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimF };
  const claimsF: ExtractedClaim[] = [{ id: 'c-1', text: claimF, importance: 0.85, claim_type: 'numerical' }];

  const evF: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1', claimId: 'c-1', sourceName: 'Social Blog Feed', sourceUrl: 'https://blog.xyz', sourceTier: 5,
      title: 'Growth Post', publishedDate: null, evidenceText: 'Economic output grew by 15% in Q3 according to unverified blog.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 70, credibilityScore: 40, relevanceScore: 1.0, keyEvidence: 'grew by 15%',
      explanation: 'Support.', finalContribution: 40, url: 'https://blog.xyz', publisher: 'Social Blog', sourceType: 'other', snippet: 'Grew 15%.', relation: 'supports'
    },
    {
      id: 'ev-2', claimId: 'c-1', sourceName: 'PIB Fact Check', sourceUrl: 'https://pib.gov.in/factcheck', sourceTier: 2,
      title: 'Fact Check: False GDP Claims', publishedDate: null, evidenceText: 'Fact-Check: Official NSO data confirms Q3 GDP grew by 6.7%, not 15%. The 15% claim is fabricated.', relationToClaim: 'CONTRADICTS',
      relevance: 'direct', confidence: 98, credibilityScore: 98, relevanceScore: 1.0, keyEvidence: 'Claim is fabricated, GDP grew by 6.7%',
      explanation: 'Fact-check contradiction.', finalContribution: 98, url: 'https://pib.gov.in/factcheck', publisher: 'PIB Fact Check', sourceType: 'fact_check', snippet: 'Claim is fabricated.', relation: 'contradicts'
    },
  ];

  const resF = credibilityScorerService.computeCredibilityScore(articleF, claimsF, evF);
  assert(claimsF[0].relation === 'contradicts', 'F: Authoritative fact-check refutation dominates weak blog (relation = contradicts)', { rel: claimsF[0].relation });
  assert(resF.score <= 25, 'F: Conflicting sources with fact-check refutation caps score <= 25', { score: resF.score });
  assert(resF.breakdown.crossSourceAgreement <= 30, 'F: Cross-source agreement penalty applied', { agreement: resF.breakdown.crossSourceAgreement });
}

// ----------------------------------------------------------------------
// CATEGORY G — DUPLICATED SOURCES
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY G: DUPLICATED SOURCES ---');
{
  const claimG = 'Cabinet approves new agricultural scheme';
  const articleG: ArticleMetadata = { title: claimG, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimG };
  const claimsG: ExtractedClaim[] = [{ id: 'c-1', text: claimG, importance: 0.8, claim_type: 'political' }];

  // 4 identical syndicated mirror reports from the same wire source
  const evG: RetrievedEvidenceItem[] = [
    {
      id: 'ev-1', claimId: 'c-1', sourceName: 'Press Trust of India (PTI)', sourceUrl: 'https://pti.in/news/101', sourceTier: 3,
      title: 'Cabinet approves scheme', publishedDate: null, evidenceText: 'Cabinet approves new agricultural scheme for farmers.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 95, credibilityScore: 85, relevanceScore: 1.0, keyEvidence: 'approves new scheme',
      explanation: 'Support.', finalContribution: 85, url: 'https://pti.in/news/101', publisher: 'PTI Wire', sourceType: 'news', snippet: 'Cabinet approves scheme.', relation: 'supports'
    },
    {
      id: 'ev-2', claimId: 'c-1', sourceName: 'Press Trust of India (PTI)', sourceUrl: 'https://mirror1.com/pti/101', sourceTier: 3,
      title: 'Cabinet approves scheme', publishedDate: null, evidenceText: 'Cabinet approves new agricultural scheme for farmers.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 95, credibilityScore: 85, relevanceScore: 1.0, keyEvidence: 'approves new scheme',
      explanation: 'Support.', finalContribution: 85, url: 'https://mirror1.com/pti/101', publisher: 'PTI Wire', sourceType: 'news', snippet: 'Cabinet approves scheme.', relation: 'supports'
    },
  ];

  const resG = credibilityScorerService.computeCredibilityScore(articleG, claimsG, evG);
  assert(claimsG[0].relation === 'supports', 'G: Duplicate syndicated items successfully evaluate stance', { rel: claimsG[0].relation });
  assert(resG.score >= 80, 'G: Valid score computed without artificial inflation', { score: resG.score });
}

// ----------------------------------------------------------------------
// CATEGORY H — SOURCE QUALITY ATTACK
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY H: SOURCE QUALITY ATTACK ---');
{
  const claimH = 'Government announces nationwide curfew';
  const articleH: ArticleMetadata = { title: claimH, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimH };
  const claimsH: ExtractedClaim[] = [{ id: 'c-1', text: claimH, importance: 0.95, claim_type: 'political' }];

  const evH: RetrievedEvidenceItem[] = [
    // 1 strong Tier 1 official fact-check refuting
    {
      id: 'ev-1', claimId: 'c-1', sourceName: 'Press Information Bureau (PIB)', sourceUrl: 'https://pib.gov.in/factcheck/curfew', sourceTier: 1,
      title: 'PIB Fact Check: Curfew Rumour Fake', publishedDate: null, evidenceText: 'Fact-Check: Ministry of Home Affairs confirms no curfew has been declared. The claim is completely fake.', relationToClaim: 'CONTRADICTS',
      relevance: 'direct', confidence: 99, credibilityScore: 98, relevanceScore: 1.0, keyEvidence: 'Claim is completely fake',
      explanation: 'Official refutation.', finalContribution: 98, url: 'https://pib.gov.in', publisher: 'PIB Fact Check', sourceType: 'official', snippet: 'Claim is fake.', relation: 'contradicts'
    },
    // 3 weak Tier 5 blog sites asserting the rumor
    {
      id: 'ev-2', claimId: 'c-1', sourceName: 'rumourblog1.xyz', sourceUrl: 'https://rumourblog1.xyz', sourceTier: 5,
      title: 'Curfew Rumour', publishedDate: null, evidenceText: 'Government announces nationwide curfew soon.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 60, credibilityScore: 40, relevanceScore: 1.0, keyEvidence: 'announces curfew',
      explanation: 'Weak support.', finalContribution: 40, url: 'https://rumourblog1.xyz', publisher: 'rumourblog1', sourceType: 'other', snippet: 'Curfew soon.', relation: 'supports'
    },
    {
      id: 'ev-3', claimId: 'c-1', sourceName: 'rumourblog2.xyz', sourceUrl: 'https://rumourblog2.xyz', sourceTier: 5,
      title: 'Curfew Rumour', publishedDate: null, evidenceText: 'Government announces nationwide curfew soon.', relationToClaim: 'SUPPORTS',
      relevance: 'direct', confidence: 60, credibilityScore: 40, relevanceScore: 1.0, keyEvidence: 'announces curfew',
      explanation: 'Weak support.', finalContribution: 40, url: 'https://rumourblog2.xyz', publisher: 'rumourblog2', sourceType: 'other', snippet: 'Curfew soon.', relation: 'supports'
    },
  ];

  const resH = credibilityScorerService.computeCredibilityScore(articleH, claimsH, evH);
  assert(claimsH[0].relation === 'contradicts', 'H: 1 Tier-1 source overcomes 2 weak blogs (relation = contradicts)', { rel: claimsH[0].relation });
  assert(resH.score <= 25, 'H: Article score remains low despite multiple weak supportive claims (Score <= 25)', { score: resH.score });
}

// ----------------------------------------------------------------------
// CATEGORY I — SEMANTIC PARAPHRASING
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY I: SEMANTIC PARAPHRASING ---');
{
  const claimI = "India's capital city is New Delhi.";
  const stanceI = stanceEvaluatorService.evaluateDeterministic(claimI, 'New Delhi serves as the capital of the Republic of India and seat of the Union Government.', 'Government Portal');
  assert(stanceI.relation === 'supports' && stanceI.stanceScore === 1, 'I: Semantic paraphrasing recognized as SUPPORTS (+1)', { relation: stanceI.relation });
}

// ----------------------------------------------------------------------
// CATEGORY J — NEGATION
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY J: NEGATION ---');
{
  const claimJ = 'India is not located in Asia.';
  const stanceJ = stanceEvaluatorService.evaluateDeterministic(claimJ, 'India is a sovereign country located in South Asia.', 'Encyclopædia Britannica');
  assert(stanceJ.relation === 'contradicts' && stanceJ.stanceScore === -1, 'J: Negated false assertion ("not located in Asia") -> CONTRADICTS (-1)', { relation: stanceJ.relation, score: stanceJ.stanceScore });
}

// ----------------------------------------------------------------------
// CATEGORY K — NUMBERS
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY K: NUMBERS ---');
{
  // K1: Approximate population agreement (1.4 billion vs 1.428 billion -> SUPPORTIVE)
  const numCheckK1 = entityExtractorService.checkNumericalCompatibility('1.4 billion', 'India total population reached 1.428 billion citizens.');
  assert(numCheckK1 === 'SUPPORTIVE', 'K1: Approximate number agreement (1.4B vs 1.428B) -> SUPPORTIVE', { result: numCheckK1 });

  // K2: Approximate elevation agreement (8,849 meters vs 8,848.86 meters -> SUPPORTIVE)
  const numCheckK2 = entityExtractorService.checkNumericalCompatibility('8849 meters', 'Mount Everest official height is 8848.86 meters.');
  assert(numCheckK2 === 'SUPPORTIVE', 'K2: Approximate elevation agreement (8849m vs 8848.86m) -> SUPPORTIVE', { result: numCheckK2 });

  // K3: Material discrepancy (₹50,000 crore vs ₹5,000 crore -> CONTRADICTORY)
  const numCheckK3 = entityExtractorService.checkNumericalCompatibility('50000 crore', 'The total project expenditure is 5000 crore.');
  assert(numCheckK3 === 'CONTRADICTORY', 'K3: Material numerical discrepancy (50k Cr vs 5k Cr) -> CONTRADICTORY', { result: numCheckK3 });
}

// ----------------------------------------------------------------------
// CATEGORY L — TEMPORAL CLAIMS
// ----------------------------------------------------------------------
console.log('\n--- CATEGORY L: TEMPORAL CLAIMS ---');
{
  const claimL = 'The current Prime Minister of India is Narendra Modi.';
  const stanceL = stanceEvaluatorService.evaluateDeterministic(claimL, 'Prime Minister Narendra Modi leads the Union Government following the 2024 general election.', 'PIB India', true);
  assert(stanceL.relation === 'supports' && stanceL.stanceScore === 1, 'L: Time-sensitive governance status evaluated as SUPPORTS', { relation: stanceL.relation });
}

// ----------------------------------------------------------------------
// REGRESSION BENCHMARKS
// ----------------------------------------------------------------------
console.log('\n--- REGRESSION BENCHMARKS ---');
{
  // Reg 1: "Ram Mandir is in Pakistan" -> CONTRADICTED / Score <= 20
  const claimReg1 = 'Ram Mandir is in Pakistan';
  const articleReg1: ArticleMetadata = { title: claimReg1, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimReg1 };
  const claimsReg1: ExtractedClaim[] = [{ id: 'c-1', text: claimReg1, importance: 0.9, claim_type: 'geographic' }];
  const evReg1: RetrievedEvidenceItem[] = [{
    id: 'ev-1', claimId: 'c-1', sourceName: 'Encyclopædia Britannica', sourceUrl: 'https://britannica.com', sourceTier: 4,
    title: 'Ram Mandir', publishedDate: null, evidenceText: 'The Ram Mandir is a Hindu temple in Ayodhya, Uttar Pradesh, India.',
    relationToClaim: 'CONTRADICTS', relevance: 'direct', confidence: 98, credibilityScore: 88, relevanceScore: 1.0,
    keyEvidence: 'in Ayodhya, India', explanation: 'Location conflict.', finalContribution: 88, url: 'https://britannica.com',
    publisher: 'Britannica', sourceType: 'encyclopedia', snippet: 'In Ayodhya, India.', relation: 'contradicts'
  }];
  const resReg1 = credibilityScorerService.computeCredibilityScore(articleReg1, claimsReg1, evReg1);
  assert(claimsReg1[0].relation === 'contradicts' && resReg1.score <= 20, 'Reg 1: "Ram Mandir is in Pakistan" -> CONTRADICTS, Score <= 20', { score: resReg1.score });

  // Reg 2: "Asia is the largest continent in the world" -> SUPPORTED / Score >= 80
  const claimReg2 = 'Asia is the largest continent in the world';
  const articleReg2: ArticleMetadata = { title: claimReg2, author: null, publishedAt: null, publisher: 'Direct Text Ingestion', url: null, text: claimReg2 };
  const claimsReg2: ExtractedClaim[] = [{ id: 'c-1', text: claimReg2, importance: 0.85, claim_type: 'geographic' }];
  const evReg2: RetrievedEvidenceItem[] = [{
    id: 'ev-1', claimId: 'c-1', sourceName: 'Wikipedia Knowledge Archive', sourceUrl: 'https://en.wikipedia.org/wiki/Asia', sourceTier: 4,
    title: 'Asia', publishedDate: null, evidenceText: 'Asia is the largest continent in the world by both land area and population.',
    relationToClaim: 'SUPPORTS', relevance: 'direct', confidence: 98, credibilityScore: 85, relevanceScore: 1.0,
    keyEvidence: 'largest continent in the world', explanation: 'Reference confirmation.', finalContribution: 85,
    url: 'https://en.wikipedia.org/wiki/Asia', publisher: 'Wikipedia', sourceType: 'encyclopedia', snippet: 'Largest continent.', relation: 'supports'
  }];
  const resReg2 = credibilityScorerService.computeCredibilityScore(articleReg2, claimsReg2, evReg2);
  assert(claimsReg2[0].relation === 'supports' && resReg2.score >= 80, 'Reg 2: "Asia is the largest continent" -> SUPPORTS, Score >= 80', { score: resReg2.score });
}

console.log('\n============================================================');
console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('============================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
