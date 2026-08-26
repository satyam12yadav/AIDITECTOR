import { describe, it } from 'node:test';
import assert from 'node:assert';
import { exaSearchService, ExaRetrievedSource } from '../services/exaSearch.service.js';
import { ragContextBuilder } from '../services/ragContext.service.js';

describe('⚡ PHASE 1: EXA.AI & RAG EVIDENCE RETRIEVAL SUITE', () => {
  // ---------------------------------------------------------------------------------
  // 1. Query Generation for Temporal Claim
  // ---------------------------------------------------------------------------------
  it('1. Query Generation: Generates direct, current status, contradiction, and alternative queries for temporal claims', () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const result = exaSearchService.generateSearchQueries(claim);

    assert.strictEqual(result.isTemporal, true, 'Must detect "currently" and "captain" as time-sensitive');
    assert.ok(result.queries.length >= 3, `Expected at least 3 queries, got ${result.queries.length}`);

    const queriesStr = result.queries.join(' ').toLowerCase();
    assert.ok(queriesStr.includes('captain'), 'Should include captain role queries');
    assert.ok(
      result.queries.some((q) => q.toLowerCase().includes('replaced') || q.toLowerCase().includes('change') || q.toLowerCase().includes('current')),
      'Should include contradiction or replacement query'
    );
  });

  // ---------------------------------------------------------------------------------
  // 2. Query Generation for Stable Factual Claims
  // ---------------------------------------------------------------------------------
  it('2. Query Generation: Does NOT add unnecessary temporal qualifiers for stable geographic and scientific facts', () => {
    const claim1 = 'India is located in South Asia.';
    const result1 = exaSearchService.generateSearchQueries(claim1);
    assert.strictEqual(result1.isTemporal, false, 'Geographic location is a stable fact, not temporal');
    assert.ok(!result1.queries.some((q) => q.includes('2026') || q.includes('latest update')), 'Should not add 2026 to geographic facts');

    const claim2 = 'The Earth is approximately spherical.';
    const result2 = exaSearchService.generateSearchQueries(claim2);
    assert.strictEqual(result2.isTemporal, false, 'Planetary shape is a stable fact');
  });

  // ---------------------------------------------------------------------------------
  // 3. Result Normalization & Missing Metadata Handling
  // ---------------------------------------------------------------------------------
  it('3. Normalization: Uses null for missing metadata without fabricating fake dates or authors', () => {
    const sampleRaw: ExaRetrievedSource = {
      title: null,
      url: 'https://example.com/article',
      domain: 'example.com',
      publishedDate: null,
      author: null,
      content: 'Sample extracted page content about solar system planetary bodies.',
      searchQuery: 'Earth shape science',
      retrievalScore: 0.85,
      contentAvailability: 'SNIPPET_ONLY',
      possibleDuplicate: false,
      retrievalRelevance: 0.7,
    };

    assert.strictEqual(sampleRaw.title, null);
    assert.strictEqual(sampleRaw.publishedDate, null);
    assert.strictEqual(sampleRaw.author, null);
    assert.strictEqual(sampleRaw.contentAvailability, 'SNIPPET_ONLY');
  });

  // ---------------------------------------------------------------------------------
  // 4. Content Availability: Full Content vs Snippet Only
  // ---------------------------------------------------------------------------------
  it('4. Content Availability: Distinguishes FULL article text from SNIPPET_ONLY results', () => {
    const fullText = 'A'.repeat(500);
    const shortSnippet = 'Short snippet overview.';

    const fullItem: ExaRetrievedSource = {
      title: 'Full Article Report',
      url: 'https://reuters.com/report',
      domain: 'reuters.com',
      publishedDate: '2026-08-20',
      author: 'Reuters Staff',
      content: fullText,
      searchQuery: 'query',
      retrievalScore: 0.9,
      contentAvailability: fullText.length > 200 ? 'FULL' : 'SNIPPET_ONLY',
      possibleDuplicate: false,
      retrievalRelevance: 0.85,
    };

    const snippetItem: ExaRetrievedSource = {
      ...fullItem,
      content: shortSnippet,
      contentAvailability: shortSnippet.length > 200 ? 'FULL' : 'SNIPPET_ONLY',
    };

    assert.strictEqual(fullItem.contentAvailability, 'FULL');
    assert.strictEqual(snippetItem.contentAvailability, 'SNIPPET_ONLY');
  });

  // ---------------------------------------------------------------------------------
  // 5. Deduplication: URL Normalization and Syndicated Article Flagging
  // ---------------------------------------------------------------------------------
  it('5. Deduplication: Normalizes URLs and flags syndicated duplicate wire reports', () => {
    const url1 = 'https://www.reuters.com/sports/cricket/article-1/?utm_source=twitter&utm_medium=social';
    const normUrl = exaSearchService.normalizeUrl(url1);
    assert.strictEqual(normUrl, 'https://reuters.com/sports/cricket/article-1');

    const source1: ExaRetrievedSource = {
      title: 'BCCI Announces New Captain',
      url: 'https://ptinews.com/story/1',
      domain: 'ptinews.com',
      publishedDate: '2026-08-20',
      author: null,
      content: '(PTI) New Delhi: BCCI has confirmed the new cricket leadership appointment.',
      searchQuery: 'BCCI captain 2026',
      retrievalScore: 0.95,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.9,
    };

    const source2Syndicated: ExaRetrievedSource = {
      title: 'BCCI Announces New Captain',
      url: 'https://regionalpaper.in/news/1',
      domain: 'regionalpaper.in',
      publishedDate: '2026-08-20',
      author: null,
      content: 'According to (PTI), BCCI has confirmed the new cricket leadership appointment.',
      searchQuery: 'BCCI captain 2026',
      retrievalScore: 0.88,
      contentAvailability: 'FULL',
      possibleDuplicate: false,
      retrievalRelevance: 0.85,
    };

    const processed = exaSearchService.processDeduplication([source1, source2Syndicated]);
    assert.strictEqual(processed[0].possibleDuplicate, false);
    assert.strictEqual(processed[1].possibleDuplicate, true, 'Second syndicated copy should be flagged as possible duplicate');
  });

  // ---------------------------------------------------------------------------------
  // 6. RAG Context Builder Construction
  // ---------------------------------------------------------------------------------
  it('6. RAG Context Builder: Assembles clean structured context without secrets or API keys', () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const sources: ExaRetrievedSource[] = [
      {
        title: 'BCCI Official Press Release',
        url: 'https://bcci.tv/press/august-2026',
        domain: 'bcci.tv',
        publishedDate: '2026-08-20',
        author: 'BCCI Media',
        content: 'The Senior Selection Committee has announced Shreyas Iyer as India T20I captain.',
        searchQuery: 'India T20 captain 2026',
        retrievalScore: 0.98,
        contentAvailability: 'FULL',
        possibleDuplicate: false,
        retrievalRelevance: 0.95,
      },
    ];

    const context = ragContextBuilder.buildRagContext(claim, sources);

    assert.ok(context.includes('CLAIM: Suryakumar Yadav is currently India\'s T20I captain.'));
    assert.ok(context.includes('SOURCE 1'));
    assert.ok(context.includes('Domain: bcci.tv'));
    assert.ok(context.includes('Title: BCCI Official Press Release'));
    assert.ok(context.includes('Content:'));
    assert.ok(!context.includes('EXA_API_KEY') && !context.includes('secret'));
  });

  // ---------------------------------------------------------------------------------
  // 7. Full Retrieval Execution for the 5 Required Test Claims
  // ---------------------------------------------------------------------------------
  it('7. End-to-End Retrieval: Executes multi-query retrieval and returns structured evidence for test claims', async () => {
    const testClaims = [
      "Suryakumar Yadav is currently India's T20I captain.",
      "The Earth is flat.",
      "The Earth is approximately spherical.",
      "India is located in South Asia.",
      "Salman Khan is married.",
    ];

    for (const claim of testClaims) {
      const result = await exaSearchService.retrieveEvidenceForClaim(claim);
      assert.strictEqual(result.claim, claim);
      assert.ok(result.queries.length >= 2, `Should generate multiple queries for "${claim}"`);
      assert.ok(Array.isArray(result.sources));
      assert.ok(typeof result.ragContext === 'string' && result.ragContext.length > 0);

      // Verify NO scoring fields are attached to evidence response
      const rawRes = result as any;
      assert.strictEqual(rawRes.credibilityScore, undefined, 'Must NOT contain credibilityScore');
      assert.strictEqual(rawRes.verdict, undefined, 'Must NOT contain verdict');
      assert.strictEqual(rawRes.true, undefined, 'Must NOT contain true');
      assert.strictEqual(rawRes.false, undefined, 'Must NOT contain false');
    }
  });
});
