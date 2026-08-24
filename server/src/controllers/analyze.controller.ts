import { Request, Response, NextFunction } from 'express';
import { AnalyzeRequestBody, AnalyzeResponseData } from '../types/api.js';
import { extractorService } from '../services/extractor.service.js';
import { claimExtractorService } from '../services/claimExtractor.service.js';
import { evidenceRetrieverService } from '../services/evidenceRetriever.service.js';
import { credibilityScorerService } from '../services/credibilityScorer.service.js';

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
    const { claims } = claimExtractorService.extractClaims(articleResult.text);

    // 2. Retrieve real external evidence for the extracted claims
    const evidence = await evidenceRetrieverService.retrieveEvidence(claims);

    // 3. Calculate transparent credibility score
    const scoringResult = credibilityScorerService.computeCredibilityScore(
      articleResult,
      claims,
      evidence
    );

    const responseData: AnalyzeResponseData = {
      article: articleResult,
      claims: claims,
      evidence: evidence,
      score: scoringResult.score,
      verdict: scoringResult.verdict,
      breakdown: scoringResult.breakdown,
      confidence: scoringResult.confidence,
      summary: scoringResult.summary,
      limitations: scoringResult.limitations,
      reasons: [scoringResult.summary, ...scoringResult.limitations],
      sources: evidence.map((e) => ({
        name: e.publisher,
        url: e.url,
        type: e.sourceType,
      })),
    };

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};
