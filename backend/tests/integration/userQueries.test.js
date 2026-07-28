import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import LedgerEntry from '../../src/models/LedgerEntry.model.js';
import Notification from '../../src/models/Notification.model.js';
import { signAccessToken } from '../../src/utils/jwt.js';

let replSet;
let app;
let userA;
let userB;
let accountA;
let accountB;
let tokenA;
let tokenB;
let sampleTx;

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
  await Notification.deleteMany({});

  userA = await User.create({ email: 'usera@query.com', passwordHash: 'hash', role: 'user' });
  userB = await User.create({ email: 'userb@query.com', passwordHash: 'hash', role: 'user' });

  accountA = await Account.create({
    userId: userA._id,
    currency: 'INR',
    cachedBalance: 50000,
    status: 'active',
  });

  accountB = await Account.create({
    userId: userB._id,
    currency: 'INR',
    cachedBalance: 20000,
    status: 'active',
  });

  tokenA = signAccessToken({ id: userA._id.toString(), role: 'user' });
  tokenB = signAccessToken({ id: userB._id.toString(), role: 'user' });

  sampleTx = await Transaction.create({
    idempotencyKey: 'ik_query_test_1',
    senderAccountId: accountA._id,
    receiverAccountId: accountB._id,
    amount: 5000,
    currency: 'INR',
    status: 'COMPLETED',
  });

  await LedgerEntry.create([
    {
      transactionId: sampleTx._id,
      accountId: accountA._id,
      type: 'DEBIT',
      amount: 5000,
      balanceAfter: 45000,
    },
    {
      transactionId: sampleTx._id,
      accountId: accountB._id,
      type: 'CREDIT',
      amount: 5000,
      balanceAfter: 25000,
    },
  ]);

  await Notification.create({
    userId: userA._id,
    transactionId: sampleTx._id,
    type: 'TXN_COMPLETED',
    read: false,
  });
});

describe('User Query APIs Integration Tests', () => {
  it('GET /api/v1/accounts/me - returns caller account profile & balance', async () => {
    const res = await request(app)
      .get('/api/v1/accounts/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.account.userId).toBe(userA._id.toString());
    expect(res.body.data.account.cachedBalance).toBe(50000);
  });

  it('GET /api/v1/transactions - returns caller own transaction history', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions.length).toBe(1);
    expect(res.body.data.transactions[0]._id).toBe(sampleTx._id.toString());
  });

  it('GET /api/v1/transactions/:id - returns transaction details for owner', async () => {
    const res = await request(app)
      .get(`/api/v1/transactions/${sampleTx._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.transaction._id).toBe(sampleTx._id.toString());
  });

  it('GET /api/v1/transactions/:id - denies access to non-owner user (HTTP 403)', async () => {
    const thirdUser = await User.create({ email: 'userc@query.com', passwordHash: 'hash', role: 'user' });
    await Account.create({ userId: thirdUser._id, currency: 'INR', cachedBalance: 0, status: 'active' });
    const tokenC = signAccessToken({ id: thirdUser._id.toString(), role: 'user' });

    const res = await request(app)
      .get(`/api/v1/transactions/${sampleTx._id}`)
      .set('Authorization', `Bearer ${tokenC}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/transactions/:id/ledger - returns debit/credit entries for transaction owner', async () => {
    const res = await request(app)
      .get(`/api/v1/transactions/${sampleTx._id}/ledger`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.entries.length).toBe(2);
  });

  it('GET /api/v1/notifications - returns caller notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications.length).toBe(1);
    expect(res.body.data.notifications[0].type).toBe('TXN_COMPLETED');
  });
});
