import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import LedgerEntry from '../../src/models/LedgerEntry.model.js';
import IdempotencyKey from '../../src/models/IdempotencyKey.model.js';
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
  await IdempotencyKey.deleteMany({});

  senderUser = await User.create({
    email: 'sender@example.com',
    passwordHash: 'hash',
    role: 'user',
  });

  receiverUser = await User.create({
    email: 'receiver@example.com',
    passwordHash: 'hash',
    role: 'user',
  });

  senderAccount = await Account.create({
    userId: senderUser._id,
    currency: 'INR',
    cachedBalance: 5000,
    status: 'active',
  });

  receiverAccount = await Account.create({
    userId: receiverUser._id,
    currency: 'INR',
    cachedBalance: 1000,
    status: 'active',
  });

  senderToken = signAccessToken({ id: senderUser._id.toString(), role: 'user' });
});

describe('POST /api/v1/transfers - Transaction Processing & Idempotency', () => {
  it('✓ successful transfer by recipient email', async () => {
    const idempotencyKey = 'ik_succ_test_100';

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 2000,
        currency: 'INR',
        description: 'Payment for services',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.status).toBe('COMPLETED');
    expect(res.body.data.senderBalanceAfter).toBe(3000);
    expect(res.body.data.receiverBalanceAfter).toBe(3000);

    // Verify DB state
    const updatedSender = await Account.findById(senderAccount._id);
    const updatedReceiver = await Account.findById(receiverAccount._id);
    expect(updatedSender.cachedBalance).toBe(3000);
    expect(updatedReceiver.cachedBalance).toBe(3000);

    const entries = await LedgerEntry.find({ transactionId: res.body.data.transaction.id });
    expect(entries.length).toBe(2);
  });

  it('✓ duplicate idempotency key (returns cached response)', async () => {
    const idempotencyKey = 'ik_dup_test_200';

    // First request
    const firstRes = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 1500,
      });

    expect(firstRes.status).toBe(200);

    // Duplicate request with same idempotency key
    const secondRes = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 1500,
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body).toEqual(firstRes.body);

    // Verify balance was deducted EXACTLY ONCE
    const updatedSender = await Account.findById(senderAccount._id);
    expect(updatedSender.cachedBalance).toBe(3500); // 5000 - 1500
  });

  it('✓ insufficient balance', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', 'ik_insuf_1')
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 100000, // exceeds sender balance
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');

    // Verify balances untouched
    const sender = await Account.findById(senderAccount._id);
    expect(sender.cachedBalance).toBe(5000);
  });

  it('✓ unknown recipient email returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'nobody@unknown.com',
        amount: 500,
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RECEIVER_NOT_FOUND');
  });

  it('✓ self-transfer by email rejected (422)', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'sender@example.com',
        amount: 500,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TRANSFER_TO_SELF');
  });

  it('✓ transaction status transitions (PENDING -> PROCESSING -> COMPLETED)', async () => {
    const idempotencyKey = 'ik_lifecycle_test';

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 1000,
      });

    expect(res.status).toBe(200);

    const txDoc = await Transaction.findById(res.body.data.transaction.id);
    expect(txDoc.status).toBe('COMPLETED');
  });

  it('✓ rollback on ledger failure (marks transaction FAILED)', async () => {
    const ledgerService = (await import('../../src/services/ledger.service.js')).default;
    const spy = jest
      .spyOn(ledgerService, 'executeLedgerTransaction')
      .mockRejectedValueOnce(new Error('Ledger storage engine failure'));

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 1000,
      });

    expect(res.status).toBe(500);

    spy.mockRestore();

    // Verify transaction document was recorded as FAILED
    const failedTx = await Transaction.findOne({ senderAccountId: senderAccount._id });
    expect(failedTx).not.toBeNull();
    expect(failedTx.status).toBe('FAILED');
    expect(failedTx.failureReason).toBe('Ledger storage engine failure');

    // Verify sender balance remains intact
    const sender = await Account.findById(senderAccount._id);
    expect(sender.cachedBalance).toBe(5000);
  });

  it('✓ concurrent duplicate requests (409 IDEMPOTENCY_CONFLICT)', async () => {
    const idempotencyKey = 'ik_concurrent_test';

    // Simulate key already in IN_PROGRESS state
    await IdempotencyKey.create({
      _id: idempotencyKey,
      requestHash: 'hash',
      status: 'IN_PROGRESS',
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        recipientEmail: 'receiver@example.com',
        amount: 500,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('✓ invalid email format returns 400 validation error', async () => {
    const res = await request(app)
      .post('/api/v1/transfers')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({
        recipientEmail: 'not-an-email',
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
