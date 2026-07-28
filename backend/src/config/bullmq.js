import config from './index.js';

export function getBullMQConnection() {
  try {
    const url = new URL(config.redis.url);
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port || '6379', 10),
      username: url.username || undefined,
      password: url.password || undefined,
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
