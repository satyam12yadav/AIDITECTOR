import { Router } from 'express';
import { analyzeArticle } from '../controllers/analyze.controller.js';
import { validateAnalyzeRequest } from '../middleware/validateAnalyzeRequest.js';

const router = Router();

// POST /api/analyze
router.post('/', validateAnalyzeRequest, analyzeArticle);

export default router;
