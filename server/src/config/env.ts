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
  get PORT() { return parseInt(process.env.PORT || '5001', 10); },
  get NODE_ENV() { return (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development'; },
  get CORS_ORIGIN() { return parseCorsOrigins(process.env.CORS_ORIGIN); },
  get EXA_API_KEY() { return process.env.EXA_API_KEY || ''; },
  get GEMINI_API_KEY() { return process.env.GEMINI_API_KEY || ''; },
};
