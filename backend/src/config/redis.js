import Redis from 'ioredis';
import config from './index.js';

let redisClient = null;

export async function connectRedis() {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  });

  redisClient.on('connect', () => {
    console.log(`[Redis] Client connected to ${config.redis.url}`);
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Client error:', err.message);
  });

  try {
    await redisClient.connect();
  } catch (error) {
    console.error('[Redis] Connection failed:', error.message);
  }

  return redisClient;
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Client disconnected');
  }
}

export function getRedisStatus() {
  if (!redisClient) return 'disconnected';
  return redisClient.status || 'unknown';
}

export function getRedisClient() {
  return redisClient;
}
