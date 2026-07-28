import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import LedgerEntry from '../../src/models/LedgerEntry.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';
import { signAccessToken } from '../../src/utils/jwt.js';

let replSet;
let app;
let adminUser;
let regularUser;
let targetUser;
let adminToken;
let userToken;
let adminAccount;
let targetAccount;

jest.setTimeout(30000);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
  app = createApp();
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
}, 30000);

beforeEach(async () => {
  await User.deleteMany({});
  await Account.deleteMany({});
  await Transaction.deleteMany({});
  await LedgerEntry.deleteMany({});
  await AuditLog.deleteMany({});

  adminUser = await User.create({ email: 'admin@system.com', passwordHash: 'hash', role: 'admin' });
  regularUser = await User.create({ email: 'user@system.com', passwordHash: 'hash', role: 'user' });
  targetUser = await User.create({ email: 'target@system.com', passwordHash: 'hash', role: 'user' });

  adminAccount = await Account.create({
    userId: adminUser._id,
    currency: 'INR',
    cachedBalance: 100000,
    status: 'active',
  });

  targetAccount = await Account.create({
    userId: targetUser._id,
    currency: 'INR',
    cachedBalance: 50000,
    status: 'active',
  });

  adminToken = signAccessToken({ id: adminUser._id.toString(), role: 'admin' });
  userToken = signAccessToken({ id: regularUser._id.toString(), role: 'user' });
});

describe('Admin Operations & Auditing APIs Integration Tests', () => {
  it('GET /api/v1/admin/users - denies regular user (HTTP 403) and allows admin (HTTP 200)', async () => {
    const userRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(userRes.status).toBe(403);
    expect(userRes.body.error.code).toBe('FORBIDDEN');

    const adminRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.data.users.length).toBe(3);
  });

  it('PATCH /api/v1/admin/users/:id/freeze - freezes user account and updates status', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${targetUser._id}/freeze`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'freeze' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('frozen');

    const updatedAccount = await Account.findById(targetAccount._id);
    expect(updatedAccount.status).toBe('frozen');

    const logs = await AuditLog.find({ action: 'ACCOUNT_FROZEN' });
    expect(logs.length).toBe(1);
  });

  it('GET /api/v1/admin/transactions - returns global transactions filtered by status', async () => {
    await Transaction.create({
      idempotencyKey: 'ik_admin_1',
      senderAccountId: adminAccount._id,
      receiverAccountId: targetAccount._id,
      amount: 1000,
      currency: 'INR',
      status: 'COMPLETED',
    });

    await Transaction.create({
      idempotencyKey: 'ik_admin_2',
      senderAccountId: adminAccount._id,
      receiverAccountId: targetAccount._id,
      amount: 2000,
      currency: 'INR',
      status: 'FLAGGED',
    });

    const res = await request(app)
      .get('/api/v1/admin/transactions?status=FLAGGED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBe(1);
    expect(res.body.data.transactions[0].status).toBe('FLAGGED');
  });

  it('PATCH /api/v1/admin/transactions/:id/review - approves FLAGGED transaction and executes double-entry posting', async () => {
    const flaggedTx = await Transaction.create({
      idempotencyKey: 'ik_flag_review_1',
      senderAccountId: adminAccount._id,
      receiverAccountId: targetAccount._id,
      amount: 10000,
      currency: 'INR',
      status: 'FLAGGED',
      riskScore: 65,
    });

    const res = await request(app)
      .patch(`/api/v1/admin/transactions/${flaggedTx._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.data.transaction.status).toBe('COMPLETED');

    // Verify 2 ledger entries were posted
    const entries = await LedgerEntry.find({ transactionId: flaggedTx._id });
    expect(entries.length).toBe(2);

    // Verify balance updates
    const sender = await Account.findById(adminAccount._id);
    const receiver = await Account.findById(targetAccount._id);

    expect(sender.cachedBalance).toBe(90000);
    expect(receiver.cachedBalance).toBe(60000);
  });

  it('PATCH /api/v1/admin/transactions/:id/review - rejects FLAGGED transaction and sets FAILED status', async () => {
    const flaggedTx = await Transaction.create({
      idempotencyKey: 'ik_flag_review_2',
      senderAccountId: adminAccount._id,
      receiverAccountId: targetAccount._id,
      amount: 10000,
      currency: 'INR',
      status: 'FLAGGED',
      riskScore: 70,
    });

    const res = await request(app)
      .patch(`/api/v1/admin/transactions/${flaggedTx._id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.data.transaction.status).toBe('FAILED');
    expect(res.body.data.transaction.failureReason).toBe('REJECTED_BY_ADMIN');

    // Verify 0 ledger entries were created
    const entries = await LedgerEntry.find({ transactionId: flaggedTx._id });
    expect(entries.length).toBe(0);
  });

  it('GET /api/v1/admin/audit-logs - returns paginated audit log entries', async () => {
    await AuditLog.create({
      actorId: adminUser._id,
      action: 'ADMIN_TEST',
      targetType: 'User',
      targetId: targetUser._id,
    });

    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.auditLogs.length).toBe(1);
    expect(res.body.data.auditLogs[0].action).toBe('ADMIN_TEST');
  });
});
