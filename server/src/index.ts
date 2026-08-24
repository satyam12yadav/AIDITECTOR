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
