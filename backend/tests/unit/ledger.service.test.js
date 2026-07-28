import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ledgerService from '../../src/services/ledger.service.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import LedgerEntry from '../../src/models/LedgerEntry.model.js';
import ledgerEntryRepository from '../../src/repositories/ledgerEntry.repository.js';
import accountRepository from '../../src/repositories/account.repository.js';

let mongoServer;

jest.setTimeout(60000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);

describe('LedgerService - Double-Entry Engine', () => {
  let senderUser;
  let receiverUser;
  let senderAccount;
  let receiverAccount;
  const amount = 300;

  beforeEach(async () => {
    await User.deleteMany({});
    await Account.deleteMany({});
    await Transaction.deleteMany({});
    await LedgerEntry.deleteMany({});

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
      cachedBalance: 1000,
      version: 0,
      status: 'active',
    });

    receiverAccount = await Account.create({
      userId: receiverUser._id,
      currency: 'INR',
      cachedBalance: 500,
      version: 0,
      status: 'active',
    });
  });

  it('✓ Successful ledger transaction', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-succ-1',
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount,
      currency: 'INR',
      status: 'PROCESSING',
    });

    const result = await ledgerService.executeLedgerTransaction({
      transactionId: tx._id.toString(),
      senderAccountId: senderAccount._id.toString(),
      receiverAccountId: receiverAccount._id.toString(),
      amount,
    });

    expect(result.senderBalanceAfter).toBe(700);
    expect(result.receiverBalanceAfter).toBe(800);
    expect(result.debitEntry.type).toBe('DEBIT');
    expect(result.debitEntry.amount).toBe(300);
    expect(result.debitEntry.balanceAfter).toBe(700);
    expect(result.creditEntry.type).toBe('CREDIT');
    expect(result.creditEntry.amount).toBe(300);
    expect(result.creditEntry.balanceAfter).toBe(800);

    // Verify DB state
    const updatedSender = await Account.findById(senderAccount._id);
    const updatedReceiver = await Account.findById(receiverAccount._id);
    expect(updatedSender.cachedBalance).toBe(700);
    expect(updatedSender.version).toBe(1);
    expect(updatedReceiver.cachedBalance).toBe(800);
    expect(updatedReceiver.version).toBe(1);

    const entries = await LedgerEntry.find({ transactionId: tx._id });
    expect(entries.length).toBe(2);
  });

  it('✓ Double-entry invariant: total debits == total credits', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-inv-1',
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount: 400,
      currency: 'INR',
      status: 'PROCESSING',
    });

    await ledgerService.executeLedgerTransaction({
      transactionId: tx._id.toString(),
      senderAccountId: senderAccount._id.toString(),
      receiverAccountId: receiverAccount._id.toString(),
      amount: 400,
    });

    const entries = await LedgerEntry.find({ transactionId: tx._id });
    const debitSum = entries
      .filter((e) => e.type === 'DEBIT')
      .reduce((acc, e) => acc + e.amount, 0);
    const creditSum = entries
      .filter((e) => e.type === 'CREDIT')
      .reduce((acc, e) => acc + e.amount, 0);

    expect(debitSum).toBe(400);
    expect(creditSum).toBe(400);
    expect(debitSum).toEqual(creditSum);
  });

  it('✓ Insufficient balance', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-insuf-1',
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount: 5000, // exceeds sender 1000
      currency: 'INR',
      status: 'PROCESSING',
    });

    await expect(
      ledgerService.executeLedgerTransaction({
        transactionId: tx._id.toString(),
        senderAccountId: senderAccount._id.toString(),
        receiverAccountId: receiverAccount._id.toString(),
        amount: 5000,
      }),
    ).rejects.toThrow('Sender account has insufficient funds for this transfer');

    // Verify 0 mutations committed (insufficient check happens before writes)
    const sender = await Account.findById(senderAccount._id);
    const entries = await LedgerEntry.find({ transactionId: tx._id });
    expect(sender.cachedBalance).toBe(1000);
    expect(entries.length).toBe(0);
  });

  it('✓ Sender equals receiver', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-self-1',
      senderAccountId: senderAccount._id,
      receiverAccountId: senderAccount._id,
      amount: 100,
      currency: 'INR',
      status: 'PROCESSING',
    });

    await expect(
      ledgerService.executeLedgerTransaction({
        transactionId: tx._id.toString(),
        senderAccountId: senderAccount._id.toString(),
        receiverAccountId: senderAccount._id.toString(),
        amount: 100,
      }),
    ).rejects.toThrow('Sender and receiver accounts cannot be the same');
  });

  it('✓ Invalid account', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const tx = await Transaction.create({
      idempotencyKey: 'tx-invalid-1',
      senderAccountId: senderAccount._id,
      receiverAccountId: fakeId,
      amount: 100,
      currency: 'INR',
      status: 'PROCESSING',
    });

    await expect(
      ledgerService.executeLedgerTransaction({
        transactionId: tx._id.toString(),
        senderAccountId: senderAccount._id.toString(),
        receiverAccountId: fakeId,
        amount: 100,
      }),
    ).rejects.toThrow('Receiver account not found');
  });

  it('✓ Optimistic concurrency conflict on sender update', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-occ-1',
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount: 200,
      currency: 'INR',
      status: 'PROCESSING',
    });

    // Simulate version conflict where updateBalanceWithVersion returns null
    const spy = jest
      .spyOn(accountRepository, 'updateBalanceWithVersion')
      .mockResolvedValueOnce(null);

    await expect(
      ledgerService.executeLedgerTransaction({
        transactionId: tx._id.toString(),
        senderAccountId: senderAccount._id.toString(),
        receiverAccountId: receiverAccount._id.toString(),
        amount: 200,
      }),
    ).rejects.toThrow('Optimistic concurrency conflict while updating sender balance');

    spy.mockRestore();

    // Verify balances untouched (balance update was mocked to fail before write)
    const sender = await Account.findById(senderAccount._id);
    const receiver = await Account.findById(receiverAccount._id);
    expect(sender.cachedBalance).toBe(1000);
    expect(receiver.cachedBalance).toBe(500);
  });

  it('✓ Ledger entries not created when createMany throws', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-fail-2nd',
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount: 200,
      currency: 'INR',
      status: 'PROCESSING',
    });

    const spy = jest
      .spyOn(ledgerEntryRepository, 'createMany')
      .mockImplementationOnce(async () => {
        throw new Error('Database disk error during credit entry write');
      });

    await expect(
      ledgerService.executeLedgerTransaction({
        transactionId: tx._id.toString(),
        senderAccountId: senderAccount._id.toString(),
        receiverAccountId: receiverAccount._id.toString(),
        amount: 200,
      }),
    ).rejects.toThrow('Database disk error during credit entry write');

    spy.mockRestore();

    // Verify entries were not created (exception thrown before entries were saved)
    const entries = await LedgerEntry.find({ transactionId: tx._id });
    expect(entries.length).toBe(0);
    // Balances also untouched since entry creation failed before account updates
    const sender = await Account.findById(senderAccount._id);
    expect(sender.cachedBalance).toBe(1000);
  });

  it('✓ Account lookup throws unexpected error', async () => {
    const tx = await Transaction.create({
      idempotencyKey: 'tx-unexp-err',
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount: 150,
      currency: 'INR',
      status: 'PROCESSING',
    });

    const spy = jest.spyOn(accountRepository, 'findById').mockImplementationOnce(async () => {
      throw new Error('Connection reset by peer');
    });

    await expect(
      ledgerService.executeLedgerTransaction({
        transactionId: tx._id.toString(),
        senderAccountId: senderAccount._id.toString(),
        receiverAccountId: receiverAccount._id.toString(),
        amount: 150,
      }),
    ).rejects.toThrow('Connection reset by peer');

    spy.mockRestore();

    const entries = await LedgerEntry.find({ transactionId: tx._id });
    expect(entries.length).toBe(0);
  });
});
