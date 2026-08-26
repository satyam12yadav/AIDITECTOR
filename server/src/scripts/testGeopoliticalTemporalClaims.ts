import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { localModelClassifierService } from '../services/localModelClassifier.service.js';
import { ExtractedClaim } from '../types/api.js';

interface ClaimItem {
  id: number;
  group: string;
  claim: string;
  expected: 'TRUE' | 'FALSE' | 'UNVERIFIED / TEMPORAL';
}

const CLAIMS: ClaimItem[] = [
  // Group 1: Russia-Ukraine
  { id: 1, group: 'RUSSIA–UKRAINE', claim: "The war between Russia and Ukraine is currently ongoing.", expected: 'TRUE' },
  { id: 2, group: 'RUSSIA–UKRAINE', claim: "Russia and Ukraine have signed a permanent ceasefire ending the war.", expected: 'FALSE' },
  { id: 3, group: 'RUSSIA–UKRAINE', claim: "Russia and Ukraine agreed to a temporary humanitarian ceasefire.", expected: 'UNVERIFIED / TEMPORAL' },
  { id: 4, group: 'RUSSIA–UKRAINE', claim: "A comprehensive peace agreement was officially signed ending the Russia-Ukraine war.", expected: 'FALSE' },
  { id: 5, group: 'RUSSIA–UKRAINE', claim: "Russia has completed a full withdrawal of all military forces from Ukraine.", expected: 'FALSE' },

  // Group 2: Ceasefire / Temporal
  { id: 6, group: 'CEASEFIRE / TEMPORAL', claim: "A ceasefire is currently active in the conflict zone.", expected: 'UNVERIFIED / TEMPORAL' },
  { id: 7, group: 'CEASEFIRE / TEMPORAL', claim: "A historical ceasefire was agreed upon in past diplomatic negotiations.", expected: 'TRUE' },
  { id: 8, group: 'CEASEFIRE / TEMPORAL', claim: "The ceasefire between the combatants has officially ended.", expected: 'UNVERIFIED / TEMPORAL' },
  { id: 9, group: 'CEASEFIRE / TEMPORAL', claim: "A new ceasefire was announced by military commanders.", expected: 'UNVERIFIED / TEMPORAL' },
  { id: 10, group: 'CEASEFIRE / TEMPORAL', claim: "Peace negotiations between the warring parties are currently ongoing.", expected: 'UNVERIFIED / TEMPORAL' },

  // Group 3: Iran / Hormuz
  { id: 11, group: 'IRAN / HORMUZ', claim: "A permanent ceasefire is currently in effect in the Iran-Israel regional conflict.", expected: 'FALSE' },
  { id: 12, group: 'IRAN / HORMUZ', claim: "A formal ceasefire extension was officially agreed in the Middle East conflict.", expected: 'UNVERIFIED / TEMPORAL' },
  { id: 13, group: 'IRAN / HORMUZ', claim: "Permanent peace has been established across the Persian Gulf and Strait of Hormuz.", expected: 'FALSE' },
  { id: 14, group: 'IRAN / HORMUZ', claim: "The Strait of Hormuz has been reopened for international maritime shipping.", expected: 'UNVERIFIED / TEMPORAL' },
  { id: 15, group: 'IRAN / HORMUZ', claim: "All hostilities in the Persian Gulf and Red Sea have permanently ended.", expected: 'FALSE' },

  // Group 4: CM Vijay / Tamil Nadu
  { id: 16, group: 'CM VIJAY', claim: "Actor Vijay (Thalapathy Vijay) is currently the Chief Minister of Tamil Nadu.", expected: 'FALSE' },
  { id: 17, group: 'CM VIJAY', claim: "Tamil Nadu Chief Minister Vijay has cancelled the Parandur airport project.", expected: 'FALSE' },
  { id: 18, group: 'CM VIJAY', claim: "Tamil Nadu Chief Minister Vijay ordered the release of Mettur dam water.", expected: 'FALSE' },
  { id: 19, group: 'CM VIJAY', claim: "Tamil Nadu Chief Minister Vijay has resigned from his office.", expected: 'FALSE' },
  { id: 20, group: 'CM VIJAY', claim: "Tamil Nadu Chief Minister Vijay announced a new state industrial and economic policy.", expected: 'FALSE' },
];

async function runEvaluation() {
  console.log(`\n========================================================================================`);
  console.log(`🔍 EVALUATING 20 GEOPOLITICAL, TEMPORAL & CM VIJAY CLAIMS`);
  console.log(`========================================================================================\n`);

  for (const item of CLAIMS) {
    const startTime = Date.now();
    const article = {
      title: item.claim,
      author: null,
      publishedAt: null,
      publisher: 'Geopolitical Temporal Evaluation',
      url: null,
      text: item.claim,
    };

    const { claims: rawClaims } = claimExtractorService.extractClaims(article.text);
    const claims: ExtractedClaim[] = (rawClaims.length > 0 ? rawClaims : [{
      id: `claim-${item.id}`,
      text: item.claim,
      confidence: 90,
      importance: 1,
      claim_type: 'FACTUAL',
      isCore: true,
      category: 'FACTUAL',
    }]).map((c) => {
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

    const modelInference = await localModelClassifierService.classifyText(item.claim);
    const elapsed = Date.now() - startTime;

    console.log(`----------------------------------------------------------------------------------------`);
    console.log(`[#${item.id.toString().padStart(2)}] [${item.group.padEnd(20)}] Claim: "${item.claim}"`);
    console.log(`Expected: ${item.expected.padEnd(12)} | Score: ${scoringResult.score}/100 | Verdict: ${scoringResult.verdict}`);
    console.log(`Local Model: ${modelInference.prediction} (${modelInference.confidence}%) | Ev Count: ${evidence.length} | Latency: ${elapsed}ms`);
  }

  console.log(`\n========================================================================================`);
  console.log(`✅ EVALUATION RUN FINISHED`);
  console.log(`========================================================================================\n`);
}

runEvaluation().catch(console.error);
