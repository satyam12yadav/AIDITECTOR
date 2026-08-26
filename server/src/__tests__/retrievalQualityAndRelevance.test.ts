import { describe, it } from 'node:test';
import assert from 'node:assert';
import { exaSearchService, ExaRetrievedSource } from '../services/exaSearch.service.js';
import { semanticContradictionEngine } from '../services/semanticContradictionEngine.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

describe('🎯 RETRIEVAL QUALITY & RELEVANCE GATE TEST SUITE (TESTS A to G)', () => {
  const claimContinents = 'Earth has six continents.';

  // ---------------------------------------------------------------------------------
  // Test A: Irrelevant basketball article -> IRRELEVANT (must not affect score)
  // ---------------------------------------------------------------------------------
  it("A. 'Earth has six continents.' + Irrelevant basketball article -> IRRELEVANT (must not affect score)", () => {
    const basketballSnippet = "India's Basketball World Cup Reality Check: Team faces challenging qualification bracket against Australia.";
    const basketballTitle = "India's Basketball World Cup Reality Check";

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claimContinents,
      basketballSnippet,
      basketballTitle,
      'espn.in'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'IRRELEVANT');
    assert.strictEqual(semanticRes.relevanceScore, 0.0);
    assert.strictEqual(semanticRes.stance, 'IRRELEVANT');

    // Verify it produces no score change in CredibilityScorerService
    const claim: ExtractedClaim = {
      id: 'c1',
      text: claimContinents,
      isVerifiable: true,
      importance: 0.8,
    };

    const irrelevantEv: RetrievedEvidenceItem = {
      id: 'e1',
      claimId: 'c1',
      url: 'https://espn.in/basketball/1',
      title: basketballTitle,
      sourceName: 'ESPN',
      domain: 'espn.in',
      sourceTier: 1,
      sourceReliability: 90,
      evidenceText: basketballSnippet,
      relation: 'unclear',
      relationToClaim: 'INSUFFICIENT',
      relevance: 'irrelevant',
      relevanceScore: 0.0,
      stanceScore: 0,
    };

    credibilityScorerService.evaluateIndividualClaims([claim], [irrelevantEv]);
    assert.strictEqual(claim.evidenceCount, 0, 'Irrelevant evidence must not count as valid evidence');
    assert.strictEqual(claim.supportingEvidenceCount, 0);
    assert.strictEqual(claim.contradictingEvidenceCount, 0);
  });

  // ---------------------------------------------------------------------------------
  // Test B: "Earth is divided into six continents under this model." -> SUPPORTS
  // ---------------------------------------------------------------------------------
  it("B. 'Earth has six continents.' + 'Earth is divided into six continents under this model.' -> SUPPORTS", () => {
    const text = 'In Latin America and parts of Europe, Earth is divided into six continents under this model, combining the Americas.';
    const title = 'Continental Models in Geography';

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claimContinents,
      text,
      title,
      'britannica.com'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'DIRECT');
    assert.strictEqual(semanticRes.stance, 'SUPPORTS');
    assert.ok(semanticRes.confidence >= 0.90);
  });

  // ---------------------------------------------------------------------------------
  // Test C: "Earth is commonly divided into seven continents." -> CONTRADICTS / QUALIFIED
  // ---------------------------------------------------------------------------------
  it("C. 'Earth has six continents.' + 'Earth is commonly divided into seven continents.' -> CONTRADICTS / QUALIFIED", () => {
    const text = 'Earth is commonly divided into seven continents: Africa, Antarctica, Asia, Australia, Europe, North America, and South America.';
    const title = 'The Continents of the World';

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claimContinents,
      text,
      title,
      'nationalgeographic.org'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'DIRECT');
    assert.strictEqual(semanticRes.stance, 'CONTRADICTS');
    assert.strictEqual(semanticRes.isContestedConvention, true);
    assert.ok(semanticRes.confidence >= 0.90);
  });

  // ---------------------------------------------------------------------------------
  // Test D: "Earth's orbital wobble caused climate change." -> IRRELEVANT
  // ---------------------------------------------------------------------------------
  it("D. 'Earth has six continents.' + 'Earth\\'s orbital wobble caused climate change.' -> IRRELEVANT", () => {
    const text = "Earth's orbital wobble triggered rapid climate chaos during the dinosaur age millions of years ago.";
    const title = "Earth orbital dynamics and ancient climate";

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claimContinents,
      text,
      title,
      'sciencedaily.com'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'IRRELEVANT');
    assert.strictEqual(semanticRes.stance, 'IRRELEVANT');
    assert.strictEqual(semanticRes.relevanceScore, 0.0);
  });

  // ---------------------------------------------------------------------------------
  // Test E: "Why are Europe and Asia sometimes considered one continent?" -> RELATED
  // ---------------------------------------------------------------------------------
  it("E. 'Earth has six continents.' + 'Why are Europe and Asia sometimes considered one continent?' -> RELATED", () => {
    const text = 'Why are Europe and Asia sometimes considered one continent? Geologists consider the Eurasia combined landmass.';
    const title = 'The Eurasia Continental Division';

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claimContinents,
      text,
      title,
      'geographyrealm.com'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'RELATED');
    assert.ok(semanticRes.relevanceScore >= 0.5);
  });

  // ---------------------------------------------------------------------------------
  // Test F: "Earth is flat." + NASA article explaining Earth isn't flat -> CONTRADICTS
  // ---------------------------------------------------------------------------------
  it("F. 'Earth is flat.' + NASA article explaining Earth isn't flat -> CONTRADICTS", () => {
    const claim = 'Earth is flat.';
    const text = "NASA explains why the Earth isn't flat using satellite geodesy and planetary observations.";
    const title = "How Do We Know the Earth Isn't Flat? We Asked a NASA Expert";

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claim,
      text,
      title,
      'nasa.gov'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'DIRECT');
    assert.strictEqual(semanticRes.stance, 'CONTRADICTS');
    assert.ok(semanticRes.confidence >= 0.90);
  });

  // ---------------------------------------------------------------------------------
  // Test G: "Suryakumar Yadav is currently India's T20I captain." + Shreyas replaced -> CONTRADICTS
  // ---------------------------------------------------------------------------------
  it("G. 'Suryakumar Yadav is currently India's T20I captain.' + 'Shreyas Iyer replaced Suryakumar as captain.' -> CONTRADICTS", () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const text = "Shreyas Iyer replaced Suryakumar Yadav as India's T20I captain for the upcoming international series.";
    const title = "BCCI announces new T20I leadership";

    const semanticRes = semanticContradictionEngine.evaluateSemanticContradiction(
      claim,
      text,
      title,
      'espncricinfo.com'
    );

    assert.strictEqual(semanticRes.relevanceLabel, 'DIRECT');
    assert.strictEqual(semanticRes.stance, 'CONTRADICTS');
    assert.strictEqual(semanticRes.contradictionType, 'TEMPORAL_REPLACEMENT');
    assert.ok(semanticRes.confidence >= 0.90);
  });

  // ---------------------------------------------------------------------------------
  // Query Intent Proposition Extraction Test
  // ---------------------------------------------------------------------------------
  it("Query Generation creates proposition-targeted search queries for 'Earth has six continents.'", () => {
    const { queries } = exaSearchService.generateSearchQueries(claimContinents);
    assert.ok(queries.length >= 3);
    assert.ok(queries.some((q) => q.toLowerCase().includes('six continents') || q.toLowerCase().includes('continents')));
    // Must NOT contain broad single stop-word queries
    assert.ok(!queries.includes('Earth'));
    assert.ok(!queries.includes('has'));
    assert.ok(!queries.includes('six'));
  });
});
