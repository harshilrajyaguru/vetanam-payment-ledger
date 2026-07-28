import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBasePath: process.env.API_BASE_PATH || '/api/v1',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/payment_ledger?replicaSet=rs0',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  idempotency: {
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '86400', 10),
  },

  rateLimit: {
    auth: {
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10),
    },
    transfer: {
      max: parseInt(process.env.RATE_LIMIT_TRANSFER_MAX || '30', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_TRANSFER_WINDOW_MS || '60000', 10),
    },
    read: {
      max: parseInt(process.env.RATE_LIMIT_READ_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_READ_WINDOW_MS || '60000', 10),
    },
  },

  fraud: {
    amountThreshold: parseInt(process.env.FRAUD_AMOUNT_THRESHOLD || '1000000', 10),
    velocityMax: parseInt(process.env.FRAUD_VELOCITY_MAX || '5', 10),
    newAccountDays: parseInt(process.env.FRAUD_NEW_ACCOUNT_DAYS || '7', 10),
    flagScore: parseInt(process.env.FRAUD_FLAG_SCORE || '60', 10),
    blockScore: parseInt(process.env.FRAUD_BLOCK_SCORE || '85', 10),
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },

  worker: {
    enabled: process.env.WORKER_ENABLED === 'true',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    reconciliationCron: process.env.RECONCILIATION_CRON || '0 */6 * * *',
  },
};

export default config;
