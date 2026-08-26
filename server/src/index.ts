import dns from 'node:dns';
import { createApp } from './app.js';
import { env } from './config/env.js';

// Prioritize IPv4 for reliable outbound HTTP extraction
dns.setDefaultResultOrder('ipv4first');

const app = createApp();

const HOST = '0.0.0.0';

const server = app.listen(env.PORT, HOST, () => {
  console.log(`[SERVER] 🚀 Fake News Killer backend running on http://${HOST}:${env.PORT}`);
  console.log(`[SERVER] 📡 Environment: ${env.NODE_ENV}`);
  console.log(`[SERVER] 🩺 Health check available at: http://${HOST}:${env.PORT}/api/health`);
  console.log(`[SERVER] 🔍 Analyze endpoint available at: http://${HOST}:${env.PORT}/api/analyze (POST)`);

  // Startup API Key validation warnings (Non-crashing)
  if (!env.EXA_API_KEY || env.EXA_API_KEY.trim().length === 0 || env.EXA_API_KEY.includes('placeholder')) {
    console.warn(`\n[SERVER] ⚠️  WARNING: EXA_API_KEY not set — live multi-source evidence retrieval will be disabled and most claims will score as Needs Verification.`);
    console.warn(`[SERVER] 👉 Get an API key at https://exa.ai and add EXA_API_KEY=<your_key> to your .env file.\n`);
  } else {
    console.log(`[SERVER] 🔑 EXA_API_KEY detected — live multi-source RAG retrieval enabled.`);
  }

  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim().length === 0 || env.GEMINI_API_KEY.includes('placeholder')) {
    console.log(`[SERVER] ℹ️  GEMINI_API_KEY not set — using local deterministic NLI proposition engine for claim evaluation.`);
  }
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  console.log(`[SERVER] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[SERVER] Closed remaining connections.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
