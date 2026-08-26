import { Router } from 'express';
import healthRoutes from './health.routes.js';
import analyzeRoutes from './analyze.routes.js';
import evidenceRoutes from './evidence.routes.js';
import datasetSimilarityRoutes from './datasetSimilarity.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/analyze', analyzeRoutes);
apiRouter.use('/evidence', evidenceRoutes);
apiRouter.use('/dataset-similarity', datasetSimilarityRoutes);

export default apiRouter;

