import { URL } from 'url';
import config from './index.js';

/**
 * Get BullMQ Redis connection configuration.
 * BullMQ requires maxRetriesPerRequest: null.
 *
 * @returns {Object} Redis connection options for BullMQ Queue and Worker instances.
 */
export function getBullMQConnection() {
  try {
    const parsed = new URL(config.redis.url);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

export default getBullMQConnection;
