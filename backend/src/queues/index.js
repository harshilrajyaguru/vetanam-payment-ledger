import { Queue } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq.config.js';

let notificationQueue = null;
let auditQueue = null;

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s exponential backoff
  },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/**
 * Initialize BullMQ queues.
 */
export function initializeQueues() {
  const connection = getBullMQConnection();

  if (!notificationQueue) {
    notificationQueue = new Queue('notify-transaction', { connection });
  }

  if (!auditQueue) {
    auditQueue = new Queue('audit-log-write', { connection });
  }

  return { notificationQueue, auditQueue };
}

/**
 * Enqueue notification job.
 * @param {Object} data Job payload { transactionId, userId, type }
 * @param {Object} [options] Custom BullMQ job options
 */
export async function enqueueNotificationJob(data, options = {}) {
  try {
    if (!notificationQueue) {
      initializeQueues();
    }
    const jobOpts = { ...DEFAULT_JOB_OPTIONS, ...options };
    return await notificationQueue.add('notify-transaction', data, jobOpts);
  } catch (error) {
    console.error('[Queue] Failed to enqueue notification job:', error.message);
    return null;
  }
}

/**
 * Enqueue audit log job.
 * @param {Object} data Job payload { actorId, action, targetType, targetId, metadata }
 * @param {Object} [options] Custom BullMQ job options
 */
export async function enqueueAuditLogJob(data, options = {}) {
  try {
    if (!auditQueue) {
      initializeQueues();
    }
    const jobOpts = { ...DEFAULT_JOB_OPTIONS, ...options };
    return await auditQueue.add('audit-log-write', data, jobOpts);
  } catch (error) {
    console.error('[Queue] Failed to enqueue audit log job:', error.message);
    return null;
  }
}

/**
 * Close all BullMQ queues gracefully.
 */
export async function closeQueues() {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
  if (auditQueue) {
    await auditQueue.close();
    auditQueue = null;
  }
  console.log('[Queue] All queues closed');
}

export function getQueues() {
  return { notificationQueue, auditQueue };
}
