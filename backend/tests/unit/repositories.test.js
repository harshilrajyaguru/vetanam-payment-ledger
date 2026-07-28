import userRepository from '../../src/repositories/user.repository.js';
import accountRepository from '../../src/repositories/account.repository.js';
import transactionRepository from '../../src/repositories/transaction.repository.js';
import ledgerEntryRepository from '../../src/repositories/ledgerEntry.repository.js';
import idempotencyKeyRepository from '../../src/repositories/idempotencyKey.repository.js';
import notificationRepository from '../../src/repositories/notification.repository.js';
import auditLogRepository from '../../src/repositories/auditLog.repository.js';

describe('Repository Classes Unit Test Exports & Structure', () => {
  it('exposes UserRepository methods', () => {
    expect(typeof userRepository.create).toBe('function');
    expect(typeof userRepository.findById).toBe('function');
    expect(typeof userRepository.findByEmail).toBe('function');
    expect(typeof userRepository.updateStatus).toBe('function');
    expect(typeof userRepository.findPaginated).toBe('function');
  });

  it('exposes AccountRepository methods', () => {
    expect(typeof accountRepository.create).toBe('function');
    expect(typeof accountRepository.findById).toBe('function');
    expect(typeof accountRepository.findByUserId).toBe('function');
    expect(typeof accountRepository.updateBalanceWithVersion).toBe('function');
    expect(typeof accountRepository.updateStatus).toBe('function');
  });

  it('exposes TransactionRepository methods', () => {
    expect(typeof transactionRepository.create).toBe('function');
    expect(typeof transactionRepository.findById).toBe('function');
    expect(typeof transactionRepository.findByIdempotencyKey).toBe('function');
    expect(typeof transactionRepository.updateStatus).toBe('function');
    expect(typeof transactionRepository.findHistoryByAccountId).toBe('function');
    expect(typeof transactionRepository.findPaginated).toBe('function');
  });

  it('exposes LedgerEntryRepository methods', () => {
    expect(typeof ledgerEntryRepository.create).toBe('function');
    expect(typeof ledgerEntryRepository.createMany).toBe('function');
    expect(typeof ledgerEntryRepository.findByTransactionId).toBe('function');
    expect(typeof ledgerEntryRepository.findByAccountId).toBe('function');
  });

  it('exposes IdempotencyKeyRepository methods', () => {
    expect(typeof idempotencyKeyRepository.create).toBe('function');
    expect(typeof idempotencyKeyRepository.findByKey).toBe('function');
    expect(typeof idempotencyKeyRepository.updateStatusAndSnapshot).toBe('function');
    expect(typeof idempotencyKeyRepository.deleteByKey).toBe('function');
  });

  it('exposes NotificationRepository methods', () => {
    expect(typeof notificationRepository.create).toBe('function');
    expect(typeof notificationRepository.findByUserId).toBe('function');
    expect(typeof notificationRepository.markAsRead).toBe('function');
  });

  it('exposes AuditLogRepository methods', () => {
    expect(typeof auditLogRepository.create).toBe('function');
    expect(typeof auditLogRepository.findPaginated).toBe('function');
    expect(typeof auditLogRepository.findByActorId).toBe('function');
  });
});
