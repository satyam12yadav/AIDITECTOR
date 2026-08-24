import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const createApp = (): Express => {
  const app = express();

  // CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl, mobile)
        if (!origin) {
          return callback(null, true);
        }

        const isAllowed =
          env.CORS_ORIGIN.includes('*') ||
          env.CORS_ORIGIN.includes(origin) ||
          env.CORS_ORIGIN.some((allowed) => allowed.replace(/\/+$/, '') === origin.replace(/\/+$/, ''));

        if (isAllowed || env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error(`Origin '${origin}' not allowed by CORS policy.`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Body Parsing Middleware
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Root welcome / index
  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'Fake News Killer Backend API',
      status: 'active',
      endpoints: {
        health: '/api/health',
        analyze: '/api/analyze (POST)',
      },
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // 404 Not Found Handler for unhandled routes
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
