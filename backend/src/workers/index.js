import { startNotificationWorker, stopNotificationWorker } from './notification.worker.js';
import { startAuditWorker, stopAuditWorker } from './auditLogWrite.worker.js';

let isRunning = false;

/**
 * Start all BullMQ worker processors.
 */
export function startWorkers() {
  if (isRunning) return;

  startNotificationWorker();
  startAuditWorker();
  isRunning = true;
  console.log('[Workers] All BullMQ background workers started');
}

/**
 * Stop all BullMQ worker processors gracefully.
 */
export async function stopWorkers() {
  if (!isRunning) return;

  await Promise.all([stopNotificationWorker(), stopAuditWorker()]);
  isRunning = false;
  console.log('[Workers] All BullMQ background workers stopped');
}
