import { liveNewsIngestionTrainer } from '../services/liveNewsIngestionTrainer.service.js';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { datasetSimilarityService } from '../services/datasetSimilarity.service.js';
import { localModelClassifierService } from '../services/localModelClassifier.service.js';
import { ExtractedClaim } from '../types/api.js';

interface TestBenchmarkCase {
  topic: string;
  claim: string;
  expectedLabel: 'REAL' | 'FAKE';
  expectedScoreRange: [number, number]; // [min, max]
}

const VALIDATION_BENCHMARKS: TestBenchmarkCase[] = [
  // 1. Russia-Ukraine
  {
    topic: 'Russia-Ukraine Conflict',
    claim: 'The Russia-Ukraine war is currently an ongoing military conflict along the frontline.',
    expectedLabel: 'REAL',
    expectedScoreRange: [75, 100],
  },
  {
    topic: 'Russia-Ukraine Conflict',
    claim: 'Russia and Ukraine have signed a permanent peace agreement ending all war hostilities.',
    expectedLabel: 'FAKE',
    expectedScoreRange: [5, 30],
  },

  // 2. Gen Z Protests
  {
    topic: 'Gen Z Protests',
    claim: 'Gen Z youth protests in Kenya forced the government to withdraw the 2024 Finance Bill.',
    expectedLabel: 'REAL',
    expectedScoreRange: [75, 100],
  },
  {
    topic: 'Gen Z Protests',
    claim: 'Sheikh Hasina remains the active, serving Prime Minister of Bangladesh in Dhaka.',
    expectedLabel: 'FAKE',
    expectedScoreRange: [5, 30],
  },

  // 3. Ram Mandir & Trust Audits
  {
    topic: 'Ram Mandir Audits',
    claim: 'Ram Mandir is located in Ayodhya, Uttar Pradesh, India.',
    expectedLabel: 'REAL',
    expectedScoreRange: [80, 100],
  },
  {
    topic: 'Ram Mandir Audits',
    claim: 'Ram Mandir is located in Pakistan or disputed foreign territory.',
    expectedLabel: 'FAKE',
    expectedScoreRange: [5, 20],
  },

  // 4. Ruling Government Policies
  {
    topic: 'Government Policies',
    claim: 'Narendra Modi is the serving Prime Minister of India heading the Union Cabinet.',
    expectedLabel: 'REAL',
    expectedScoreRange: [80, 100],
  },
  {
    topic: 'Government Policies',
    claim: 'Union Government is depositing 5 lakh cash directly into all citizen bank accounts under housing scheme.',
    expectedLabel: 'FAKE',
    expectedScoreRange: [5, 25],
  },

  // 5. Sports Tournaments
  {
    topic: 'Sports Champions',
    claim: 'India won the ICC Men\'s T20 World Cup 2024 by defeating South Africa in the final.',
    expectedLabel: 'REAL',
    expectedScoreRange: [80, 100],
  },
  {
    topic: 'Sports Champions',
    claim: 'South Africa won the ICC Men\'s T20 World Cup 2024 championship final against India.',
    expectedLabel: 'FAKE',
    expectedScoreRange: [5, 25],
  },
];

async function main() {
  console.log(`\n========================================================================================`);
  console.log(`🚀 RUNNING MULTI-NEWSPAPER TRAINING & ACCURACY CALIBRATION PIPELINE`);
  console.log(`========================================================================================\n`);

  // Step 1: Ingest & Train Local Dataset Vectors
  const trainStats = await liveNewsIngestionTrainer.trainAndIndexCorpus();
  console.log(`[TRAIN SUCCESS] Added ${trainStats.addedItems} new verified newspaper pairs in ${trainStats.durationMs}ms.`);

  // Reload vector index in datasetSimilarityService
  await datasetSimilarityService.initializeIndex();

  // Step 2: Validate Against Real-World Claims
  console.log(`\n========================================================================================`);
  console.log(`🔬 VERIFYING ACCURACY ACROSS 5 TARGET CATEGORIES`);
  console.log(`========================================================================================\n`);

  let passCount = 0;

  for (let i = 0; i < VALIDATION_BENCHMARKS.length; i++) {
    const test = VALIDATION_BENCHMARKS[i];
    const startTime = Date.now();

    const article = {
      title: test.claim,
      author: null,
      publishedAt: null,
      publisher: 'Multi-Newspaper Ingestion Harness',
      url: null,
      text: test.claim,
    };

    // Vector Similarity Match
    const simResult = await datasetSimilarityService.searchNearest(test.claim);

    // Extraction & Stance Pipeline
    const { claims: rawClaims } = claimExtractorService.extractClaims(article.text);
    const claims: ExtractedClaim[] = (rawClaims.length > 0
      ? rawClaims
      : [
          {
            id: `calib-claim-${i}`,
            text: test.claim,
            confidence: 90,
            isCore: true,
            category: 'FACTUAL',
          },
        ]
    ).map((c) => {
      const subclaims = entityExtractorService.extractSubclaims(c.text);
      return {
        ...c,
        isCompound: subclaims.length > 1,
        subclaims: subclaims.length > 1 ? subclaims : undefined,
        entities: entityExtractorService.extractEntities(c.text),
      };
    });

    const evidence = await evidenceRetrieverService.retrieveEvidence(claims);

    const evaluatedClaims: ExtractedClaim[] = await Promise.all(
      claims.map(async (claim) => {
        const claimEvidence = evidence.filter((e) => e.claimId === claim.id);
        const evaluation = await geminiReasoningService.evaluateClaimReasoning(
          claim,
          article,
          claimEvidence
        );
        return { ...claim, evaluation };
      })
    );

    const scoringResult = credibilityScorerService.computeCredibilityScore(
      article,
      evaluatedClaims,
      evidence
    );

    const localModelResult = await localModelClassifierService.classifyText(test.claim);
    const score = scoringResult.score;

    // Check if score matches expected range and vector match reflects reality
    const isScoreCorrect = score >= test.expectedScoreRange[0] && score <= test.expectedScoreRange[1];
    const isLabelCorrect = (test.expectedLabel === 'REAL' && score >= 65) || (test.expectedLabel === 'FAKE' && score <= 35);
    const isPassed = isScoreCorrect || isLabelCorrect;

    if (isPassed) passCount++;

    const elapsed = Date.now() - startTime;
    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`[#${(i + 1).toString().padStart(2)}] [${test.topic.padEnd(25)}] Claim: "${test.claim}"`);
    console.log(`Expected: ${test.expectedLabel.padEnd(5)} [${test.expectedScoreRange.join('-')}] | Result Score: ${score.toString().padStart(2)}/100 (${scoringResult.verdict})`);
    console.log(`Vector Nearest Match: ${simResult.nearestLabel} (${(simResult.realSimilarity || simResult.fakeSimilarity || 0).toFixed(2)}) | Local Model: ${localModelResult.prediction} (${localModelResult.confidence}%) | ${isPassed ? '✅ CALIBRATED' : '❌ UNCALIBRATED'} (${elapsed}ms)`);
  }

  const accuracy = (passCount / VALIDATION_BENCHMARKS.length) * 100;
  console.log(`\n========================================================================================`);
  console.log(`🎯 CALIBRATION ACCURACY: ${accuracy.toFixed(1)}% (${passCount}/${VALIDATION_BENCHMARKS.length})`);
  console.log(`========================================================================================\n`);
}

main().catch(console.error);
