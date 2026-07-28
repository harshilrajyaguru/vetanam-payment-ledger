import { connectDB, disconnectDB } from './config/db.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { startWorkers, stopWorkers } from './workers/index.js';
import { closeQueues } from './queues/index.js';

async function bootstrapWorkerProcess() {
  console.log('[Worker Process] Initializing worker service...');

  await connectDB();
  await connectRedis();

  startWorkers();

  const shutdown = async (signal) => {
    console.log(`[Worker Process] Received ${signal}. Initiating graceful shutdown...`);
    try {
      await stopWorkers();
      await closeQueues();
      await disconnectRedis();
      await disconnectDB();
      console.log('[Worker Process] Graceful shutdown complete.');
      process.exit(0);
    } catch (error) {
      console.error('[Worker Process] Error during shutdown:', error.message);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrapWorkerProcess().catch((err) => {
  console.error('[Worker Process] Bootstrapping error:', err);
  process.exit(1);
});
