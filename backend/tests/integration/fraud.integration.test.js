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
let senderUser;
let receiverUser;
let senderAccount;
let receiverAccount;
let senderToken;

jest.setTimeout(60000);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
  app = createApp();
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
}, 60000);

beforeEach(async () => {
  await User.deleteMany({});
  await Account.deleteMany({});
  await Transaction.deleteMany({});
  await LedgerEntry.deleteMany({});
  await AuditLog.deleteMany({});

  senderUser = await User.create({ email: 's@fraud.com', passwordHash: 'hash', role: 'user' });
  receiverUser = await User.create({ email: 'r@fraud.com', passwordHash: 'hash', role: 'user' });

  senderAccount = await Account.create({
    userId: senderUser._id,
    currency: 'INR',
    cachedBalance: 1000000,
    status: 'active',
  });

  receiverAccount = await Account.create({
    userId: receiverUser._id,
    currency: 'INR',
    cachedBalance: 5000,
    status: 'active',
  });

  senderToken = signAccessToken({ id: senderUser._id.toString(), role: 'user' });
});

describe('Fraud Engine Integration Tests', () => {
  it('✓ ledger executed when ALLOW', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'r@fraud.com',
        amount: 500,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.status).toBe('COMPLETED');

    const entries = await LedgerEntry.find({ transactionId: res.body.data.transaction.id });
    expect(entries.length).toBe(2);

    const auditLogs = await AuditLog.find({ action: 'FRAUD_EVALUATION' });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].metadata.decision).toBe('ALLOW');
  });

  it('✓ ledger not executed when BLOCK (HTTP 403)', async () => {
    // Freeze account to trigger immediate BLOCK
    await Account.findByIdAndUpdate(senderAccount._id, { status: 'frozen' });

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'r@fraud.com',
        amount: 500,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FRAUD_BLOCKED');

    // Verify 0 ledger entries were created
    const entries = await LedgerEntry.find({});
    expect(entries.length).toBe(0);

    // Verify sender balance untouched
    const sender = await Account.findById(senderAccount._id);
    expect(sender.cachedBalance).toBe(1000000);
  });

  it('✓ flagged transaction creates FLAGGED record without ledger execution', async () => {
    const fraudService = (await import('../../src/services/fraud.service.js')).default;
    const spy = jest
      .spyOn(fraudService, 'evaluateTransactionRisk')
      .mockResolvedValueOnce({
        decision: 'FLAG',
        riskScore: 65,
        rulesTriggered: ['SUSPICIOUS_VOLUME'],
      });

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'r@fraud.com',
        amount: 2000,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.transaction.status).toBe('FLAGGED');
    expect(res.body.data.transaction.riskScore).toBe(65);

    spy.mockRestore();

    // Verify 0 ledger entries were created for FLAGGED transaction
    const entries = await LedgerEntry.find({});
    expect(entries.length).toBe(0);

    // Verify balances untouched
    const sender = await Account.findById(senderAccount._id);
    expect(sender.cachedBalance).toBe(1000000);
  });
});
