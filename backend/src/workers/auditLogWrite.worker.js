import { Worker } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq.config.js';
import auditLogRepository from '../repositories/auditLog.repository.js';

let auditWorker = null;

/**
 * Processor function for audit log jobs.
 * @param {import('bullmq').Job} job
 */
export async function processAuditJob(job) {
  const { actorId, action, targetType, targetId, metadata } = job.data;

  if (!action || !targetType || !targetId) {
    throw new Error(`Invalid audit log job payload: ${JSON.stringify(job.data)}`);
  }

  const auditLog = await auditLogRepository.create({
    actorId: actorId || null,
    action,
    targetType,
    targetId,
    metadata: metadata || {},
  });

  console.log(`[Worker:Audit] Processed audit job ${job.id} for action ${action}`);
  return auditLog;
}

/**
 * Start the audit log worker.
 */
export function startAuditWorker() {
  if (auditWorker) return auditWorker;

  const connection = getBullMQConnection();
  auditWorker = new Worker('audit-log-write', processAuditJob, {
    connection,
    concurrency: 5,
  });

  auditWorker.on('completed', (job) => {
    console.log(`[Worker:Audit] Job ${job.id} completed successfully`);
  });

  auditWorker.on('failed', (job, err) => {
    console.error(`[Worker:Audit] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  return auditWorker;
}

/**
 * Stop the audit log worker.
 */
export async function stopAuditWorker() {
  if (auditWorker) {
    await auditWorker.close();
    auditWorker = null;
    console.log('[Worker:Audit] Worker stopped');
  }
}
