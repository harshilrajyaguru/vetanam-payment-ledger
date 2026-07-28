import accountRepository from '../repositories/account.repository.js';
import ledgerEntryRepository from '../repositories/ledgerEntry.repository.js';
import { AppError } from '../utils/AppError.js';

/**
 * LedgerService — executes double-entry balance posting without MongoDB sessions.
 *
 * Works on standalone MongoDB instances (no replica set required).
 * Concurrency safety is achieved via optimistic version locking in accountRepository.
 */
export class LedgerService {
  /**
   * Execute double-entry posting using sequential atomic writes.
   *
   * @param {Object} params
   * @param {string} params.transactionId Parent transaction ID
   * @param {string} params.senderAccountId Sender account ID
   * @param {string} params.receiverAccountId Receiver account ID
   * @param {number} params.amount Transfer amount in minor units (must be integer > 0)
   * @returns {Promise<Object>} Object containing updated balances and ledger entries
   */
  async executeLedgerTransaction({
    transactionId,
    senderAccountId,
    receiverAccountId,
    amount,
  }) {
    // Invariant 1: Amount must be a positive integer
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError(
        'AMOUNT_INVALID',
        'Transfer amount must be a positive integer in minor units',
        422,
      );
    }

    // Invariant 2: Sender cannot be receiver
    if (senderAccountId.toString() === receiverAccountId.toString()) {
      throw new AppError(
        'TRANSFER_TO_SELF',
        'Sender and receiver accounts cannot be the same',
        422,
      );
    }

    // Fetch both accounts without a session (standalone MongoDB)
    const senderAccount = await accountRepository.findById(senderAccountId);
    if (!senderAccount) {
      throw new AppError('SENDER_NOT_FOUND', 'Sender account not found', 404);
    }
    if (senderAccount.status === 'frozen') {
      throw new AppError('ACCOUNT_FROZEN', 'Sender account is frozen', 403);
    }

    const receiverAccount = await accountRepository.findById(receiverAccountId);
    if (!receiverAccount) {
      throw new AppError('RECEIVER_NOT_FOUND', 'Receiver account not found', 404);
    }
    if (receiverAccount.status === 'frozen') {
      throw new AppError('ACCOUNT_FROZEN', 'Receiver account is frozen', 403);
    }

    // Invariant 5: Authoritative balance re-check
    if (senderAccount.cachedBalance < amount) {
      throw new AppError(
        'INSUFFICIENT_FUNDS',
        'Sender account has insufficient funds for this transfer',
        409,
      );
    }

    // Calculate new balances
    const senderNewBalance = senderAccount.cachedBalance - amount;
    const receiverNewBalance = receiverAccount.cachedBalance + amount;

    // Prepare exactly two ledger entries: DEBIT (sender) and CREDIT (receiver)
    const debitEntry = {
      transactionId,
      accountId: senderAccountId,
      type: 'DEBIT',
      amount,
      balanceAfter: senderNewBalance,
    };

    const creditEntry = {
      transactionId,
      accountId: receiverAccountId,
      type: 'CREDIT',
      amount,
      balanceAfter: receiverNewBalance,
    };

    // Invariant 6: Double-entry invariant check (DEBIT amount == CREDIT amount)
    if (debitEntry.amount !== creditEntry.amount) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Double-entry debit/credit invariant mismatch',
        500,
      );
    }

    // Create ledger entries (no session — standalone MongoDB compatible)
    const createdEntries = await ledgerEntryRepository.createMany([debitEntry, creditEntry]);

    // Invariant 7: Exactly two ledger entries created
    if (!createdEntries || createdEntries.length !== 2) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Failed to generate double-entry pair',
        500,
      );
    }

    // Atomic balance updates with optimistic version locking (no session needed)
    const updatedSender = await accountRepository.updateBalanceWithVersion(
      senderAccountId,
      senderNewBalance,
      senderAccount.version,
    );

    if (!updatedSender) {
      // Concurrency conflict — another operation changed the sender's balance
      throw new AppError(
        'CONCURRENCY_CONFLICT',
        'Optimistic concurrency conflict while updating sender balance. Please retry.',
        409,
      );
    }

    const updatedReceiver = await accountRepository.updateBalanceWithVersion(
      receiverAccountId,
      receiverNewBalance,
      receiverAccount.version,
    );

    if (!updatedReceiver) {
      // Compensating write: restore sender balance
      await accountRepository.updateBalanceWithVersion(
        senderAccountId,
        senderAccount.cachedBalance,
        updatedSender.version,
      );
      throw new AppError(
        'CONCURRENCY_CONFLICT',
        'Optimistic concurrency conflict while updating receiver balance. Please retry.',
        409,
      );
    }

    return {
      debitEntry: createdEntries[0],
      creditEntry: createdEntries[1],
      senderBalanceAfter: updatedSender.cachedBalance,
      receiverBalanceAfter: updatedReceiver.cachedBalance,
    };
  }
}

export default new LedgerService();
