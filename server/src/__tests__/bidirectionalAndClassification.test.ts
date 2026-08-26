import { describe, it } from 'node:test';
import assert from 'node:assert';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

describe('🌐 STEP 13: BIDIRECTIONAL EVIDENCE VERIFICATION & CLAIM CLASSIFICATION', () => {
  // ---------------------------------------------------------------------------------
  // 1. CLAIM TYPE CLASSIFICATION TESTS
  // ---------------------------------------------------------------------------------
  it('Classification: Classifies diverse statements into standard categories', () => {
    // 1. Objective Fact (Physical shape, science, geography)
    const c1 = claimExtractorService.classifyClaimClassification('Earth is flat.');
    assert.strictEqual(c1.classification, 'OBJECTIVE_FACT');
    assert.strictEqual(c1.isVerifiable, true);

    const c2 = claimExtractorService.classifyClaimClassification('Earth is round.');
    assert.strictEqual(c2.classification, 'OBJECTIVE_FACT');
    assert.strictEqual(c2.isVerifiable, true);

    const c3 = claimExtractorService.classifyClaimClassification('India is located in South Asia.');
    assert.strictEqual(c3.classification, 'OBJECTIVE_FACT');
    assert.strictEqual(c3.isVerifiable, true);

    // 2. Comparative Fact
    const c4 = claimExtractorService.classifyClaimClassification('Jupiter is the smallest planet.');
    assert.strictEqual(c4.classification, 'COMPARATIVE_FACT');
    assert.strictEqual(c4.isVerifiable, true);

    const c5 = claimExtractorService.classifyClaimClassification('Jupiter is the largest planet in the Solar System.');
    assert.strictEqual(c5.classification, 'COMPARATIVE_FACT');
    assert.strictEqual(c5.isVerifiable, true);

    // 3. Numerical Fact
    const c6 = claimExtractorService.classifyClaimClassification('Water boils at 100°C at standard atmospheric pressure.');
    assert.strictEqual(c6.classification, 'NUMERICAL_FACT');
    assert.strictEqual(c6.isVerifiable, true);

    // 4. Current Event
    const c7 = claimExtractorService.classifyClaimClassification('Now T20 captain of India is Suryakumar Yadav.');
    assert.strictEqual(c7.classification, 'CURRENT_EVENT');
    assert.strictEqual(c7.isVerifiable, true);

    // 5. Belief / Theological
    const c8 = claimExtractorService.classifyClaimClassification('Ram is God.');
    assert.strictEqual(c8.classification, 'BELIEF_OR_THEOLOGICAL');
    assert.strictEqual(c8.isVerifiable, false);
    assert.ok(c8.explanation && c8.explanation.includes('religious or theological'));

    // 6. Subjective Opinion
    const c9 = claimExtractorService.classifyClaimClassification('This movie is terrible.');
    assert.strictEqual(c9.classification, 'OPINION');
    assert.strictEqual(c9.isVerifiable, false);
    assert.ok(c9.explanation && c9.explanation.includes('opinion'));

    // 7. Future Prediction
    const c10 = claimExtractorService.classifyClaimClassification('India will win the next World Cup.');
    assert.strictEqual(c10.classification, 'PREDICTION');
    assert.strictEqual(c10.isVerifiable, false);
    assert.ok(c10.explanation && c10.explanation.includes('Future outcomes'));
  });

  // ---------------------------------------------------------------------------------
  // 2. BIDIRECTIONAL SEARCH QUERY GENERATION
  // ---------------------------------------------------------------------------------
  it('Bidirectional Search: Generates support and contradiction queries for shape assertions', () => {
    const flatQueries = evidenceRetrieverService.generateSearchQueries('The Earth is flat.');
    assert.ok(flatQueries.length >= 2, 'Should generate multiple queries');
    const hasFactualShape = flatQueries.some((q) => q.toLowerCase().includes('shape') || q.toLowerCase().includes('spherical'));
    assert.ok(hasFactualShape, 'Queries must include underlying factual shape searches');

    const roundQueries = evidenceRetrieverService.generateSearchQueries('The Earth is round.');
    assert.ok(roundQueries.length >= 2, 'Should generate multiple queries');
    const hasRound = roundQueries.some((q) => q.toLowerCase().includes('shape') || q.toLowerCase().includes('round') || q.toLowerCase().includes('spherical'));
    assert.ok(hasRound, 'Queries must include spherical/round searches');
  });

  // ---------------------------------------------------------------------------------
  // 3. REQUIRED TEST CASES (1 to 10)
  // ---------------------------------------------------------------------------------

  // Test Case 1: "Earth is flat." => OBJECTIVE_FACT => CONTRADICTED
  it('Test 1: "Earth is flat." -> OBJECTIVE_FACT, CONTRADICTED, Low Score', () => {
    const claim = 'The Earth is flat.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'OBJECTIVE_FACT');

    const evSnippet =
      'Scientific geodesy, orbital satellite photography from NASA and ESA, and physics confirm that the Earth is an oblate spheroid revolving around the Sun.';
    const evTitle = 'Earth: Shape, Gravity, and Geodesy — NASA Science';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'contradicts', 'Should be CONTRADICTED');
    assert.strictEqual(stance.stanceScore, -1, 'Stance score must be -1');

    const extClaim: ExtractedClaim = {
      id: 'cl-1',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: classInfo.classification,
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-1',
      claimId: 'cl-1',
      sourceName: 'NASA Solar System Exploration',
      sourceUrl: 'https://science.nasa.gov/earth',
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
      keyEvidence: 'Earth is an oblate spheroid.',
      explanation: stance.reasoning,
      finalContribution: 99,
      domain: 'nasa.gov',
      freshness: 'CURRENT',
      stance: 'contradicts',
      url: 'https://science.nasa.gov/earth',
      publisher: 'NASA',
      sourceType: 'official',
      snippet: evSnippet,
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Planetary Physics Overview',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(scoreResult.score <= 25, `Expected score <= 25 for flat Earth claim, got ${scoreResult.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
  });

  // Test Case 2: "Earth is round." => OBJECTIVE_FACT => SUPPORTED
  it('Test 2: "Earth is round." -> OBJECTIVE_FACT, SUPPORTED, High Score', () => {
    const claim = 'The Earth is round.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'OBJECTIVE_FACT');

    const evSnippet =
      'The Earth is spherical, an oblate spheroid with a mean radius of 6,371 kilometers, corroborated by planetary observation and global positioning systems.';
    const evTitle = 'Planetary Shape and Earth Geodesy — National Geographic';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'supports', 'Should be SUPPORTED');
    assert.strictEqual(stance.stanceScore, 1, 'Stance score must be +1');

    const extClaim: ExtractedClaim = {
      id: 'cl-2',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: classInfo.classification,
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-2',
      claimId: 'cl-2',
      sourceName: 'National Geographic',
      sourceUrl: 'https://nationalgeographic.org/earth',
      sourceTier: 1,
      sourceReliability: 98,
      title: evTitle,
      publishedDate: '2026-08-20',
      evidenceText: evSnippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      keyEvidence: 'The Earth is round and spherical.',
      explanation: stance.reasoning,
      finalContribution: 98,
      domain: 'nationalgeographic.org',
      freshness: 'CURRENT',
      stance: 'supports',
      url: 'https://nationalgeographic.org/earth',
      publisher: 'National Geographic',
      sourceType: 'reference',
      snippet: evSnippet,
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Earth Shape Facts',
      author: 'Science Staff',
      publishedAt: '2026-08-20',
      publisher: 'NatGeo',
      url: 'https://nationalgeographic.org/earth',
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(scoreResult.score >= 80, `Expected score >= 80 for round Earth claim, got ${scoreResult.score}`);
    assert.strictEqual(extClaim.relation, 'supports');
  });

  // Test Case 3: "Jupiter is the smallest planet." => COMPARATIVE_FACT => CONTRADICTED
  it('Test 3: "Jupiter is the smallest planet." -> CONTRADICTED', () => {
    const claim = 'Jupiter is the smallest planet in the Solar System.';
    const evSnippet =
      'Jupiter is the largest planet in the Solar System, with a mass more than two and a half times that of all other planets combined. Mercury is the smallest planet.';
    const evTitle = 'Solar System Planet Sizes — NASA';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'contradicts', 'Should evaluate as CONTRADICTED');
    assert.strictEqual(stance.stanceScore, -1);
  });

  // Test Case 4: "Jupiter is the largest planet." => COMPARATIVE_FACT => SUPPORTED
  it('Test 4: "Jupiter is the largest planet." -> SUPPORTED', () => {
    const claim = 'Jupiter is the largest planet in the Solar System.';
    const evSnippet =
      'Jupiter is the largest planet in the Solar System, with a radius of approximately 69,911 km.';
    const evTitle = 'Jupiter Planet Overview — NASA';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'supports', 'Should evaluate as SUPPORTED');
    assert.strictEqual(stance.stanceScore, 1);
  });

  // Test Case 5: "India is located in South Asia." => OBJECTIVE_FACT => SUPPORTED
  it('Test 5: "India is located in South Asia." -> SUPPORTED', () => {
    const claim = 'India is located in South Asia.';
    const evSnippet =
      'India is a sovereign country located in South Asia, bounded by the Indian Ocean.';
    const evTitle = 'India Profile — Britannica';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'supports');
    assert.strictEqual(stance.stanceScore, 1);
  });

  // Test Case 6: "India is located in South America." => OBJECTIVE_FACT => CONTRADICTED
  it('Test 6: "India is located in South America." -> CONTRADICTED', () => {
    const claim = 'India is located in South America.';
    const evSnippet =
      'India is a sovereign nation in South Asia bounded by the Himalayas and Indian Ocean.';
    const evTitle = 'World Geography — National Geographic';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'contradicts');
    assert.strictEqual(stance.stanceScore, -1);
  });

  // Test Case 7: "Ram is God." => BELIEF_OR_THEOLOGICAL => NOT objectively verifiable
  it('Test 7: "Ram is God." -> BELIEF_OR_THEOLOGICAL, NOT objectively verifiable', () => {
    const claim = 'Ram is God.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'BELIEF_OR_THEOLOGICAL');
    assert.strictEqual(classInfo.isVerifiable, false);

    const extClaim: ExtractedClaim = {
      id: 'cl-7',
      text: claim,
      importance: 0.8,
      claim_type: 'theological',
      classification: classInfo.classification,
      isVerifiable: false,
      notVerifiableReason: classInfo.explanation,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Devotional Discourse',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], []);
    assert.strictEqual(extClaim.claimScore, undefined, 'Theological claims must have undefined score (Score: N/A)');
    assert.ok(scoreResult.summary.includes('theological') || scoreResult.summary.includes('religious'));
  });

  // Test Case 8: "This movie is terrible." => OPINION => NOT objectively verifiable
  it('Test 8: "This movie is terrible." -> OPINION, NOT objectively verifiable', () => {
    const claim = 'This movie is terrible.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'OPINION');
    assert.strictEqual(classInfo.isVerifiable, false);

    const extClaim: ExtractedClaim = {
      id: 'cl-8',
      text: claim,
      importance: 0.5,
      claim_type: 'opinion',
      classification: classInfo.classification,
      isVerifiable: false,
      notVerifiableReason: classInfo.explanation,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Film Review',
      author: 'Critic',
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], []);
    assert.strictEqual(extClaim.claimScore, undefined, 'Opinion claims must have undefined score (Score: N/A)');
    assert.ok(scoreResult.summary.includes('opinion') || scoreResult.summary.includes('subjective'));
  });

  // Test Case 9: "India will win the next World Cup." => PREDICTION => NOT currently verifiable
  it('Test 9: "India will win the next World Cup." -> PREDICTION, NOT currently verifiable', () => {
    const claim = 'India will win the next World Cup.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'PREDICTION');
    assert.strictEqual(classInfo.isVerifiable, false);

    const extClaim: ExtractedClaim = {
      id: 'cl-9',
      text: claim,
      importance: 0.6,
      claim_type: 'prediction',
      classification: classInfo.classification,
      isVerifiable: false,
      notVerifiableReason: classInfo.explanation,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Sports Forecast',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], []);
    assert.strictEqual(extClaim.claimScore, undefined, 'Predictions must have undefined score (Score: N/A)');
    assert.ok(scoreResult.summary.includes('Future') || scoreResult.summary.includes('prediction'));
  });

  // Test Case 10: Obscure unsupported factual claim => LIMITED EVIDENCE / UNCLEAR
  it('Test 10: "Some obscure person owns a red bicycle." -> LIMITED EVIDENCE / UNCLEAR (neutral unverified baseline)', () => {
    const claim = 'Some obscure person owns a red bicycle in a remote village.';
    const classInfo = claimExtractorService.classifyClaimClassification(claim);
    assert.strictEqual(classInfo.classification, 'OBJECTIVE_FACT');
    assert.strictEqual(classInfo.isVerifiable, true);

    const extClaim: ExtractedClaim = {
      id: 'cl-10',
      text: claim,
      importance: 0.5,
      claim_type: 'factual',
      classification: classInfo.classification,
      isVerifiable: true,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Local Travel Note',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], []);
    assert.strictEqual(extClaim.relation, 'unclear', 'Absence of evidence must evaluate as UNCLEAR');
    assert.ok(
      scoreResult.score >= 45 && scoreResult.score <= 58,
      `Unverified baseline score must be neutral (45-58), got ${scoreResult.score}`
    );
    assert.strictEqual(scoreResult.verdict, 'Needs Verification');
  });

  // Test Case 11: "Earth is approximately spherical." => VERY HIGH credibility
  it('Test 11: "Earth is approximately spherical." -> VERY HIGH credibility (Score >= 85)', () => {
    const claim = 'The Earth is approximately spherical.';
    const evSnippet =
      'The Earth is approximately spherical, slightly flattened at the poles into an oblate spheroid, measured by satellite geodesy.';
    const evTitle = 'Earth Geodesy — NASA Science';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);
    assert.strictEqual(stance.relation, 'supports');
    assert.strictEqual(stance.stanceScore, 1);

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
      sourceReliability: 98,
      title: evTitle,
      publishedDate: '2026-08-20',
      evidenceText: evSnippet,
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'nasa.gov',
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Earth Shape',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(scoreResult.score >= 85, `Expected score >= 85 for spherical Earth, got ${scoreResult.score}`);
    assert.strictEqual(scoreResult.verdict, 'Probably Credible');
  });

  // Test Case 12: "Suryakumar Yadav is currently India's T20I captain." => LOW credibility
  it('Test 12: "Suryakumar Yadav is currently India\'s T20I captain." -> LOW credibility (Score <= 30)', () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const evSnippet =
      "BCCI has officially confirmed that Shreyas Iyer has replaced Suryakumar Yadav as India's new T20I captain starting August 2026.";
    const evTitle = 'BCCI Leadership Announcement';

    const stance = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, true);
    assert.strictEqual(stance.relation, 'contradicts');
    assert.strictEqual(stance.stanceScore, -1);

    const extClaim: ExtractedClaim = {
      id: 'cl-12',
      text: claim,
      importance: 0.85,
      claim_type: 'temporal',
      classification: 'CURRENT_EVENT',
      isVerifiable: true,
    };

    const evidence: RetrievedEvidenceItem = {
      id: 'ev-12',
      claimId: 'cl-12',
      sourceName: 'BCCI Official',
      sourceTier: 1,
      sourceReliability: 98,
      title: evTitle,
      publishedDate: '2026-08-22',
      evidenceText: evSnippet,
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'bcci.tv',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Cricket News',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const scoreResult = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evidence]);
    assert.ok(scoreResult.score <= 30, `Expected score <= 30 for replaced captain, got ${scoreResult.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
  });
});
