import { getRedisClient } from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import config from '../config/index.js';

/**
 * Redis-backed rate limiting middleware factory.
 * @param {Object} options
 * @param {number} options.max Maximum allowed requests in window
 * @param {number} options.windowMs Window duration in milliseconds
 * @param {string} [options.keyPrefix='rl'] Redis key namespace
 */
export function rateLimiter({ max, windowMs, keyPrefix = 'rl' }) {
  const inMemoryCounts = new Map();

  return async (req, _res, next) => {
    // Bypass rate limiting in test environment
    if (config.env === 'test' || process.env.NODE_ENV === 'test') {
      return next();
    }

    const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const emailTag = req.body?.email ? `:${req.body.email.toLowerCase().trim()}` : '';
    const identifier = req.user?.id ? req.user.id : `${clientIp}${emailTag}`;
    const key = `${keyPrefix}:${identifier}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    const redis = getRedisClient();

    if (redis && redis.status === 'ready') {
      try {
        const current = await redis.incr(key);
        
        // Guarantee expiration: if first increment OR if key somehow lacks a TTL (-1)
        if (current === 1) {
          await redis.expire(key, windowSeconds);
        } else {
          const ttl = await redis.ttl(key);
          if (ttl === -1) {
            await redis.expire(key, windowSeconds);
          }
        }

        if (current > max) {
          return next(
            new AppError(
              'RATE_LIMITED',
              'Too many requests. Please try again later.',
              429,
            ),
          );
        }
        return next();
      } catch (err) {
        console.warn('[RateLimiter] Redis error, bypassing rate limit:', err.message);
        return next();
      }
    }

    // In-memory fallback if Redis is unavailable
    const now = Date.now();
    const record = inMemoryCounts.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + windowMs;
    } else {
      record.count += 1;
    }

    inMemoryCounts.set(key, record);

    if (record.count > max) {
      return next(
        new AppError(
          'RATE_LIMITED',
          'Too many requests. Please try again later.',
          429,
        ),
      );
    }

    next();
  };
}

export const transferLimiter = rateLimiter({
  max: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'rl:transfer',
});

export const apiLimiter = rateLimiter({
  max: 100,
  windowMs: 60 * 1000,
  keyPrefix: 'rl:api',
});

export default rateLimiter;
