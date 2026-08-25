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
  try {
    const { url, text } = req.body;

    let articleResult: AnalyzeResponseData['article'];

    if (url && url.trim().length > 0) {
      // Perform extraction from the target URL
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
      // Manual text submission handling
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

    // 1. Extract factual claims from the article text
    const { claims: rawClaims } = claimExtractorService.extractClaims(articleResult.text);

    // 2. Extract entities for each claim
    const claims: ExtractedClaim[] = rawClaims.map((c) => ({
      ...c,
      entities: entityExtractorService.extractEntities(c.text),
    }));

    // 3. Retrieve multi-source evidence for the extracted claims
    const evidence = await evidenceRetrieverService.retrieveEvidence(claims);

    // 4. Perform evidence-grounded AI reasoning for each claim
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

    // 5. Calculate transparent credibility score
    const scoringResult = credibilityScorerService.computeCredibilityScore(
      articleResult,
      evaluatedClaims,
      evidence
    );

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
    };

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};
