import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sourceRegistry } from '../services/sourceRegistry.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { ArticleMetadata, ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

describe('🌐 MAJOR VERIFICATION UPGRADE: MULTI-SOURCE FACT-CHECKING ENGINE', () => {
  // ---------------------------------------------------------------------------------
  // 1. Structured Source Registry Coverage (54+ Trusted Sources)
  // ---------------------------------------------------------------------------------
  it('1. Source Registry: Accurately indexes and classifies all Indian & International fact-checkers and wire services', () => {
    const allSources = sourceRegistry.getAllSources();
    assert.ok(allSources.length >= 50, `Expected at least 50 sources, found ${allSources.length}`);

    // Verify fact checkers
    const factCheckers = sourceRegistry.getFactCheckers();
    assert.ok(factCheckers.length >= 12, `Expected >= 12 fact-checking platforms, found ${factCheckers.length}`);

    const boom = sourceRegistry.matchSource('https://www.boomlive.in/fact-check/story');
    assert.ok(boom && boom.isFactChecker && boom.credibilityTier <= 3);

    const altNews = sourceRegistry.matchSource('https://www.altnews.in/viral-claim-debunked');
    assert.ok(altNews && altNews.isFactChecker && altNews.credibilityTier <= 3);

    const pib = sourceRegistry.matchSource('https://factcheck.pib.gov.in/');
    assert.ok(pib && pib.isOfficial && pib.credibilityTier === 1);

    // Verify wire services
    const wires = sourceRegistry.getWireServices();
    assert.ok(wires.length >= 4, `Expected >= 4 wire services, found ${wires.length}`);

    const reuters = sourceRegistry.matchSource('https://www.reuters.com/world/india/article');
    assert.ok(reuters && reuters.isWireService && reuters.credibilityTier <= 2);

    const pti = sourceRegistry.matchSource('https://www.ptinews.com/national/story');
    assert.ok(pti && pti.isWireService);
  });

  // ---------------------------------------------------------------------------------
  // 2. Multi-Query Generation (Bidirectional & Fact-Check Queries)
  // ---------------------------------------------------------------------------------
  it('2. Query Generation: Produces 4-6 strategic support, contradiction, status, and fact-check queries', () => {
    const queries = evidenceRetrieverService.generateSearchQueries("Suryakumar Yadav is currently India's T20I captain.", true);
    assert.ok(queries.length >= 4, `Expected at least 4 queries, generated ${queries.length}`);

    const hasCaptainQuery = queries.some((q) => q.toLowerCase().includes('captain'));
    const hasFactCheckQuery = queries.some((q) => q.toLowerCase().includes('fact check') || q.toLowerCase().includes('verified'));
    assert.ok(hasCaptainQuery, 'Must include captain status queries');
    assert.ok(hasFactCheckQuery, 'Must include fact-check verification queries');
  });

  // ---------------------------------------------------------------------------------
  // 3. Evidence Clustering & Duplicate Syndication Grouping
  // ---------------------------------------------------------------------------------
  it('3. Evidence Clustering: Groups duplicate syndicated articles into distinct independent clusters', () => {
    const evWireOriginal: RetrievedEvidenceItem = {
      id: 'ev-wire-1',
      claimId: 'cl-1',
      sourceName: 'Press Trust of India (PTI)',
      sourceUrl: 'https://www.ptinews.com/national/cricket-update',
      sourceTier: 2,
      sourceReliability: 90,
      title: 'BCCI Announces New Captain',
      publishedDate: '2026-08-20',
      evidenceText: '(PTI) New Delhi: BCCI has confirmed Shreyas Iyer as the new T20I captain.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 90,
      relevanceScore: 1.0,
      domain: 'ptinews.com',
      relation: 'contradicts',
      keyEvidence: 'Shreyas Iyer appointed captain',
      explanation: 'PTI wire reporting confirms captaincy change',
      finalContribution: 90,
      stance: 'contradicts',
      publisher: 'PTI',
      url: 'https://www.ptinews.com/national/cricket-update',
      sourceType: 'news',
      snippet: '(PTI) BCCI has confirmed Shreyas Iyer as the new T20I captain.',
    };

    const evSyndicated1: RetrievedEvidenceItem = {
      ...evWireOriginal,
      id: 'ev-syn-1',
      sourceName: 'Regional News Portal',
      sourceUrl: 'https://www.regionalnews.in/sports/cricket',
      domain: 'regionalnews.in',
      publisher: 'Regional News',
      evidenceText: 'According to a report by (PTI), BCCI has confirmed Shreyas Iyer as the new T20I captain.',
    };

    const evSyndicated2: RetrievedEvidenceItem = {
      ...evWireOriginal,
      id: 'ev-syn-2',
      sourceName: 'City Daily',
      sourceUrl: 'https://www.citydaily.com/article/1234',
      domain: 'citydaily.com',
      publisher: 'City Daily',
      evidenceText: 'Press Trust of India reports that BCCI has confirmed Shreyas Iyer as the new T20I captain.',
    };

    const evIndependentReuters: RetrievedEvidenceItem = {
      id: 'ev-reuters',
      claimId: 'cl-1',
      sourceName: 'Reuters',
      sourceUrl: 'https://www.reuters.com/sports/cricket/india-t20-captain',
      sourceTier: 2,
      sourceReliability: 95,
      title: 'India Names Iyer T20 Captain',
      publishedDate: '2026-08-20',
      evidenceText: 'Reuters: India has named Shreyas Iyer as their new T20I captain, replacing Yadav.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 95,
      credibilityScore: 95,
      relevanceScore: 1.0,
      domain: 'reuters.com',
      relation: 'contradicts',
      keyEvidence: 'Reuters confirms captaincy change',
      explanation: 'Reuters independent reporting confirms captaincy change',
      finalContribution: 95,
      stance: 'contradicts',
      publisher: 'Reuters',
      url: 'https://www.reuters.com/sports/cricket/india-t20-captain',
      sourceType: 'news',
      snippet: 'Reuters: India has named Shreyas Iyer as their new T20I captain, replacing Yadav.',
    };

    const clusters = evidenceRetrieverService.clusterEvidence([
      evWireOriginal,
      evSyndicated1,
      evSyndicated2,
      evIndependentReuters,
    ]);

    assert.strictEqual(clusters.length, 2, 'Should collapse 3 PTI syndicated reports into 1 cluster + 1 Reuters cluster');
    assert.strictEqual(clusters[0].stance, 'contradicts');
    assert.strictEqual(clusters[1].stance, 'contradicts');
  });

  // ---------------------------------------------------------------------------------
  // 4. Test Case A: "Suryakumar Yadav is currently India's T20I captain."
  // ---------------------------------------------------------------------------------
  it('Test Case A: "Suryakumar Yadav is currently India\'s T20I captain." -> Contradicted by latest updates (Score <= 30)', () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const extClaim: ExtractedClaim = {
      id: 'cl-a',
      text: claim,
      importance: 0.9,
      claim_type: 'temporal',
      classification: 'CURRENT_EVENT',
      isTimeSensitive: true,
      isVerifiable: true,
    };

    const evBCCI: RetrievedEvidenceItem = {
      id: 'ev-a1',
      claimId: 'cl-a',
      sourceName: 'BCCI Official',
      sourceTier: 1,
      sourceReliability: 99,
      title: 'BCCI Senior Selection Committee Announcement',
      publishedDate: '2026-08-20',
      evidenceText: 'BCCI announces Shreyas Iyer has been appointed India T20I captain, succeeding Suryakumar Yadav.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'bcci.tv',
      relation: 'contradicts',
    };

    const evFactCheck: RetrievedEvidenceItem = {
      id: 'ev-a2',
      claimId: 'cl-a',
      sourceName: 'BOOM Live',
      sourceTier: 2,
      sourceReliability: 92,
      title: 'Fact Check: Did Suryakumar Yadav remain captain in 2026?',
      publishedDate: '2026-08-21',
      evidenceText: 'Fact Check: Viral posts claiming Suryakumar Yadav is currently India T20I captain are false. BCCI appointed Shreyas Iyer in August 2026.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 96,
      credibilityScore: 92,
      relevanceScore: 1.0,
      domain: 'boomlive.in',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Cricket Leadership',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evBCCI, evFactCheck]);
    assert.ok(result.score <= 30, `Expected score <= 30 for contradicted captaincy, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
    assert.ok(result.coverageStats && result.coverageStats.contradictingSourcesCount >= 2);
  });

  // ---------------------------------------------------------------------------------
  // 5. Test Case B: "Earth is flat."
  // ---------------------------------------------------------------------------------
  it('Test Case B: "Earth is flat." -> Extremely low credibility (Score <= 20)', () => {
    const claim = 'The Earth is flat.';
    const extClaim: ExtractedClaim = {
      id: 'cl-b',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evNASA: RetrievedEvidenceItem = {
      id: 'ev-b1',
      claimId: 'cl-b',
      sourceName: 'NASA Science',
      sourceTier: 1,
      sourceReliability: 99,
      title: 'Earth Geodesy and Orbital Science',
      publishedDate: '2026-01-01',
      evidenceText: 'Direct orbital photography and gravitational satellite measurements establish Earth is an oblate spheroid revolving around the Sun.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'nasa.gov',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Planetary Science',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evNASA]);
    assert.ok(result.score <= 20, `Expected score <= 20 for flat earth, got ${result.score}`);
    assert.strictEqual(result.verdict, 'Probably False');
  });

  // ---------------------------------------------------------------------------------
  // 6. Test Case C: "Earth is approximately spherical."
  // ---------------------------------------------------------------------------------
  it('Test Case C: "Earth is approximately spherical." -> High credibility (Score >= 85)', () => {
    const claim = 'The Earth is approximately spherical.';
    const extClaim: ExtractedClaim = {
      id: 'cl-c',
      text: claim,
      importance: 0.9,
      claim_type: 'scientific',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evESA: RetrievedEvidenceItem = {
      id: 'ev-c1',
      claimId: 'cl-c',
      sourceName: 'European Space Agency (ESA)',
      sourceTier: 1,
      sourceReliability: 98,
      title: 'Planetary Geodesy',
      publishedDate: '2026-01-01',
      evidenceText: 'The Earth is approximately spherical, specifically an oblate spheroid with an equatorial radius of 6,378 km.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'esa.int',
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Geodesy Facts',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evESA]);
    assert.ok(result.score >= 85, `Expected score >= 85 for spherical earth, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'supports');
  });

  // ---------------------------------------------------------------------------------
  // 7. Test Case D: "India won the 2026 FIFA World Cup."
  // ---------------------------------------------------------------------------------
  it('Test Case D: "India won the 2026 FIFA World Cup." -> Contradicted by tournament records (Score <= 20)', () => {
    const claim = 'India won the 2026 FIFA World Cup.';
    const extClaim: ExtractedClaim = {
      id: 'cl-d',
      text: claim,
      importance: 0.9,
      claim_type: 'sports',
      classification: 'HISTORICAL_FACT',
      isVerifiable: true,
    };

    const evFIFA: RetrievedEvidenceItem = {
      id: 'ev-d1',
      claimId: 'cl-d',
      sourceName: 'FIFA Official / Reuters',
      sourceTier: 1,
      sourceReliability: 99,
      title: '2026 FIFA World Cup Final Results',
      publishedDate: '2026-07-20',
      evidenceText: 'Spain won the 2026 FIFA World Cup by defeating Argentina 1-0 in the final held at MetLife Stadium.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'fifa.com',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'World Cup Results',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evFIFA]);
    assert.ok(result.score <= 20, `Expected score <= 20 for false world cup winner, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
  });

  // ---------------------------------------------------------------------------------
  // 8. Test Case E: "India is located in South Asia."
  // ---------------------------------------------------------------------------------
  it('Test Case E: "India is located in South Asia." -> Supported by multi-source official records (Score >= 85)', () => {
    const claim = 'India is located in South Asia.';
    const extClaim: ExtractedClaim = {
      id: 'cl-e',
      text: claim,
      importance: 0.9,
      claim_type: 'geographic',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evUN: RetrievedEvidenceItem = {
      id: 'ev-e1',
      claimId: 'cl-e',
      sourceName: 'United Nations Geospatial',
      sourceTier: 1,
      sourceReliability: 99,
      title: 'UN Member States Geographical Regions',
      publishedDate: '2026-01-01',
      evidenceText: 'India is a sovereign country situated in South Asia, occupying the major portion of the Indian subcontinent.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 99,
      credibilityScore: 99,
      relevanceScore: 1.0,
      domain: 'un.org',
      relation: 'supports',
    };

    const evBritannica: RetrievedEvidenceItem = {
      id: 'ev-e2',
      claimId: 'cl-e',
      sourceName: 'Encyclopaedia Britannica',
      sourceTier: 1,
      sourceReliability: 98,
      title: 'India — Geography & Location',
      publishedDate: '2026-01-01',
      evidenceText: 'India, country that occupies the greater part of South Asia.',
      relationToClaim: 'SUPPORTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 98,
      relevanceScore: 1.0,
      domain: 'britannica.com',
      relation: 'supports',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Country Profile',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evUN, evBritannica]);
    assert.ok(result.score >= 85, `Expected score >= 85 for geography fact, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'supports');
  });

  // ---------------------------------------------------------------------------------
  // 9. Test Case F: "Salman Khan is married."
  // ---------------------------------------------------------------------------------
  it('Test Case F: "Salman Khan is married." -> Marital status extracted, refuted by bio records (Score <= 25)', () => {
    const claim = 'Salman Khan is married.';
    const triple = entityExtractorService.extractClaimTriple(claim);
    assert.strictEqual(triple?.attribute, 'marital_status');

    const extClaim: ExtractedClaim = {
      id: 'cl-f',
      text: claim,
      importance: 0.85,
      claim_type: 'biographical',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const evBio: RetrievedEvidenceItem = {
      id: 'ev-f1',
      claimId: 'cl-f',
      sourceName: 'Filmfare / Encyclopaedia of Cinema',
      sourceTier: 2,
      sourceReliability: 90,
      title: 'Salman Khan Profile',
      publishedDate: '2026-08-01',
      evidenceText: 'Salman Khan remains unmarried and has never been married, maintaining his status as one of Bollywood’s most famous bachelors.',
      relationToClaim: 'CONTRADICTS',
      relevance: 'direct',
      confidence: 98,
      credibilityScore: 90,
      relevanceScore: 1.0,
      domain: 'filmfare.com',
      relation: 'contradicts',
    };

    const articleMeta: ArticleMetadata = {
      title: 'Bollywood Gossip Fact Check',
      author: null,
      publishedAt: null,
      publisher: null,
      url: null,
      text: claim,
    };

    const result = credibilityScorerService.computeCredibilityScore(articleMeta, [extClaim], [evBio]);
    assert.ok(result.score <= 25, `Expected score <= 25 for contradicted marital claim, got ${result.score}`);
    assert.strictEqual(extClaim.relation, 'contradicts');
  });

  // ---------------------------------------------------------------------------------
  // 10. Test Case G: Deliberately Fabricated Obscure Claim
  // ---------------------------------------------------------------------------------
  it('Test Case G: Fabricated obscure claim -> Limited Evidence baseline (45-58) without false confidence', () => {
    const claim = 'The fictitious town of Xylophonia contains exactly 47 blue obelisks in its underground plaza.';
    const extClaim: ExtractedClaim = {
      id: 'cl-g',
      text: claim,
      importance: 0.5,
      claim_type: 'factual',
      classification: 'OBJECTIVE_FACT',
      isVerifiable: true,
    };

    const articleMeta: ArticleMetadata = {
      title: 'Obscure Note',
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
});
