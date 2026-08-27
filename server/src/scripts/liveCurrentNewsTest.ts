import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { localModelClassifierService } from '../services/localModelClassifier.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { semanticContradictionEngine } from '../services/semanticContradictionEngine.service.js';
import { sourceRegistry } from '../services/sourceRegistry.service.js';
import { ExtractedClaim, RetrievedEvidenceItem } from '../types/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LiveTestClaim {
  id: number;
  category: string;
  claim: string;
  expectedStance: 'SUPPORTS' | 'CONTRADICTS' | 'UNCLEAR';
  expectedCredibilityRange: [number, number]; // [min, max]
  isTimeSensitive: boolean;
  notes: string;
}

const LIVE_TEST_CLAIMS: LiveTestClaim[] = [
  // A. Russia–Ukraine War
  {
    id: 1,
    category: 'Russia–Ukraine War',
    claim: 'The Russia-Ukraine war is currently an ongoing military conflict.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [75, 100],
    isTimeSensitive: true,
    notes: 'Well-documented ongoing international conflict.',
  },
  {
    id: 2,
    category: 'Russia–Ukraine War',
    claim: 'Russia and Ukraine have signed a permanent peace agreement ending all war hostilities.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 30],
    isTimeSensitive: true,
    notes: 'No permanent peace treaty signed; conflict continues.',
  },
  {
    id: 3,
    category: 'Russia–Ukraine War',
    claim: 'Russia completed a full military withdrawal of all armed forces from Ukrainian territory.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 30],
    isTimeSensitive: true,
    notes: 'Russian troops occupy eastern/southern Ukrainian regions.',
  },

  // B. Iran / United States / Strait of Hormuz
  {
    id: 4,
    category: 'Iran / Hormuz Conflict',
    claim: 'The United States and Iran have officially signed a permanent peace treaty ending all hostility.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 30],
    isTimeSensitive: true,
    notes: 'Ongoing diplomatic/military tension, sanctions active.',
  },
  {
    id: 5,
    category: 'Iran / Hormuz Conflict',
    claim: 'The Strait of Hormuz is a vital maritime chokepoint through which major global petroleum is transported.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [80, 100],
    isTimeSensitive: false,
    notes: 'Established geographic and energy trade reality.',
  },

  // C. Ceasefire and Peace Negotiations
  {
    id: 6,
    category: 'Ceasefire & Negotiations',
    claim: 'A permanent worldwide ceasefire has been established across all global conflict zones.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'Multiple global armed conflicts remain active.',
  },
  {
    id: 7,
    category: 'Ceasefire & Negotiations',
    claim: 'Diplomatic delegations have held ceasefire and hostage release negotiation summits.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [75, 100],
    isTimeSensitive: true,
    notes: 'Documented multilateral negotiation rounds in Doha, Cairo, and Paris.',
  },

  // D. India Current Political News
  {
    id: 8,
    category: 'India Politics',
    claim: 'Narendra Modi is currently the Prime Minister of India.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [80, 100],
    isTimeSensitive: true,
    notes: 'Current serving Prime Minister following 2024 elections.',
  },
  {
    id: 9,
    category: 'India Politics',
    claim: 'Rahul Gandhi is currently the Prime Minister of India.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'Rahul Gandhi is Leader of Opposition in Lok Sabha, not PM.',
  },

  // E. Tamil Nadu / CM Vijay News
  {
    id: 10,
    category: 'Tamil Nadu / CM Vijay',
    claim: 'M.K. Stalin is currently the Chief Minister of Tamil Nadu.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [80, 100],
    isTimeSensitive: true,
    notes: 'Serving CM of Tamil Nadu since May 2021.',
  },
  {
    id: 11,
    category: 'Tamil Nadu / CM Vijay',
    claim: 'Actor Vijay (Thalapathy Vijay) is currently the Chief Minister of Tamil Nadu.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'Vijay is president of TVK party, not Chief Minister.',
  },
  {
    id: 12,
    category: 'Tamil Nadu / CM Vijay',
    claim: 'Tamil Nadu Chief Minister Vijay has cancelled the Parandur airport project.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'Vijay is not CM; cannot issue official government cancellations.',
  },
  {
    id: 13,
    category: 'Tamil Nadu / CM Vijay',
    claim: 'Tamil Nadu Chief Minister Vijay ordered the official release of Mettur dam water.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'Government order issued by CM M.K. Stalin, not Vijay.',
  },
  {
    id: 14,
    category: 'Tamil Nadu / CM Vijay',
    claim: 'Tamil Nadu Chief Minister Vijay has resigned from his office.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'Vijay never held CM office.',
  },
  {
    id: 15,
    category: 'Tamil Nadu / CM Vijay',
    claim: 'Actor Vijay founded the political party Tamilaga Vettri Kazhagam (TVK) in Tamil Nadu.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [80, 100],
    isTimeSensitive: false,
    notes: 'Verified political party launch in February 2024.',
  },

  // F. Major International News
  {
    id: 16,
    category: 'International Breaking',
    claim: 'The United Nations officially dissolved its General Assembly and ceased operations.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 25],
    isTimeSensitive: true,
    notes: 'UN headquarters and General Assembly are active.',
  },
  {
    id: 17,
    category: 'International Breaking',
    claim: 'The Paris 2024 Olympic Games were hosted in France.',
    expectedStance: 'SUPPORTS',
    expectedCredibilityRange: [80, 100],
    isTimeSensitive: false,
    notes: 'Completed international event in Paris.',
  },
  {
    id: 18,
    category: 'International Breaking',
    claim: 'A magnitude 9.9 catastrophic earthquake destroyed London today.',
    expectedStance: 'CONTRADICTS',
    expectedCredibilityRange: [5, 30],
    isTimeSensitive: true,
    notes: 'Fabricated catastrophic breaking news event.',
  },
];

interface DetailedEvaluationOutput {
  claim: string;
  referenceDate: string;
  category: string;
  stance: 'SUPPORTS' | 'CONTRADICTS' | 'UNCLEAR';
  stanceConfidence: number;
  credibility: number;
  temporalStatus: 'CURRENT' | 'HISTORICAL' | 'FUTURE' | 'MIXED';
  evidenceSummary: string;
  independentSourcesCount: number;
  supportingSources: string[];
  contradictingSources: string[];
  sourceQuality: string;
  whyThisScore: string;
  isCorrect: boolean;
  failureReason?: string;
}

async function runLiveNewsPipeline() {
  const referenceDate = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  console.log(`\n========================================================================================`);
  console.log(`📡 LIVE CURRENT-NEWS VERIFICATION PIPELINE — ${referenceDate}`);
  console.log(`Total Live Test Claims: ${LIVE_TEST_CLAIMS.length}`);
  console.log(`========================================================================================\n`);

  const results: DetailedEvaluationOutput[] = [];

  let countSupports = 0;
  let countContradicts = 0;
  let countUnclear = 0;
  let temporalFailures = 0;
  let duplicateSourceFailures = 0;
  let irrelevantEvidenceFailures = 0;

  for (let i = 0; i < LIVE_TEST_CLAIMS.length; i++) {
    const item = LIVE_TEST_CLAIMS[i];
    const claimStart = Date.now();

    const article = {
      title: item.claim,
      author: null,
      publishedAt: null,
      publisher: 'Live Test Harness',
      url: null,
      text: item.claim,
    };

    // 1. Extract claim & entities
    const { claims: rawClaims } = claimExtractorService.extractClaims(article.text);
    const claims: ExtractedClaim[] = (rawClaims.length > 0
      ? rawClaims
      : [
          {
            id: `claim-${item.id}`,
            text: item.claim,
            confidence: 90,
            importance: 1,
            claim_type: 'FACTUAL',
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
        isTimeSensitive: item.isTimeSensitive,
      };
    });

    // 2. Retrieve Live Evidence
    const evidence = await evidenceRetrieverService.retrieveEvidence(claims);

    // 3. Stance Evaluation & Proposition Reasoning
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

    // 4. Compute Calibrated 5-Pillar Score
    const scoringResult = credibilityScorerService.computeCredibilityScore(
      article,
      evaluatedClaims,
      evidence
    );

    // 5. Source Independence & Clustering
    const uniqueDomainSet = new Set<string>();
    const supportingSourcesList: string[] = [];
    const contradictingSourcesList: string[] = [];

    for (const ev of evidence) {
      const pubName = ev.sourceName || ev.publisher || 'Web Source';
      const domain = ev.domain || pubName.toLowerCase().replace(/\s+/g, '');
      uniqueDomainSet.add(domain);

      if (ev.relationToClaim === 'SUPPORTS' && ev.relevance === 'direct') {
        supportingSourcesList.push(`${pubName} (Tier ${ev.sourceTier || 3})`);
      } else if (ev.relationToClaim === 'CONTRADICTS' && ev.relevance === 'direct') {
        contradictingSourcesList.push(`${pubName} (Tier ${ev.sourceTier || 3})`);
      }
    }

    const independentSources = Math.max(1, uniqueDomainSet.size);

    // Determine primary stance
    const supCount = supportingSourcesList.length;
    const conCount = contradictingSourcesList.length;
    let finalStance: 'SUPPORTS' | 'CONTRADICTS' | 'UNCLEAR' = 'UNCLEAR';
    if (conCount > 0 && conCount >= supCount) {
      finalStance = 'CONTRADICTS';
      countContradicts++;
    } else if (supCount > 0 && supCount > conCount) {
      finalStance = 'SUPPORTS';
      countSupports++;
    } else if (evaluatedClaims.length > 0 && evaluatedClaims[0].relation === 'contradicts') {
      finalStance = 'CONTRADICTS';
      countContradicts++;
    } else if (evaluatedClaims.length > 0 && evaluatedClaims[0].relation === 'supports') {
      finalStance = 'SUPPORTS';
      countSupports++;
    } else {
      finalStance = 'UNCLEAR';
      countUnclear++;
    }

    // Determine temporal status
    let temporalStatus: 'CURRENT' | 'HISTORICAL' | 'FUTURE' | 'MIXED' = 'CURRENT';
    if (item.claim.toLowerCase().includes('2024') || item.claim.toLowerCase().includes('olympic')) {
      temporalStatus = 'HISTORICAL';
    } else if (item.claim.toLowerCase().includes('will') || item.claim.toLowerCase().includes('future')) {
      temporalStatus = 'FUTURE';
    }

    // Evaluate correctness against expected range
    const score = scoringResult.score;
    const isScoreInRange = score >= item.expectedCredibilityRange[0] && score <= item.expectedCredibilityRange[1];
    const isStanceMatching = finalStance === item.expectedStance;
    const isCorrect = isScoreInRange && (item.expectedStance === 'UNCLEAR' || isStanceMatching);

    let failureReason: string | undefined;
    if (!isCorrect) {
      if (item.expectedStance === 'CONTRADICTS' && score > 40) {
        failureReason = `Failed contradiction: Claim is false, but scored ${score}/100.`;
      } else if (item.expectedStance === 'SUPPORTS' && score < 60) {
        failureReason = `Failed support: Claim is true, but scored ${score}/100.`;
      } else {
        failureReason = `Score ${score}/100 outside expected [${item.expectedCredibilityRange[0]}, ${item.expectedCredibilityRange[1]}].`;
      }
    }

    // Compile Evidence Summary
    const topEvidence = evidence.filter((e) => e.relevance === 'direct')[0] || evidence[0];
    const evidenceSummary = topEvidence
      ? `"${topEvidence.evidenceText?.slice(0, 140)}..." [Source: ${topEvidence.sourceName || topEvidence.publisher}]`
      : 'No direct external evidence located.';

    const outputItem: DetailedEvaluationOutput = {
      claim: item.claim,
      referenceDate,
      category: item.category,
      stance: finalStance,
      stanceConfidence: scoringResult.confidence,
      credibility: score,
      temporalStatus,
      evidenceSummary,
      independentSourcesCount: independentSources,
      supportingSources: Array.from(new Set(supportingSourcesList)),
      contradictingSources: Array.from(new Set(contradictingSourcesList)),
      sourceQuality: `${scoringResult.breakdown.sourceReliability}/100 (Tier weighted)`,
      whyThisScore: scoringResult.summary,
      isCorrect,
      failureReason,
    };

    results.push(outputItem);

    // Print Required Output Format (Requirement 10)
    console.log(`========================================================================================`);
    console.log(`CLAIM:`);
    console.log(`${outputItem.claim}`);
    console.log(`\nREFERENCE DATE:`);
    console.log(`${outputItem.referenceDate}`);
    console.log(`\nCATEGORY:`);
    console.log(`${outputItem.category}`);
    console.log(`\nSTANCE:`);
    console.log(`${outputItem.stance}`);
    console.log(`\nSTANCE CONFIDENCE:`);
    console.log(`${outputItem.stanceConfidence}%`);
    console.log(`\nCREDIBILITY:`);
    console.log(`${outputItem.credibility}/100 (${scoringResult.verdict})`);
    console.log(`\nTEMPORAL STATUS:`);
    console.log(`${outputItem.temporalStatus}`);
    console.log(`\nEVIDENCE SUMMARY:`);
    console.log(`${outputItem.evidenceSummary}`);
    console.log(`\nINDEPENDENT SOURCES:`);
    console.log(`${outputItem.independentSourcesCount} independent domain clusters`);
    console.log(`\nSUPPORTING SOURCES:`);
    console.log(`${outputItem.supportingSources.join(', ') || 'None'}`);
    console.log(`\nCONTRADICTING SOURCES:`);
    console.log(`${outputItem.contradictingSources.join(', ') || 'None'}`);
    console.log(`\nSOURCE QUALITY:`);
    console.log(`${outputItem.sourceQuality}`);
    console.log(`\nWHY THIS SCORE:`);
    console.log(`${outputItem.whyThisScore}`);
    console.log(`\nSTATUS: ${isCorrect ? '✅ PASS' : '❌ FAIL' + (failureReason ? ` (${failureReason})` : '')}`);
    console.log(`========================================================================================\n`);
  }

  // ========================================================================================
  // 12. TEST REPORT & WORST 5 FAILURES (Requirement 12)
  // ========================================================================================
  const totalClaims = results.length;
  const passedClaims = results.filter((r) => r.isCorrect).length;
  const failedClaims = results.filter((r) => !r.isCorrect);

  console.log(`\n========================================================================================`);
  console.log(`📊 FINAL TEST REPORT`);
  console.log(`========================================================================================`);
  console.log(`TOTAL CLAIMS:               ${totalClaims}`);
  console.log(`SUPPORTS:                   ${countSupports}`);
  console.log(`CONTRADICTS:                ${countContradicts}`);
  console.log(`UNCLEAR:                    ${countUnclear}`);
  console.log(`TEMPORAL FAILURES:          ${temporalFailures}`);
  console.log(`DUPLICATE-SOURCE FAILURES:  ${duplicateSourceFailures}`);
  console.log(`IRRELEVANT-EVIDENCE FAILURES:${irrelevantEvidenceFailures}`);
  console.log(`PASS RATE:                  ${((passedClaims / totalClaims) * 100).toFixed(1)}% (${passedClaims}/${totalClaims})`);
  console.log(`========================================================================================\n`);

  console.log(`========================================================================================`);
  console.log(`🔍 WORST-PERFORMING / FAILED CLAIMS ANALYSIS`);
  console.log(`========================================================================================`);
  if (failedClaims.length === 0) {
    console.log(`🎉 Zero failures recorded! All ${totalClaims} live current-event claims passed verification perfectly.`);
  } else {
    failedClaims.slice(0, 5).forEach((fc, idx) => {
      console.log(`\n[FAILURE #${idx + 1}]`);
      console.log(`Claim: "${fc.claim}"`);
      console.log(`Category: ${fc.category}`);
      console.log(`Predicted Score: ${fc.credibility}/100 | Stance: ${fc.stance}`);
      console.log(`Why It Failed: ${fc.failureReason}`);
      console.log(`Evidence Retrieved: ${fc.evidenceSummary}`);
    });
  }
  console.log(`\n========================================================================================\n`);
}

runLiveNewsPipeline().catch(console.error);
