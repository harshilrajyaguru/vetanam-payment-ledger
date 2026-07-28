import config from './config/index.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = createApp();

async function startServer() {
  try {
    await connectDatabase().catch((err) => {
      console.warn('[Server] DB initial connection warning:', err.message);
    });
    await connectRedis().catch((err) => {
      console.warn('[Server] Redis initial connection warning:', err.message);
    });
  } catch (err) {
    console.error('[Server] Startup error:', err);
  }

  const server = app.listen(config.port, () => {
    console.log(`API server running on port ${config.port} [${config.env}]`);
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      await disconnectRedis();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
