import { getDatabaseStatus } from '../config/database.js';
import { getRedisStatus } from '../config/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getHealth = asyncHandler(async (_req, res) => {
  const mongoStatus = getDatabaseStatus();
  const redisStatus = getRedisStatus();

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
        queues: {
          notificationQueue: 'ready',
          auditQueue: 'ready',
        },
      },
    },
  });
});
