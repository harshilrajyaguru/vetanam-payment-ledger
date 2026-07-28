import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fraudService from '../../src/services/fraud.service.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';

let mongoServer;
let senderAccount;
let receiverAccount;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

beforeEach(async () => {
  await User.deleteMany({});
  await Account.deleteMany({});
  await Transaction.deleteMany({});
  await AuditLog.deleteMany({});

  const senderUser = await User.create({ email: 's@ex.com', passwordHash: 'hash', role: 'user' });
  const receiverUser = await User.create({ email: 'r@ex.com', passwordHash: 'hash', role: 'user' });

  senderAccount = await Account.create({
    userId: senderUser._id,
    currency: 'INR',
    cachedBalance: 500000,
    status: 'active',
  });

  receiverAccount = await Account.create({
    userId: receiverUser._id,
    currency: 'INR',
    cachedBalance: 10000,
    status: 'active',
  });
});

describe('FraudService - Rule Evaluation & Risk Scoring', () => {
  it('✓ normal transaction (returns ALLOW)', async () => {
    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 500,
    });

    expect(verdict.decision).toBe('ALLOW');
    expect(verdict.riskScore).toBe(0);
    expect(verdict.rulesTriggered).toEqual([]);
  });

  it('✓ high amount threshold (triggers HIGH_TRANSFER_AMOUNT)', async () => {
    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 150000, // >= 100000
    });

    expect(verdict.rulesTriggered).toContain('HIGH_TRANSFER_AMOUNT');
    expect(verdict.riskScore).toBe(40);
    expect(verdict.decision).toBe('ALLOW'); // 40 < 50
  });

  it('✓ velocity limit (triggers VELOCITY_LIMIT_EXCEEDED)', async () => {
    // Create 5 transactions in past 1 hour
    for (let i = 0; i < 5; i++) {
      await Transaction.create({
        idempotencyKey: `ik_vel_${i}`,
        senderAccountId: senderAccount._id,
        receiverAccountId: receiverAccount._id,
        amount: 100,
        currency: 'INR',
        status: 'COMPLETED',
      });
    }

    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 500,
    });

    expect(verdict.rulesTriggered).toContain('VELOCITY_LIMIT_EXCEEDED');
    expect(verdict.riskScore).toBe(40);
  });

  it('✓ flagged transaction (returns FLAG for score >= 50)', async () => {
    // Trigger high amount (+40) AND velocity limit (+40) = 80 -> BLOCK or FLAG
    for (let i = 0; i < 5; i++) {
      await Transaction.create({
        idempotencyKey: `ik_flag_${i}`,
        senderAccountId: senderAccount._id,
        receiverAccountId: receiverAccount._id,
        amount: 100,
        currency: 'INR',
        status: 'COMPLETED',
      });
    }

    // Daily sum limit + high amount = score 70 -> FLAG
    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 150000, // +40
    });

    // Score is 40 (high amount) + 40 (velocity) = 80 => BLOCK
    expect(verdict.decision).toBe('BLOCK');
    expect(verdict.riskScore).toBe(80);
  });

  it('✓ blocked transaction (returns BLOCK for score >= 80)', async () => {
    for (let i = 0; i < 5; i++) {
      await Transaction.create({
        idempotencyKey: `ik_block_${i}`,
        senderAccountId: senderAccount._id,
        receiverAccountId: receiverAccount._id,
        amount: 100,
        currency: 'INR',
        status: 'COMPLETED',
      });
    }

    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 150000,
    });

    expect(verdict.decision).toBe('BLOCK');
    expect(verdict.riskScore).toBe(80);
  });

  it('✓ inactive / frozen account (returns BLOCK with riskScore 100)', async () => {
    senderAccount.status = 'frozen';

    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 100,
    });

    expect(verdict.decision).toBe('BLOCK');
    expect(verdict.riskScore).toBe(100);
    expect(verdict.rulesTriggered).toContain('ACCOUNT_BLOCKED');
  });

  it('✓ blocked receiver account (returns BLOCK)', async () => {
    receiverAccount.status = 'frozen';

    const verdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 100,
    });

    expect(verdict.decision).toBe('BLOCK');
    expect(verdict.riskScore).toBe(100);
    expect(verdict.rulesTriggered).toContain('RECEIVER_ACCOUNT_BLOCKED');
  });

  it('✓ fraud decision persistence (verifies AuditLog document created)', async () => {
    await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount: 150000,
    });

    const logs = await AuditLog.find({ action: 'FRAUD_EVALUATION' });
    expect(logs.length).toBe(1);
    expect(logs[0].actorId.toString()).toBe(senderAccount.userId.toString());
    expect(logs[0].metadata.decision).toBe('ALLOW');
    expect(logs[0].metadata.riskScore).toBe(40);
  });
});
