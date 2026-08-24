import { Request, Response } from 'express';
import { env } from '../config/env.js';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    service: 'Fake News Killer API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(typeof process.uptime === 'function' ? process.uptime() : 0),
    timestamp: new Date().toISOString(),
  });
};
