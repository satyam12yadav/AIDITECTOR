import { Router, Request, Response, NextFunction } from 'express';
import { datasetSimilarityService } from '../services/datasetSimilarity.service.js';

export const datasetSimilarityRouter = Router();

/**
 * POST /api/dataset-similarity
 * Phase 3 Fake News Dataset Vector Similarity Endpoint
 */
datasetSimilarityRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, claim, article, k } = req.body;
    const queryText = text || claim || article;

    if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'A non-empty text string must be provided.',
        },
      });
      return;
    }

    const topK = typeof k === 'number' && k > 0 ? k : 5;
    const similarityResult = await datasetSimilarityService.searchNearest(queryText.trim(), topK);

    // Return pure dataset similarity signal with strictly NO credibilityScore or finalVerdict
    res.status(200).json({
      success: true,
      data: {
        queryText: queryText.trim(),
        datasetMatch: similarityResult.datasetMatch,
        nearestExamples: similarityResult.nearestExamples,
        fakeSimilarity: similarityResult.fakeSimilarity,
        realSimilarity: similarityResult.realSimilarity,
        nearestLabel: similarityResult.nearestLabel,
        summary: similarityResult.summary,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default datasetSimilarityRouter;
