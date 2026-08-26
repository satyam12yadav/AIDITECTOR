import { Request, Response, NextFunction } from 'express';
import { AnalyzeRequestBody, AnalyzeResponseData, ExtractedClaim } from '../types/api.js';
import { extractorService } from '../services/extractor.service.js';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { entityExtractorService } from '../services/entityExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { geminiReasoningService } from '../services/geminiReasoning.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';
import { sourceRegistry } from '../services/sourceRegistry.service.js';

export const analyzeArticle = async (
  req: Request<{}, {}, AnalyzeRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const reqStart = Date.now();
  const timings: Record<string, number> = {};

  try {
    const { url, text } = req.body;

    let articleResult: AnalyzeResponseData['article'];

    const tExtStart = Date.now();
    if (url && url.trim().length > 0) {
      const extracted = await extractorService.extract(url.trim());
      articleResult = {
        title: extracted.title,
        author: extracted.author,
        publishedAt: extracted.publishedAt,
        publisher: extracted.publisher,
        url: extracted.url,
        text: extracted.text,
      };
    } else if (text && text.trim().length > 0) {
      const trimmedText = text.trim();
      const firstLine = trimmedText.split('\n')[0].trim();
      const title =
        firstLine.length > 60 ? `${firstLine.substring(0, 57)}...` : firstLine || 'Manual Text Ingestion';

      articleResult = {
        title,
        author: null,
        publishedAt: null,
        publisher: 'Direct Text Ingestion',
        url: null,
        text: trimmedText,
      };
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INPUT',
          message: "Either 'url' or 'text' must be provided for analysis.",
        },
      });
      return;
    }
    timings.extractionMs = Date.now() - tExtStart;

    // 1. Extract factual claims
    const tClaimStart = Date.now();
    const { claims: rawClaims } = claimExtractorService.extractClaims(articleResult.text);

    // 2. Extract entities for each claim
    const claims: ExtractedClaim[] = rawClaims.map((c) => ({
      ...c,
      entities: entityExtractorService.extractEntities(c.text),
    }));
    timings.claimExtractionMs = Date.now() - tClaimStart;

    // 3. Multi-source concurrent evidence retrieval
    const tEvStart = Date.now();
    const evidence = await evidenceRetrieverService.retrieveEvidence(claims);
    timings.evidenceRetrievalMs = Date.now() - tEvStart;

    // 4. Evidence-grounded AI reasoning per claim
    const tReasonStart = Date.now();
    const evaluatedClaims: ExtractedClaim[] = await Promise.all(
      claims.map(async (claim) => {
        const claimEvidence = evidence.filter((e) => e.claimId === claim.id);
        const evaluation = await geminiReasoningService.evaluateClaimReasoning(
          claim,
          articleResult,
          claimEvidence
        );
        return {
          ...claim,
          evaluation,
        };
      })
    );
    timings.aiReasoningMs = Date.now() - tReasonStart;

    // 5. Calculate calibrated 5-pillar credibility score
    const tScoreStart = Date.now();
    const scoringResult = credibilityScorerService.computeCredibilityScore(
      articleResult,
      evaluatedClaims,
      evidence
    );
    timings.scoringMs = Date.now() - tScoreStart;

    // Deduplicate and enrich sources list
    const sourceMap = new Map<string, any>();
    for (const e of evidence) {
      const pubKey = (e.publisher || e.sourceName || e.url).toLowerCase();
      if (!sourceMap.has(pubKey)) {
        const regInfo = sourceRegistry.getSourceCredibility(e.url || e.publisher);
        sourceMap.set(pubKey, {
          name: e.sourceName || e.publisher,
          url: e.sourceUrl || e.url,
          type: e.sourceType,
          tier: e.sourceTier || regInfo.credibilityTier,
          badge: regInfo.badge,
        });
      }
    }

    timings.totalMs = Date.now() - reqStart;

    // Structured Console Diagnostics (Requirement 9)
    for (const claim of evaluatedClaims) {
      const claimEvidence = evidence.filter((e) => e.claimId === claim.id);
      const generatedQueries = evidenceRetrieverService.generateSearchQueries(claim.text, claim.isTimeSensitive);
      const sourcesFound = claimEvidence.map((e) => `${e.sourceName || e.publisher} (${e.sourceType || 'reference'})`);
      const acceptedEvidence = claimEvidence
        .filter((e) => e.relationToClaim === 'SUPPORTS' && e.relevance === 'direct')
        .map((e) => `"${e.evidenceText?.slice(0, 100)}..." [${e.sourceName}]`);

      const geminiVerdict = claim.evaluation?.verdict || 'UNVERIFIED';

      console.log(`\n============================================================`);
      console.log(`Claim:\n${claim.text}`);
      console.log(`\nGenerated queries:\n${JSON.stringify(generatedQueries, null, 2)}`);
      console.log(`\nSources searched:\n[Google FactCheck, Google News RSS, Reference Repositories (Britannica/NatGeo/ThoughtCo/Wikipedia), Web Search]`);
      console.log(`\nSources found:\n[${sourcesFound.join(', ') || 'No external sources retrieved'}]`);
      console.log(`\nAccepted evidence:\n[${acceptedEvidence.join(',\n') || 'None'}]`);
      console.log(`\nGemini stance:\n${geminiVerdict.toLowerCase()} (Confidence: ${claim.evaluation?.confidence || 0}%)`);
      console.log(`\nFinal score:\n${scoringResult.score}/100`);
      console.log(`\nFinal verdict:\n${scoringResult.verdict}`);
      console.log(`============================================================\n`);
    }

    const responseData: AnalyzeResponseData = {
      article: articleResult,
      claims: evaluatedClaims,
      evidence: evidence,
      score: scoringResult.score,
      verdict: scoringResult.verdict,
      breakdown: scoringResult.breakdown,
      confidence: scoringResult.confidence,
      summary: scoringResult.summary,
      limitations: scoringResult.limitations,
      reasons: [scoringResult.summary, ...scoringResult.limitations],
      sources: Array.from(sourceMap.values()),
      articleSummary: scoringResult.articleSummary,
      diagnostics: scoringResult.diagnostics,
      timings,
    };

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};
