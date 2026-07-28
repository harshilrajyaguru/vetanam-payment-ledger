import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';
import Transaction from '../../src/models/Transaction.model.js';
import LedgerEntry from '../../src/models/LedgerEntry.model.js';
import IdempotencyKey from '../../src/models/IdempotencyKey.model.js';
import Notification from '../../src/models/Notification.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';
import mongoose from 'mongoose';

describe('Mongoose Models Schema Compilation & Validation Unit Tests', () => {
  describe('User Model', () => {
    it('validates email format', () => {
      const invalidUser = new User({
        email: 'invalid-email',
        passwordHash: 'hash',
        role: 'user',
        status: 'active',
      });
      const err = invalidUser.validateSync();
      expect(err.errors.email).toBeDefined();
    });

    it('validates role enum', () => {
      const invalidUser = new User({
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'superadmin',
      });
      const err = invalidUser.validateSync();
      expect(err.errors.role).toBeDefined();
    });
  });

  describe('Account Model', () => {
    it('rejects negative balance', () => {
      const invalidAccount = new Account({
        userId: new mongoose.Types.ObjectId(),
        currency: 'INR',
        cachedBalance: -500,
      });
      const err = invalidAccount.validateSync();
      expect(err.errors.cachedBalance).toBeDefined();
    });

    it('rejects non-integer float balance', () => {
      const invalidAccount = new Account({
        userId: new mongoose.Types.ObjectId(),
        currency: 'INR',
        cachedBalance: 100.5,
      });
      const err = invalidAccount.validateSync();
      expect(err.errors.cachedBalance).toBeDefined();
    });
  });

  describe('Transaction Model', () => {
    it('requires positive non-zero integer amount', () => {
      const invalidTx = new Transaction({
        senderAccountId: new mongoose.Types.ObjectId(),
        receiverAccountId: new mongoose.Types.ObjectId(),
        amount: 0,
        idempotencyKey: 'key-1',
      });
      const err = invalidTx.validateSync();
      expect(err.errors.amount).toBeDefined();
    });

    it('validates status enum', () => {
      const invalidTx = new Transaction({
        senderAccountId: new mongoose.Types.ObjectId(),
        receiverAccountId: new mongoose.Types.ObjectId(),
        amount: 1000,
        idempotencyKey: 'key-2',
        status: 'INVALID_STATUS',
      });
      const err = invalidTx.validateSync();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('LedgerEntry Model', () => {
    it('requires type to be DEBIT or CREDIT', () => {
      const invalidEntry = new LedgerEntry({
        transactionId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        type: 'INVALID',
        amount: 500,
        balanceAfter: 1500,
      });
      const err = invalidEntry.validateSync();
      expect(err.errors.type).toBeDefined();
    });
  });

  describe('IdempotencyKey Model', () => {
    it('validates status enum', () => {
      const invalidKey = new IdempotencyKey({
        _id: 'key-uuid-1',
        requestHash: 'hash-123',
        status: 'UNKNOWN',
        expiresAt: new Date(),
      });
      const err = invalidKey.validateSync();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('Notification Model', () => {
    it('defaults read to false', () => {
      const notif = new Notification({
        userId: new mongoose.Types.ObjectId(),
        transactionId: new mongoose.Types.ObjectId(),
        type: 'TXN_COMPLETED',
      });
      expect(notif.read).toBe(false);
    });
  });

  describe('AuditLog Model', () => {
    it('requires action and target details', () => {
      const invalidLog = new AuditLog({});
      const err = invalidLog.validateSync();
      expect(err.errors.action).toBeDefined();
      expect(err.errors.targetType).toBeDefined();
      expect(err.errors.targetId).toBeDefined();
    });
  });
});
