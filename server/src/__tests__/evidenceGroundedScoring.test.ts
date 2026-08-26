import { describe, it } from 'node:test';
import assert from 'node:assert';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

describe('🔬 EVIDENCE-GROUNDED DETERMINISTIC SCORING & RELEVANCE FILTERING', () => {
  // ---------------------------------------------------------------------------------
  // 1. Strong Support => High Score (>= 85)
  // ---------------------------------------------------------------------------------
  it('1. Strong support from Tier 1 authoritative sources -> High Score (>= 85)', () => {
    const claim = 'India is located in South Asia.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'OBJECTIVE_FACT');

    const extClaim: ExtractedClaim = {
      id: 'cl-1',
      text: claim,
      importance: 0.9,
      claim_type: 'geographic',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-1',
      claimId: 'cl-1',
      sourceName: 'Survey of India / UN Geospatial',
      sourceTier: 1,
      sourceReliability: 98,
      title: 'Geographic Profile of India',
      publishedDate: '2026-08-01',
      evidenceText: 'India is a sovereign country situated in South Asia, bounded by the Indian Ocean.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'surveyofindia.gov.in',
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Geography of India',
      author: 'Geographer',
      publishedAt: '2026-08-01',
      publisher: 'Official Registry',
      url: 'https://geo.gov.in',
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(result.score >= 85, `Expected score >= 85, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'supports');
    assert.ok(extClaim.auditTrail && extClaim.auditTrail.supportStrength > 0.5);
  });

  // ---------------------------------------------------------------------------------
  // 2. Strong Contradiction => Low Score (<= 25)
  // ---------------------------------------------------------------------------------
  it('2. Strong contradiction from authoritative sources -> Low Score (<= 25)', () => {
    const claim = 'Ram Mandir is in Pakistan.';
    const extClaim: ExtractedClaim = {
      id: 'cl-2',
      text: claim,
      importance: 0.9,
      claim_type: 'location',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-2',
      claimId: 'cl-2',
      sourceName: 'Supreme Court of India / Archaeological Survey of India',
      sourceTier: 1,
      sourceReliability: 99,
      title: 'Ayodhya Landmark Judgment Records',
      publishedDate: '2026-08-01',
      evidenceText: 'The historic Ram Mandir is constructed at Ram Janmabhoomi in Ayodhya, Uttar Pradesh, India.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'sci.gov.in',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Temple Location',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(result.score <= 25, `Expected score <= 25 for contradicted claim, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
    assert.ok(extClaim.auditTrail && extClaim.auditTrail.contradictionStrength > 0.5);
  });

  // ---------------------------------------------------------------------------------
  // 3. Balanced Reliable Conflict => Middle Score (40 - 60)
  // ---------------------------------------------------------------------------------
  it('3. Genuine conflicting evidence from reputable independent sources -> Middle Score (40-60)', () => {
    const claim = 'The regional border dispute was resolved in March 2026.';
    const extClaim: ExtractedClaim = {
      id: 'cl-3',
      text: claim,
      importance: 0.8,
      claim_type: 'political',
      classification: 'CURRENT_EVENT',
      isVerifiable: true,
    };

    const evSup: RetrievedEvidenceItem = {
      id: 'ev-3a',
      claimId: 'cl-3',
      sourceName: 'Reuters',
      sourceTier: 2,
      sourceReliability: 88,
      title: 'Dispute Settlement Statement',
      publishedDate: '2026-08-10',
      evidenceText: 'Officials announce preliminary resolution of the border dispute in March 2026.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 88,
      credibilityScore: 88,
      relevanceScore: 1.0,
      domain: 'reuters.com',
      relation: 'supports',
    };

    const evCon: RetrievedEvidenceItem = {
      id: 'ev-3b',
      claimId: 'cl-3',
      sourceName: 'Associated Press',
      sourceTier: 2,
      sourceReliability: 88,
      title: 'Border Talks Stall',
      publishedDate: '2026-08-11',
      evidenceText: 'Negotiators dispute claims that a resolution was reached, confirming border disputes remain unresolved.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 88,
      credibilityScore: 88,
      relevanceScore: 1.0,
      domain: 'apnews.com',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Border Resolution',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evSup, evCon]);
    assert.ok(
      result.score >= 40 && result.score <= 60,
      `Expected score in 40-60 for conflicting evidence, got ${result.score}`
    );
    assert.strictEqual(extClaim.consensusStatus, 'CONFLICTING_EVIDENCE');
  });

  // ---------------------------------------------------------------------------------
  // 4. Irrelevant Evidence => Should NOT increase score
  // ---------------------------------------------------------------------------------
  it('4. Irrelevant evidence mentioning subjects in other contexts -> Ignored, does NOT inflate score', () => {
    const claim = 'Salman Khan is married.';
    const triple = entityExtractorService.extractClaimTriple(claim);
    assert.strictEqual(triple?.attribute, 'marital_status');

    // Page merely mentioning Salman Khan at a movie release
    const evSnippet = 'Salman Khan attended the premiere of his new action thriller alongside Bollywood celebrities.';
    const evTitle = 'Box Office Buzz';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'unclear');
    assert.strictEqual(stance.relevance, 'irrelevant');
    assert.strictEqual(stance.stanceScore, 0);

    const extClaim: ExtractedClaim = {
      id: 'cl-4',
      text: claim,
      importance: 0.8,
      claim_type: 'biographical',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evItem: RetrievedEvidenceItem = {
      id: 'ev-4',
      claimId: 'cl-4',
      sourceName: 'Entertainment Weekly',
      sourceTier: 4,
      sourceReliability: 65,
      title: evTitle,
      publishedDate: '2026-08-01',
      evidenceText: evSnippet,
      relationToClaim: 'NEUTRAL',
      relevance: 'irrelevant',
      confidence: 50,
      credibilityScore: 65,
      relevanceScore: 0.0,
      domain: 'ew.com',
      relation: 'unclear',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Celebrity Update',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evItem]);
    assert.ok(
      result.score <= 58 && result.score >= 45,
      `Irrelevant evidence must not inflate score, got ${result.score}`
    );
    assert.strictEqual(extClaim.auditTrail?.ignoredSourcesCount, 1);
  });

  // ---------------------------------------------------------------------------------
  // 5. No Evidence => LIMITED EVIDENCE (Score 45-58 unverified baseline, NOT 0 and NOT 100)
  // ---------------------------------------------------------------------------------
  it('5. No evidence available -> Neutral unverified baseline (45-58) without artificial penalty', () => {
    const claim = 'An obscure person owns a vintage red bicycle.';
    const extClaim: ExtractedClaim = {
      id: 'cl-5',
      text: claim,
      importance: 0.5,
      claim_type: 'factual',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Village Note',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], []);
    assert.strictEqual(extClaim.relation, 'unclear');
    assert.ok(result.score >= 45 && result.score <= 58);
    assert.strictEqual(result.verdict, 'Needs Verification');
  });

  // ---------------------------------------------------------------------------------
  // 6. Old Evidence vs Current Claim => Heavily Discounted
  // ---------------------------------------------------------------------------------
  it('6. Old evidence vs current claim -> Heavily discounted in favor of recent contradiction', () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const extClaim: ExtractedClaim = {
      id: 'cl-6',
      text: claim,
      importance: 0.85,
      claim_type: 'temporal',
      classification: 'CURRENT_EVENT',
      isTimeSensitive: true,
      isVerifiable: true,
    };

    // Old evidence from 2024 saying he is captain
    const evOld: RetrievedEvidenceItem = {
      id: 'ev-old',
      claimId: 'cl-6',
      sourceName: 'Cricket News',
      sourceTier: 2,
      sourceReliability: 85,
      title: 'India T20 Squad 2024',
      publishedDate: '2024-07-15',
      freshness: 'OLD',
      temporalRelevance: 'OBSOLETE',
      evidenceText: 'Suryakumar Yadav has been named India T20 captain for the upcoming tour.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 85,
      credibilityScore: 85,
      relevanceScore: 1.0,
      domain: 'cricketnews.com',
      relation: 'supports',
    };

    // Recent 2026 evidence saying he was replaced
    const evRecent: RetrievedEvidenceItem = {
      id: 'ev-recent',
      claimId: 'cl-6',
      sourceName: 'BCCI Official',
      sourceTier: 1,
      sourceReliability: 98,
      title: 'BCCI Leadership Update',
      publishedDate: '2026-08-20',
      freshness: 'CURRENT',
      temporalRelevance: 'TEMPORALLY_RELEVANT',
      evidenceText: 'BCCI confirms Shreyas Iyer has replaced Suryakumar Yadav as India T20I captain.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'bcci.tv',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Captaincy Report',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evOld, evRecent]);
    assert.ok(result.score <= 30, `Expected low score for superseded temporal claim, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
  });

  // ---------------------------------------------------------------------------------
  // 7. Same Evidence Repeated => Deterministic Reproducible Output
  // ---------------------------------------------------------------------------------
  it('7. Same evidence evaluated multiple times produces strictly identical scores', () => {
    const claim = 'Water boils at 100°C at sea level.';
    const extClaim1: ExtractedClaim = {
      id: 'cl-7a',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: 'NUMERICAL_FACT',
      isVerifiable: true,
    };
    const extClaim2: ExtractedClaim = {
      id: 'cl-7b',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: 'NUMERICAL_FACT',
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-7',
      claimId: 'cl-7a',
      sourceName: 'NIST Chemistry WebBook',
      sourceTier: 1,
      sourceReliability: 99,
      title: 'Thermodynamics of Water',
      publishedDate: '2026-01-01',
      evidenceText: 'Water boils at 100°C (373.15 K) at standard atmospheric pressure (1 atm).',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'nist.gov',
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Water Physics',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const run1 = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim1], [evidence]);
    evidence.claimId = 'cl-7b';
    const run2 = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim2], [evidence]);

    assert.strictEqual(run1.score, run2.score, 'Scoring must be 100% deterministic and reproducible');
    assert.strictEqual(run1.verdict, run2.verdict);
  });

  // ---------------------------------------------------------------------------------
  // 8. Duplicate URLs / Syndication => Diminishing returns (No score inflation)
  // ---------------------------------------------------------------------------------
  it('8. Duplicate syndicated articles from same publisher do not artificially inflate score', () => {
    const claim = 'A newly discovered comet was cataloged by astronomers.';
    const extClaim: ExtractedClaim = {
      id: 'cl-8',
      text: claim,
      importance: 0.7,
      claim_type: 'factual',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evBase: RetrievedEvidenceItem = {
      id: 'ev-8a',
      claimId: 'cl-8',
      sourceName: 'Syndicated Wire',
      sourceTier: 2,
      sourceReliability: 85,
      title: 'Comet Cataloged',
      publishedDate: '2026-08-01',
      evidenceText: 'Astronomers have cataloged a newly discovered comet.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 85,
      credibilityScore: 85,
      relevanceScore: 1.0,
      domain: 'syndicatedwire.com',
      relation: 'supports',
    };

    // 4 duplicate syndicated items with same domain
    const duplicates = [1, 2, 3, 4].map((i) => ({
      ...evBase,
      id: `ev-8-dup-${i}`,
    }));

    const articleMeta: ArticleMetadata = {
      title: 'Astronomy News',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], duplicates);
    assert.ok(result.score >= 80 && result.score <= 98, `Valid score without runaway inflation: ${result.score}`);
    assert.strictEqual(extClaim.auditTrail?.sourceIndependence, 1);
  });

  // ---------------------------------------------------------------------------------
  // 9. Salman Khan Marital Status Claim => Extracted & Contradicted (Score <= 25)
  // ---------------------------------------------------------------------------------
  it('9. "Salman Khan is married." -> Marital status extracted, refuted by bio records, Score <= 25', () => {
    const claim = 'Salman Khan is married.';
    const triple = entityExtractorService.extractClaimTriple(claim);
    assert.strictEqual(triple?.attribute, 'marital_status');
    assert.strictEqual(triple?.claimValue, 'married');

    const evSnippet =
      'Salman Khan remains one of Bollywood’s most famous bachelors, has never been married, and is currently unmarried.';
    const evTitle = 'Salman Khan Biography & Personal Life — Official Profile';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'contradicts');
    assert.strictEqual(stance.stanceScore, -1);
    assert.strictEqual(stance.relevance, 'direct');

    const extClaim: ExtractedClaim = {
      id: 'cl-9',
      text: claim,
      importance: 0.85,
      claim_type: 'biographical',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evItem: RetrievedEvidenceItem = {
      id: 'ev-9',
      claimId: 'cl-9',
      sourceName: 'Encyclopedia of Cinema',
      sourceTier: 2,
      sourceReliability: 90,
      title: evTitle,
      publishedDate: '2026-08-01',
      evidenceText: evSnippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 90,
      relevanceScore: 1.0,
      domain: 'cinemapedia.org',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Celebrity Fact Check',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evItem]);
    assert.ok(result.score <= 25, `Expected score <= 25 for contradicted marital claim, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
  });

  // ---------------------------------------------------------------------------------
  // 10. Suryakumar Yadav Captaincy Claim => Contradicted (Score <= 30)
  // ---------------------------------------------------------------------------------
  it('10. "Suryakumar Yadav is currently India\'s T20I captain." -> Contradicted by BCCI update (Score <= 30)', () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const evSnippet =
      "BCCI announces that Shreyas Iyer has replaced Suryakumar Yadav as India's new T20I captain.";
    const evTitle = 'BCCI Leadership Press Release';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, true);
    assert.strictEqual(stance.relation, 'contradicts');

    const extClaim: ExtractedClaim = {
      id: 'cl-10',
      text: claim,
      importance: 0.85,
      claim_type: 'temporal',
      classification: 'CURRENT_EVENT',
      isTimeSensitive: true,
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-10',
      claimId: 'cl-10',
      sourceName: 'BCCI Official',
      sourceTier: 1,
      sourceReliability: 99,
      title: evTitle,
      publishedDate: '2026-08-20',
      evidenceText: evSnippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'bcci.tv',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Cricket Governance',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(result.score <= 30, `Expected score <= 30, got ${result.score}`);
  });

  // ---------------------------------------------------------------------------------
  // 11. Earth is Flat => Low (<= 20)
  // ---------------------------------------------------------------------------------
  it('11. "Earth is flat." -> Low Credibility (Score <= 20)', () => {
    const claim = 'Earth is flat.';
    const evSnippet =
      'Orbital imagery and satellite geodesy confirm the Earth is an oblate spheroid revolving around the Sun.';
    const evTitle = 'NASA Earth Geodesy';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'contradicts');

    const extClaim: ExtractedClaim = {
      id: 'cl-11',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-11',
      claimId: 'cl-11',
      sourceName: 'NASA',
      sourceTier: 1,
      sourceReliability: 99,
      title: evTitle,
      publishedDate: '2026-08-01',
      evidenceText: evSnippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'nasa.gov',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Planetary Shape',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(result.score <= 20, `Expected score <= 20 for flat earth, got ${result.score}`);
  });

  // ---------------------------------------------------------------------------------
  // 12. Earth is approximately spherical => High (>= 85)
  // ---------------------------------------------------------------------------------
  it('12. "Earth is approximately spherical." -> High Credibility (Score >= 85)', () => {
    const claim = 'Earth is approximately spherical.';
    const evSnippet =
      'Scientific consensus confirms the Earth is approximately spherical, specifically an oblate spheroid.';
    const evTitle = 'ESA Earth Observation';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'supports');

    const extClaim: ExtractedClaim = {
      id: 'cl-12',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-12',
      claimId: 'cl-12',
      sourceName: 'ESA',
      sourceTier: 1,
      sourceReliability: 98,
      title: evTitle,
      publishedDate: '2026-08-01',
      evidenceText: evSnippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'esa.int',
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Geodesy Science',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(result.score >= 85, `Expected score >= 85 for spherical earth, got ${result.score}`);
  });

  // ---------------------------------------------------------------------------------
  // 13. Modi Religious Claim => Score + Theological Classification
  // ---------------------------------------------------------------------------------
  it('13. "Modi is God." -> Theological classification with respectful non-factual disclaimer', () => {
    const claim = 'Modi is God.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'BELIEF_OR_THEOLOGICAL');
    assert.strictEqual(classInfo.isVerifiable, false);

    const extClaim: ExtractedClaim = {
      id: 'cl-13',
      text: claim,
      importance: 0.7,
      claim_type: 'theological',
      classification: 'BELIEF_OR_THEOLOGICAL',
      isVerifiable: false,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Religious Rhetoric',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], []);
    assert.ok(
      result.summary.toLowerCase().includes('theological') ||
      result.summary.toLowerCase().includes('belief'),
      'Must include theological explanation without declaring scientifically false'
    );
  });
});
