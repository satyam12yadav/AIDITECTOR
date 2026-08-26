import { describe, it } from 'node:test';
import assert from 'node:assert';
import { datasetSimilarityService } from '../services/datasetSimilarity.service.js';
import { embeddingService } from '../services/embeddingService.js';

describe('📊 PHASE 3: FAKE NEWS DATASET SIMILARITY TEST SUITE', () => {
  // ---------------------------------------------------------------------------------
  // 1. Exact Duplicate Match
  // ---------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------
  // 1. Exact Duplicate Match
  // ---------------------------------------------------------------------------------
  it('1. Exact Match: Produces very high semantic similarity (>= 0.95) for exact dataset text', async () => {
    const text = 'Quantum Locking Floating Magnet Room-Temperature Antigravity Startup Scam\nViral social media videos claim a tech startup created room-temperature antigravity floating magnets for flying cars and commercial hoverboards. In reality, quantum locking flux pinning requires sub-zero liquid nitrogen temperatures and superconductors.';
    const result = await datasetSimilarityService.searchNearest(text, 5);

    assert.strictEqual(result.datasetMatch, 'HIGH');
    assert.ok(result.nearestExamples.length > 0);
    assert.strictEqual(result.nearestLabel, 'FAKE');
    assert.ok(result.nearestExamples[0].similarity >= 0.95, `Expected >= 0.95 similarity, got ${result.nearestExamples[0].similarity}`);
  });

  // ---------------------------------------------------------------------------------
  // 2. Slightly Rewritten Fake Article
  // ---------------------------------------------------------------------------------
  it('2. Rewritten Fake: Produces high semantic similarity (>= 0.70) for rewritten fake news claim', async () => {
    const rewrittenFake = 'Quantum locking tech startup shows floating spinning magnet disc defying gravity claiming commercial room-temperature antigravity hoverboards.';
    const result = await datasetSimilarityService.searchNearest(rewrittenFake, 5);

    assert.ok(result.nearestExamples.length > 0);
    assert.strictEqual(result.nearestLabel, 'FAKE');
    assert.ok(result.nearestExamples[0].similarity >= 0.70, `Expected >= 0.70 similarity, got ${result.nearestExamples[0].similarity}`);
  });

  // ---------------------------------------------------------------------------------
  // 3. Slightly Rewritten Real Article
  // ---------------------------------------------------------------------------------
  it('3. Rewritten Real: Produces high semantic similarity (>= 0.70) for rewritten real news claim', async () => {
    const rewrittenReal = 'ISRO successfully launches advanced ocean monitoring earth observation satellite into polar Sun-synchronous orbit.';
    const result = await datasetSimilarityService.searchNearest(rewrittenReal, 5);

    assert.ok(result.nearestExamples.length > 0);
    assert.strictEqual(result.nearestLabel, 'REAL');
    assert.ok(result.nearestExamples[0].similarity >= 0.70, `Expected >= 0.70 similarity, got ${result.nearestExamples[0].similarity}`);
  });

  // ---------------------------------------------------------------------------------
  // 4. Completely Unrelated Article
  // ---------------------------------------------------------------------------------
  it('4. Unrelated Article: Produces low similarity (< 0.55) for unrelated content', async () => {
    const unrelated = 'Medieval pottery techniques utilized low-temperature kilns for porous earthenware glazing in ancient civilizations.';
    const result = await datasetSimilarityService.searchNearest(unrelated, 5);

    assert.strictEqual(result.datasetMatch, 'LOW');
    assert.ok(result.nearestExamples[0].similarity < 0.55, `Expected < 0.55 similarity, got ${result.nearestExamples[0].similarity}`);
  });

  // ---------------------------------------------------------------------------------
  // 5. Topic Match with Opposite Claim
  // ---------------------------------------------------------------------------------
  it('5. Opposite Claim: Similarity measures topic/pattern overlap without deciding truth/falsity', async () => {
    const claim1 = 'Earth is flat.';
    const claim2 = 'The Earth is approximately spherical.';

    const result1 = await datasetSimilarityService.searchNearest(claim1, 5);
    const result2 = await datasetSimilarityService.searchNearest(claim2, 5);

    // Both should find topic-related dataset examples without deciding veracity
    assert.ok(result1.nearestExamples.length > 0);
    assert.ok(result2.nearestExamples.length > 0);

    const rawRes1 = result1 as any;
    assert.strictEqual(rawRes1.credibilityScore, undefined, 'Must NOT contain credibilityScore');
    assert.strictEqual(rawRes1.finalVerdict, undefined, 'Must NOT contain finalVerdict');
    assert.strictEqual(rawRes1.true, undefined, 'Must NOT contain true');
    assert.strictEqual(rawRes1.false, undefined, 'Must NOT contain false');
  });

  // ---------------------------------------------------------------------------------
  // 6. Empty Input Validation
  // ---------------------------------------------------------------------------------
  it('6. Empty Input: Returns controlled LOW match without throwing errors', async () => {
    const result = await datasetSimilarityService.searchNearest('', 5);
    assert.strictEqual(result.datasetMatch, 'LOW');
    assert.strictEqual(result.nearestExamples.length, 0);
  });

  // ---------------------------------------------------------------------------------
  // 7. Duplicate Row Filtering
  // ---------------------------------------------------------------------------------
  it('7. Deduplication: Removes duplicate rows from vector index during ingestion', () => {
    const { items, totalRows, duplicatesRemoved } = datasetSimilarityService.loadRawDataset();
    assert.ok(totalRows >= items.length);
    assert.ok(items.length > 0);
    // Ensure all indexed items have unique text
    const uniqueTexts = new Set(items.map((i) => i.text.toLowerCase().trim()));
    assert.strictEqual(uniqueTexts.size, items.length);
  });

  // ---------------------------------------------------------------------------------
  // 8. Test on Captaincy Claim
  // ---------------------------------------------------------------------------------
  it("8. Captaincy Claim: 'Suryakumar Yadav is currently India's T20I captain.' returns valid dataset signal", async () => {
    const claim = "Suryakumar Yadav is currently India's T20I captain.";
    const result = await datasetSimilarityService.searchNearest(claim, 5);

    assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(result.datasetMatch));
    assert.ok(result.nearestExamples.length <= 5);
    assert.ok(typeof result.fakeSimilarity === 'number');
    assert.ok(typeof result.realSimilarity === 'number');
    assert.ok(['FAKE', 'REAL'].includes(result.nearestLabel));
  });

  // ---------------------------------------------------------------------------------
  // 9. Embedding Vector L2 Unit Normalization
  // ---------------------------------------------------------------------------------
  it('9. Embedding Normalization: Produces unit vectors with L2 norm = 1.0', async () => {
    const vec = await embeddingService.embedText('Sample news article content about international politics');
    let sumSq = 0;
    for (const val of vec) sumSq += val * val;
    const norm = Math.sqrt(sumSq);
    assert.ok(Math.abs(norm - 1.0) < 0.01, `Expected norm ~ 1.0, got ${norm}`);
  });
});
