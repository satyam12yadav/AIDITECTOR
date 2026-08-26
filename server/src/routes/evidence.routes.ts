import { Router, Request, Response, NextFunction } from 'express';
import { exaSearchService } from '../services/exaSearch.service.js';
import { ragEvidenceAnalyzerService } from '../services/ragEvidenceAnalyzer.service.js';

export const evidenceRouter = Router();

/**
 * POST /api/evidence
 * Phase 1 Evidence Retrieval Endpoint using Exa.ai and RAG context compilation
 */
evidenceRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { claim } = req.body;

    if (!claim || typeof claim !== 'string' || claim.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CLAIM',
          message: 'A non-empty string claim must be provided.',
        },
      });
      return;
    }

    const trimmedClaim = claim.trim();
    const evidenceResult = await exaSearchService.retrieveEvidenceForClaim(trimmedClaim);

    // Format response explicitly guaranteeing NO credibilityScore or truth verdicts
    res.status(200).json({
      success: true,
      data: {
        claim: evidenceResult.claim,
        queries: evidenceResult.queries,
        isTemporal: evidenceResult.isTemporal,
        sources: evidenceResult.sources.map((s) => ({
          title: s.title,
          url: s.url,
          domain: s.domain,
          publishedDate: s.publishedDate,
          author: s.author,
          content: s.content,
          searchQuery: s.searchQuery,
          retrievalScore: s.retrievalScore,
          contentAvailability: s.contentAvailability,
          possibleDuplicate: s.possibleDuplicate,
          retrievalRelevance: s.retrievalRelevance,
        })),
        ragContext: evidenceResult.ragContext,
        evidenceCount: evidenceResult.evidenceCount,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/evidence/analyze
 * Phase 2 RAG Evidence Analysis Endpoint
 */
evidenceRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { claim, text, input } = req.body;
    const targetInput = claim || text || input;

    if (!targetInput || typeof targetInput !== 'string' || targetInput.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'A non-empty claim or text string must be provided.',
        },
      });
      return;
    }

    const analysisResponse = await ragEvidenceAnalyzerService.analyzeEvidenceForInput(targetInput.trim());

    // Return structured evidence stance analysis with NO credibilityScore or final true/false
    res.status(200).json({
      success: true,
      data: analysisResponse,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default evidenceRouter;
