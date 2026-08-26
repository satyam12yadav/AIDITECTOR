import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ragEvidenceAnalyzerService } from '../services/ragEvidenceAnalyzer.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { ExaRetrievedSource } from '../services/exaSearch.service.js';

describe('🔬 PHASE 3B: EXACT STEP 12 REGRESSION TEST SUITE', () => {
  // ---------------------------------------------------------------------------------
  // 1. Earth is flat + Earth isn't flat = CONTRADICTS
  // ---------------------------------------------------------------------------------
  it("1. 'Earth is flat.' + 'Earth isn\\'t flat.' = CONTRADICTS", async () => {
    const claim = 'Earth is flat.';
    const source: ExaRetrievedSource = {
      title: "How Do We Know the Earth Isn't Flat? We Asked a NASA Expert",
      url: 'https://nasa.gov/article/1',
      domain: 'nasa.gov',
      publishedDate: '2026-01-01',
      author: 'NASA Science Team',
      content: "NASA explains why the Earth isn't flat using satellite geodesy and planetary observations.",
      searchQuery: 'Earth shape facts',
      retrievalScore: 0.99,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.98,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, false, false);
    assert.strictEqual(analysis.stance, 'CONTRADICTS');
    assert.ok(analysis.confidence >= 0.90);
    assert.strictEqual(analysis.contradictionType, 'DIRECT_SEMANTIC_NEGATION');

    // Also verify deterministic evaluator
    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title);
    assert.strictEqual(det.relation, 'contradicts');
    assert.strictEqual(det.stanceScore, -1);
  });

  // ---------------------------------------------------------------------------------
  // 2. Earth is flat + Earth is approximately spherical = CONTRADICTS
  // ---------------------------------------------------------------------------------
  it("2. 'Earth is flat.' + 'Earth is approximately spherical.' = CONTRADICTS", async () => {
    const claim = 'Earth is flat.';
    const source: ExaRetrievedSource = {
      title: 'Earth is approximately spherical.',
      url: 'https://esa.int/science/earth',
      domain: 'esa.int',
      publishedDate: '2026-01-01',
      author: 'ESA Science Desk',
      content: 'Satellite geodesy establishes that the Earth is approximately spherical with an equatorial bulge.',
      searchQuery: 'Earth shape',
      retrievalScore: 0.99,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.98,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, false, false);
    assert.strictEqual(analysis.stance, 'CONTRADICTS');
    assert.ok(analysis.confidence >= 0.90);
    assert.strictEqual(analysis.contradictionType, 'MUTUALLY_EXCLUSIVE_PROPERTY');

    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title);
    assert.strictEqual(det.relation, 'contradicts');
    assert.strictEqual(det.stanceScore, -1);
  });

  // ---------------------------------------------------------------------------------
  // 3. Earth is approximately spherical + Earth is an oblate spheroid = SUPPORTS
  // ---------------------------------------------------------------------------------
  it("3. 'Earth is approximately spherical.' + 'Earth is an oblate spheroid.' = SUPPORTS", async () => {
    const claim = 'Earth is approximately spherical.';
    const source: ExaRetrievedSource = {
      title: 'Geodetic survey results',
      url: 'https://britannica.com/science/earth',
      domain: 'britannica.com',
      publishedDate: '2026-01-01',
      author: 'Encyclopaedia Britannica',
      content: 'Earth is an oblate spheroid, slightly flattened at the poles and bulging at the equator.',
      searchQuery: 'Earth spherical shape',
      retrievalScore: 0.99,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.98,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, false, false);
    assert.strictEqual(analysis.stance, 'SUPPORTS');
    assert.ok(analysis.confidence >= 0.90);

    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title);
    assert.strictEqual(det.relation, 'supports');
    assert.strictEqual(det.stanceScore, 1);
  });

  // ---------------------------------------------------------------------------------
  // 4. Earth is flat + Why do people believe Earth is flat? = INSUFFICIENT
  // ---------------------------------------------------------------------------------
  it("4. 'Earth is flat.' + 'Why do people believe Earth is flat?' = INSUFFICIENT", async () => {
    const claim = 'Earth is flat.';
    const source: ExaRetrievedSource = {
      title: 'Why do some people believe Earth is flat?',
      url: 'https://unimelb.edu.au/insights/flat-earth',
      domain: 'unimelb.edu.au',
      publishedDate: '2026-03-10',
      author: 'University of Melbourne',
      content: 'Why do some people believe the Earth is flat? Psychologists and sociologists explore the rise of online conspiracy groups.',
      searchQuery: 'Flat Earth believers',
      retrievalScore: 0.8,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.7,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, false, false);
    assert.strictEqual(analysis.stance, 'INSUFFICIENT');

    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title);
    assert.strictEqual(det.relation, 'unclear');
    assert.strictEqual(det.stanceScore, 0);
  });

  // ---------------------------------------------------------------------------------
  // 5. Earth is flat + Earth has six continents = IRRELEVANT
  // ---------------------------------------------------------------------------------
  it("5. 'Earth is flat.' + 'Earth has six continents.' = IRRELEVANT", async () => {
    const claim = 'Earth is flat.';
    const source: ExaRetrievedSource = {
      title: 'Earth continental geography',
      url: 'https://geography.org/continents',
      domain: 'geography.org',
      publishedDate: '2026-01-01',
      author: 'Geography Institute',
      content: 'Earth has seven major continental landmasses separated by vast oceans.',
      searchQuery: 'Earth continents',
      retrievalScore: 0.7,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.3,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, false, false);
    assert.strictEqual(analysis.stance, 'IRRELEVANT');

    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title);
    assert.strictEqual(det.relevance, 'irrelevant');
  });

  // ---------------------------------------------------------------------------------
  // 6. Suryakumar current captain + Shreyas Iyer replaced Suryakumar as captain = CONTRADICTS
  // ---------------------------------------------------------------------------------
  it("6. 'Suryakumar Yadav is currently India's T20I captain.' + 'Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain.' = CONTRADICTS", async () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const source: ExaRetrievedSource = {
      title: "Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain",
      url: 'https://espncricinfo.com/story/1',
      domain: 'espncricinfo.com',
      publishedDate: '2026-08-20',
      author: 'Cricinfo Staff',
      content: "Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain.",
      searchQuery: 'India T20 captain',
      retrievalScore: 0.98,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.95,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, true, false);
    assert.strictEqual(analysis.stance, 'CONTRADICTS');
    assert.ok(analysis.confidence >= 0.90);
    assert.strictEqual(analysis.contradictionType, 'TEMPORAL_REPLACEMENT');

    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title, true);
    assert.strictEqual(det.relation, 'contradicts');
    assert.strictEqual(det.stanceScore, -1);
  });

  // ---------------------------------------------------------------------------------
  // 7. Suryakumar current captain + Suryakumar remains India's T20I captain = SUPPORTS
  // ---------------------------------------------------------------------------------
  it("7. 'Suryakumar Yadav is currently India's T20I captain.' + 'Suryakumar Yadav remains India's T20I captain.' = SUPPORTS", async () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const source: ExaRetrievedSource = {
      title: "Suryakumar Yadav remains India's T20I captain",
      url: 'https://bcci.tv/news/squad',
      domain: 'bcci.tv',
      publishedDate: '2026-08-20',
      author: 'BCCI Media',
      content: "BCCI selection panel confirms Suryakumar Yadav remains India's T20I captain.",
      searchQuery: 'India captain',
      retrievalScore: 0.99,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.98,
    };

    const analysis = await ragEvidenceAnalyzerService.analyzeSourceStance(claim, source, 1, true, false);
    assert.strictEqual(analysis.stance, 'SUPPORTS');
    assert.ok(analysis.confidence >= 0.90);

    const det = stanceEvaluatorService.evaluateDeterministic(claim, source.content!, source.title, true);
    assert.strictEqual(det.relation, 'supports');
    assert.strictEqual(det.stanceScore, 1);
  });
});
