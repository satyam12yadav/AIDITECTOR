import { Router } from 'express';
import healthRoutes from './health.routes.js';
import analyzeRoutes from './analyze.routes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/analyze', analyzeRoutes);

export default apiRouter;
