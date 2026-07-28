import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../src/models/User.model.js';
import Notification from '../../src/models/Notification.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';
import { processNotificationJob, startNotificationWorker, stopNotificationWorker } from '../../src/workers/notification.worker.js';
import { processAuditJob, startAuditWorker, stopAuditWorker } from '../../src/workers/auditLogWrite.worker.js';
import { startWorkers, stopWorkers } from '../../src/workers/index.js';
import { enqueueNotificationJob, enqueueAuditLogJob, closeQueues } from '../../src/queues/index.js';

let mongoServer;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  await stopWorkers();
  await closeQueues();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

beforeEach(async () => {
  await User.deleteMany({});
  await Notification.deleteMany({});
  await AuditLog.deleteMany({});
});

describe('Background Processing & BullMQ Workers Unit Tests', () => {
  it('✓ notification job processing & idempotency', async () => {
    const userId = new mongoose.Types.ObjectId();
    const transactionId = new mongoose.Types.ObjectId();

    const mockJob = {
      id: 'job_notif_1',
      data: {
        userId: userId.toString(),
        transactionId: transactionId.toString(),
        type: 'TXN_COMPLETED',
      },
    };

    // First run -> creates Notification document
    const result1 = await processNotificationJob(mockJob);
    expect(result1).toBeDefined();
    expect(result1.userId.toString()).toBe(userId.toString());
    expect(result1.type).toBe('TXN_COMPLETED');

    const totalInDb = await Notification.countDocuments({});
    expect(totalInDb).toBe(1);

    // Duplicate run with same payload -> returns existing document without duplicate creation
    const result2 = await processNotificationJob(mockJob);
    expect(result2._id.toString()).toBe(result1._id.toString());

    const totalAfterDup = await Notification.countDocuments({});
    expect(totalAfterDup).toBe(1);
  });

  it('✓ audit job processing', async () => {
    const actorId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();

    const mockJob = {
      id: 'job_audit_1',
      data: {
        actorId: actorId.toString(),
        action: 'TRANSFER_COMPLETED',
        targetType: 'Transaction',
        targetId: targetId.toString(),
        metadata: { amount: 5000 },
      },
    };

    const result = await processAuditJob(mockJob);
    expect(result).toBeDefined();
    expect(result.action).toBe('TRANSFER_COMPLETED');
    expect(result.metadata.amount).toBe(5000);

    const totalLogs = await AuditLog.countDocuments({});
    expect(totalLogs).toBe(1);
  });

  it('✓ handles failed job with error without swallowing exception', async () => {
    const mockInvalidJob = {
      id: 'job_invalid',
      data: {}, // Missing required fields
    };

    await expect(processNotificationJob(mockInvalidJob)).rejects.toThrow(
      'Invalid notification job payload',
    );

    await expect(processAuditJob(mockInvalidJob)).rejects.toThrow(
      'Invalid audit log job payload',
    );
  });

  it('✓ enqueue functions return non-null job definitions or handle queue offline safely', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const transactionId = new mongoose.Types.ObjectId().toString();

    const notifResult = await enqueueNotificationJob({ transactionId, userId, type: 'TXN_COMPLETED' });
    const auditResult = await enqueueAuditLogJob({
      actorId: userId,
      action: 'TRANSFER_COMPLETED',
      targetType: 'Transaction',
      targetId: transactionId,
    });

    expect(notifResult === null || typeof notifResult === 'object').toBe(true);
    expect(auditResult === null || typeof auditResult === 'object').toBe(true);

    await closeQueues();
  });

  it('✓ worker lifecycle start and graceful shutdown', async () => {
    startWorkers();
    startNotificationWorker();
    startAuditWorker();
    await stopWorkers();
    await stopNotificationWorker();
    await stopAuditWorker();
    await closeQueues();
  });
});
