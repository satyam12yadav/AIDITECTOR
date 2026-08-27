import dotenv from 'dotenv';
dotenv.config();

import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { stanceEvaluatorService } from '../services/stanceEvaluator.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { semanticContradictionEngine } from '../services/semanticContradictionEngine.service.js';
import { ExtractedClaim } from '../types/api.js';

async function testSportsClaims() {
  const testClaims = [
    'Rohit Sharma is a bowler.',
    'Rohit is a bowler.',
    'Virat Kohli is an all rounder.',
    'Virat Kohli is an all-rounder.',
    'Rohit Sharma is a right-handed top-order batsman.',
    'Virat Kohli is a right-handed top-order batsman.',
  ];

  console.log(`\n============================================================`);
  console.log(`TESTING SPORTS CLAIMS WITH EXA & STANCE EVALUATOR`);
  console.log(`============================================================\n`);

  for (const claimText of testClaims) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`CLAIM: "${claimText}"`);

    const triple = entityExtractorService.extractClaimTriple(claimText);
    console.log(`Triple:`, JSON.stringify(triple));

    const prop = semanticContradictionEngine.extractClaimProposition(claimText);
    console.log(`Proposition:`, JSON.stringify(prop));

    const { claims: rawClaims } = claimExtractorService.extractClaims(claimText);
    const claims: ExtractedClaim[] = (rawClaims.length > 0
      ? rawClaims
      : [
          {
            id: `claim-test`,
            text: claimText,
            confidence: 90,
            importance: 1,
            claim_type: 'FACTUAL',
            isCore: true,
            category: 'FACTUAL',
          },
        ]
    ).map((c) => ({
      ...c,
      entities: entityExtractorService.extractEntities(c.text),
    }));

    console.log(`Retrieving evidence...`);
    const evidence = await evidenceRetrieverService.retrieveEvidence(claims);
    console.log(`Evidence found: ${evidence.length} items`);

    evidence.forEach((ev, i) => {
      console.log(`\n[Evidence #${i+1}] Source: ${ev.sourceName || ev.publisher} (${ev.domain})`);
      console.log(`Snippet: "${ev.evidenceText?.slice(0, 150)}..."`);
      console.log(`Relation to claim: ${ev.relationToClaim} (Stance: ${ev.stance})`);
      console.log(`Explanation: ${ev.explanation}`);
    });

    const article = {
      title: claimText,
      author: null,
      publishedAt: null,
      publisher: 'Test Script',
      url: null,
      text: claimText,
    };

    const scoringResult = credibilityScorerService.computeCredibilityScore(article, claims, evidence);
    console.log(`\nFINAL SCORE: ${scoringResult.score}/100 | VERDICT: ${scoringResult.verdict}`);
    console.log(`SUMMARY: ${scoringResult.summary}`);
  }
}

testSportsClaims().catch(console.error);
