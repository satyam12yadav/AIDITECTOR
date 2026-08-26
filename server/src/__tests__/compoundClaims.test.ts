import { describe, it } from 'node:test';
import assert from 'node:assert';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

describe('🧩 STEP 13: COMPOUND CLAIM & MULTI-PROPOSITION VERIFICATION TEST SUITE', () => {
  // ---------------------------------------------------------------------------------
  // 1. COMPOUND CLAIM DECOMPOSITION TESTS
  // ---------------------------------------------------------------------------------
  it('Decomposition 1: Decomposes dual-attribute "by both X and Y" into independent atomic subclaims', () => {
    const claim = 'Asia is the largest continent in the world by both land area and total population.';
    const subclaims = entityExtractorService.extractSubclaims(claim);

    assert.strictEqual(subclaims.length, 2, 'Should extract 2 atomic subclaims');
    assert.strictEqual(subclaims[0].subject, 'Asia');
    assert.strictEqual(subclaims[0].attribute, 'land area');
    assert.strictEqual(subclaims[0].text, 'Asia is the largest continent in the world by land area.');

    assert.strictEqual(subclaims[1].subject, 'Asia');
    assert.strictEqual(subclaims[1].attribute, 'total population');
    assert.strictEqual(subclaims[1].text, 'Asia is the largest continent in the world by total population.');
  });

  it('Decomposition 2: Decomposes conjoined clauses with contrasting conjunctions into subclaims', () => {
    const claim = 'Asia is the largest continent by land area, but Europe is the largest continent by population.';
    const subclaims = entityExtractorService.extractSubclaims(claim);

    assert.strictEqual(subclaims.length, 2, 'Should extract 2 subclaims');
    assert.strictEqual(subclaims[0].text, 'Asia is the largest continent by land area.');
    assert.strictEqual(subclaims[1].text, 'Europe is the largest continent by population.');
  });

  it('Decomposition 3: Decomposes "Europe is the largest continent by land area and population"', () => {
    const claim = 'Europe is the largest continent by land area and population.';
    const subclaims = entityExtractorService.extractSubclaims(claim);

    assert.strictEqual(subclaims.length, 2, 'Should extract 2 subclaims');
    assert.strictEqual(subclaims[0].text, 'Europe is the largest continent by land area.');
    assert.strictEqual(subclaims[1].text, 'Europe is the largest continent by population.');
  });

  // ---------------------------------------------------------------------------------
  // 2. SEARCH QUERY GENERATION FOR COMPOUND CLAIMS
  // ---------------------------------------------------------------------------------
  it('Query Gen: Generates targeted queries for individual atomic propositions', () => {
    const claim = 'Asia is the largest continent in the world by both land area and total population.';
    const queries = evidenceRetrieverService.generateSearchQueries(claim);

    assert.ok(queries.length >= 2, 'Should generate 2-4 queries');
    const hasArea = queries.some((q) => q.toLowerCase().includes('area') || q.toLowerCase().includes('largest'));
    const hasPop = queries.some((q) => q.toLowerCase().includes('population') || q.toLowerCase().includes('asia'));
    assert.ok(hasArea, 'Queries should include area proposition');
    assert.ok(hasPop, 'Queries should include population proposition');
  });

  // ---------------------------------------------------------------------------------
  // 3. ATOMIC STANCE EVALUATION TESTS (Required Test Cases 1 - 5)
  // ---------------------------------------------------------------------------------
  it('Test 1: "Asia is the largest continent by land area and population." -> SUPPORTED', () => {
    const claim = 'Asia is the largest continent by land area and population.';
    const evSnippet =
      'Asia is the largest continent in the world by both land area and total population, covering approximately 44.58 million square kilometers.';
    const evTitle = 'Asia Geography & Demographics — Britannica';

    const result = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);

    assert.strictEqual(result.relation, 'supports', 'Should evaluate as SUPPORTED');
    assert.strictEqual(result.stanceScore, 1, 'Stance score should be +1');
    assert.ok(result.confidence >= 90, 'Confidence should be >= 90%');
  });

  it('Test 2: "Asia is the largest continent by land area, but Europe is the largest continent by population." -> PARTIALLY SUPPORTED / MIXED / CONTRADICTED', () => {
    const claim = 'Asia is the largest continent by land area, but Europe is the largest continent by population.';
    const evSnippet =
      'Asia is the largest continent in the world by both land area and population. Europe is the third most populous continent after Asia and Africa.';
    const evTitle = 'World Continents by Area and Population — National Geographic';

    const result = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);

    assert.strictEqual(result.relation, 'contradicts', 'Mixed compound claim with false proposition must be CONTRADICTED');
    assert.strictEqual(result.stanceScore, -1, 'Stance score must be -1');
    assert.ok(result.reasoning.includes('Partial contradiction') || result.reasoning.includes('CONTRADICTED'));
  });

  it('Test 3: "Europe is the largest continent by land area and population." -> CONTRADICTED', () => {
    const claim = 'Europe is the largest continent by land area and population.';
    const evSnippet =
      'Asia is the largest continent on Earth by both land area and total population, with over 4.7 billion people.';
    const evTitle = 'Encyclopedic Entry: Continents of the World';

    const result = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);

    assert.strictEqual(result.relation, 'contradicts', 'Should evaluate as CONTRADICTED');
    assert.strictEqual(result.stanceScore, -1, 'Stance score should be -1');
  });

  it('Test 4: "India is a sovereign country located in South Asia." -> SUPPORTED', () => {
    const claim = 'India is a sovereign country located in South Asia.';
    const evSnippet =
      'India, officially the Republic of India, is a sovereign country located in South Asia. It is the seventh-largest country by area.';
    const evTitle = 'India Overview — Government of India Official Portal';

    const result = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);

    assert.strictEqual(result.relation, 'supports', 'Should evaluate as SUPPORTED');
    assert.strictEqual(result.stanceScore, 1, 'Stance score should be +1');
  });

  it('Test 5: "India is a sovereign country located in South America." -> CONTRADICTED', () => {
    const claim = 'India is a sovereign country located in South America.';
    const evSnippet =
      'India is a country in South Asia bounded by the Indian Ocean on the south and the Arabian Sea on the southwest.';
    const evTitle = 'India Geographical Survey';

    const result = stanceEvaluatorService.evaluateDeterministic(claim, evSnippet, evTitle, false);

    assert.strictEqual(result.relation, 'contradicts', 'Should evaluate as CONTRADICTED');
    assert.strictEqual(result.stanceScore, -1, 'Stance score should be -1');
  });

  // ---------------------------------------------------------------------------------
  // 4. END-TO-END ARTICLE VERIFICATION (Required Test Case 6)
  // ---------------------------------------------------------------------------------
  it('Test 6: Full multi-sentence compound verification -> STRONGLY SUPPORTED (Score >= 85)', () => {
    const articleText =
      'Asia is the largest continent in the world by both land area and total population. India is a sovereign country located in South Asia.';

    // 1. Claim Extraction
    const { claims: rawClaims } = claimExtractorService.extractClaims(articleText);
    assert.ok(rawClaims.length >= 2, 'Should extract at least 2 distinct claims');

    const claims: ExtractedClaim[] = rawClaims.map((c) => {
      const subclaims = entityExtractorService.extractSubclaims(c.text);
      return {
        ...c,
        isCompound: subclaims.length > 1,
        subclaims: subclaims.length > 1 ? subclaims : undefined,
        entities: entityExtractorService.extractEntities(c.text),
      };
    });

    // 2. Authoritative Evidence Mock
    const evidence: RetrievedEvidenceItem[] = [
      {
        id: 'ev-1-1',
        claimId: claims[0].id,
        sourceName: 'Encyclopaedia Britannica',
        sourceUrl: 'https://britannica.com/place/Asia',
        sourceTier: 1,
        sourceReliability: 98,
        title: 'Asia: Continent, Facts, Geography, and Demographics',
        publishedDate: '2026-08-20',
        evidenceText:
          'Asia is the largest continent in the world by both land area and total population, covering approximately 30% of the Earth’s total land area.',
        relationToClaim: 'SUPPORTS',
        relevance: 'direct',
        confidence: 98,
        credibilityScore: 98,
        relevanceScore: 1.0,
        keyEvidence: 'Asia is the largest continent in the world by both land area and total population.',
        explanation: 'Authoritative encyclopedic record confirms Asia is the largest continent by area and population.',
        finalContribution: 98,
        domain: 'britannica.com',
        freshness: 'CURRENT',
        stance: 'supports',
        url: 'https://britannica.com/place/Asia',
        publisher: 'Encyclopaedia Britannica',
        sourceType: 'encyclopedia',
        snippet:
          'Asia is the largest continent in the world by both land area and total population, covering approximately 30% of the Earth’s total land area.',
        relation: 'supports',
      },
      {
        id: 'ev-2-1',
        claimId: claims[1].id,
        sourceName: 'National Geographic',
        sourceUrl: 'https://nationalgeographic.org/encyclopedia/asia',
        sourceTier: 1,
        sourceReliability: 95,
        title: 'India Country Profile — National Geographic',
        publishedDate: '2026-08-20',
        evidenceText:
          'India is a sovereign country located in South Asia. It is bordered by Pakistan, China, Nepal, Bhutan, Bangladesh, and Myanmar.',
        relationToClaim: 'SUPPORTS',
        relevance: 'direct',
        confidence: 95,
        credibilityScore: 95,
        relevanceScore: 1.0,
        keyEvidence: 'India is a sovereign country located in South Asia.',
        explanation: 'Geographic registry corroborates that India is a sovereign country in South Asia.',
        finalContribution: 95,
        domain: 'nationalgeographic.org',
        freshness: 'CURRENT',
        stance: 'supports',
        url: 'https://nationalgeographic.org/encyclopedia/asia',
        publisher: 'National Geographic',
        sourceType: 'reference',
        snippet: 'India is a sovereign country located in South Asia.',
        relation: 'supports',
      },
    ];

    const articleMetadata: ArticleMetadata = {
      title: 'Geographic and Demographic Overview of Asia and India',
      author: 'Editorial Staff',
      publishedAt: '2026-08-20',
      publisher: 'Britannica Research',
      url: 'https://britannica.com/overview',
      text: articleText,
    };

    // 3. Credibility Scoring
    const scoringResult = credibilityScorerService.computeCredibilityScore(articleMetadata, claims, evidence);

    assert.ok(
      scoringResult.score >= 85,
      `Expected overall score >= 85 for fully verified compound claims, got ${scoringResult.score}`
    );
    assert.strictEqual(
      scoringResult.verdict,
      'Probably Credible',
      'Final verdict must be Probably Credible'
    );
    assert.strictEqual(claims[0].relation, 'supports', 'Claim 1 relation should be supports');
    assert.strictEqual(claims[1].relation, 'supports', 'Claim 2 relation should be supports');
  });

  // ---------------------------------------------------------------------------------
  // 5. MIXED COMPOUND CLAIM SCORING PENALTY
  // ---------------------------------------------------------------------------------
  it('Mixed Compound Scoring: Contradicted subclaim reduces overall score appropriately', () => {
    const articleText =
      'Asia is the largest continent by land area, but Europe is the largest continent by population.';

    const { claims: rawClaims } = claimExtractorService.extractClaims(articleText);
    const claims: ExtractedClaim[] = rawClaims.map((c) => {
      const subclaims = entityExtractorService.extractSubclaims(c.text);
      return {
        ...c,
        isCompound: subclaims.length > 1,
        subclaims: subclaims.length > 1 ? subclaims : undefined,
        entities: entityExtractorService.extractEntities(c.text),
      };
    });

    const evidence: RetrievedEvidenceItem[] = [
      {
        id: 'ev-1-1',
        claimId: claims[0].id,
        sourceName: 'Encyclopaedia Britannica',
        sourceUrl: 'https://britannica.com/place/Asia',
        sourceTier: 1,
        sourceReliability: 98,
        title: 'World Continents by Population',
        publishedDate: '2026-08-20',
        evidenceText:
          'Asia is the largest continent in the world by both land area and population with 4.7 billion people. Europe ranks third.',
        relationToClaim: 'CONTRADICTS',
        relevance: 'direct',
        confidence: 98,
        credibilityScore: 98,
        relevanceScore: 1.0,
        keyEvidence: 'Asia is the largest continent by population, Europe is third.',
        explanation: 'Authoritative data refutes that Europe is the largest continent by population.',
        finalContribution: 98,
        domain: 'britannica.com',
        freshness: 'CURRENT',
        stance: 'contradicts',
        url: 'https://britannica.com/place/Asia',
        publisher: 'Encyclopaedia Britannica',
        sourceType: 'encyclopedia',
        snippet: 'Asia is the largest continent in the world by both land area and population.',
        relation: 'contradicts',
      },
    ];

    const articleMetadata: ArticleMetadata = {
      title: 'Continents Analysis',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: articleText,
    };

    const scoringResult = credibilityScorerService.computeCredibilityScore(articleMetadata, claims, evidence);

    assert.ok(
      scoringResult.score <= 35,
      `Expected mixed contradicted compound score <= 35, got ${scoringResult.score}`
    );
    assert.strictEqual(claims[0].relation, 'contradicts', 'Mixed claim relation must be contradicts');
  });
});
