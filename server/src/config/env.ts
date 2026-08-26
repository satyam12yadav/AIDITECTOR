import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

export interface EnvConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  CORS_ORIGIN: string[];
  EXA_API_KEY: string;
  GEMINI_API_KEY: string;
}

const parseCorsOrigins = (rawOrigins?: string): string[] => {
  if (!rawOrigins) {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }
  return rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
  EXA_API_KEY: process.env.EXA_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};
