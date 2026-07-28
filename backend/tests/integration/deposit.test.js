import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import LedgerEntry from '../../src/models/LedgerEntry.model.js';

let mongoServer;
let app;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Account.deleteMany({});
  await Transaction.deleteMany({});
  await LedgerEntry.deleteMany({});
});

describe('Deposit API & Double-Entry Ledger Integration', () => {
  const userPayload = {
    email: 'deposituser@example.com',
    password: 'Password123!',
  };

  it('POST /api/v1/accounts/deposit updates MongoDB account balance and double-entry ledger', async () => {
    // 1. Register & Login
    const regRes = await request(app).post('/api/v1/auth/register').send(userPayload);
    expect(regRes.status).toBe(201);

    const loginRes = await request(app).post('/api/v1/auth/login').send(userPayload);
    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.data.accessToken;

    // Verify initial balance is 0
    const initialMeRes = await request(app)
      .get('/api/v1/accounts/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(initialMeRes.body.data.account.cachedBalance).toBe(0);

    // 2. Deposit ₹5,000 (500,000 minor units)
    const depositRes = await request(app)
      .post('/api/v1/accounts/deposit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 500000,
        description: 'Test deposit',
      });

    expect(depositRes.status).toBe(200);
    expect(depositRes.body.success).toBe(true);
    expect(depositRes.body.data.account.cachedBalance).toBe(500000);

    // 3. Verify balance in MongoDB Account collection directly
    const dbAccount = await Account.findOne({ userId: loginRes.body.data.user.id });
    expect(dbAccount.cachedBalance).toBe(500000);

    // 4. Verify GET /api/v1/accounts/me returns updated balance
    const meRes = await request(app)
      .get('/api/v1/accounts/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.body.data.account.cachedBalance).toBe(500000);

    // 5. Verify LedgerEntry CREDIT record
    const ledgerEntries = await LedgerEntry.find({ accountId: dbAccount._id });
    expect(ledgerEntries.length).toBe(1);
    expect(ledgerEntries[0].type).toBe('CREDIT');
    expect(ledgerEntries[0].amount).toBe(500000);
    expect(ledgerEntries[0].balanceAfter).toBe(500000);
  });

  it('rejects single deposit exceeding ₹10,000 (1,000,000 minor units)', async () => {
    await request(app).post('/api/v1/auth/register').send(userPayload);
    const loginRes = await request(app).post('/api/v1/auth/login').send(userPayload);
    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/accounts/deposit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000001, description: 'Over limit deposit' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Maximum deposit per transaction is ₹10,000.');
  });

  it('rejects cumulative deposits exceeding ₹50,000 (5,000,000 minor units)', async () => {
    await request(app).post('/api/v1/auth/register').send(userPayload);
    const loginRes = await request(app).post('/api/v1/auth/login').send(userPayload);
    const accessToken = loginRes.body.data.accessToken;

    // Deposit 5 times ₹10,000 (1,000,000 minor units) = ₹50,000
    for (let i = 0; i < 5; i++) {
      const dep = await request(app)
        .post('/api/v1/accounts/deposit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 1000000, description: `Deposit ${i + 1}` });
      expect(dep.status).toBe(200);
    }

    // Attempt 6th deposit of ₹1 (100 minor units) -> should be rejected
    const failRes = await request(app)
      .post('/api/v1/accounts/deposit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 100, description: 'Exceeding total limit' });

    expect(failRes.status).toBe(400);
    expect(failRes.body.error.message).toContain('Maximum account funding limit of ₹50,000 reached.');
  });
});
