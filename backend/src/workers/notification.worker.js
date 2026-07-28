import { Worker } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq.config.js';
import notificationRepository from '../repositories/notification.repository.js';
import Notification from '../models/Notification.model.js';

let notificationWorker = null;

/**
 * Processor function for notification jobs.
 * @param {import('bullmq').Job} job
 */
export async function processNotificationJob(job) {
  const { transactionId, userId, type } = job.data;

  if (!transactionId || !userId || !type) {
    throw new Error(`Invalid notification job payload: ${JSON.stringify(job.data)}`);
  }

  // Idempotency check: avoid creating duplicate notification for the same event
  const existing = await Notification.findOne({ transactionId, userId, type });
  if (existing) {
    console.log(`[Worker:Notification] Notification already exists for job ${job.id}`);
    return existing;
  }

  const notification = await notificationRepository.create({
    userId,
    transactionId,
    type,
    read: false,
  });

  console.log(`[Worker:Notification] Processed notification job ${job.id} for user ${userId}`);
  return notification;
}

/**
 * Start the notification worker.
 */
export function startNotificationWorker() {
  if (notificationWorker) return notificationWorker;

  const connection = getBullMQConnection();
  notificationWorker = new Worker('notify-transaction', processNotificationJob, {
    connection,
    concurrency: 5,
  });

  notificationWorker.on('completed', (job) => {
    console.log(`[Worker:Notification] Job ${job.id} completed successfully`);
  });

  notificationWorker.on('failed', (job, err) => {
    console.error(`[Worker:Notification] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  return notificationWorker;
}

/**
 * Stop the notification worker.
 */
export async function stopNotificationWorker() {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
    console.log('[Worker:Notification] Worker stopped');
  }
}
