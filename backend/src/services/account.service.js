import crypto from 'crypto';
import accountRepository from '../repositories/account.repository.js';
import userRepository from '../repositories/user.repository.js';
import transactionRepository from '../repositories/transaction.repository.js';
import ledgerEntryRepository from '../repositories/ledgerEntry.repository.js';
import auditLogRepository from '../repositories/auditLog.repository.js';
import { AppError } from '../utils/AppError.js';

/**
 * AccountService — handles wallet account operations.
 * Works on standalone MongoDB instances (no replica set / sessions required).
 */
export class AccountService {
  /**
   * Get user's wallet account details.
   * @param {string} userId
   * @returns {Promise<Object>} Account document
   */
  async getUserAccount(userId) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) {
      throw new AppError('ACCOUNT_NOT_FOUND', 'Wallet account not found for user', 404);
    }
    return account;
  }

  /**
   * Deposit funds to user account via double-entry ledger.
   * No MongoDB transactions required — uses optimistic version locking.
   * @param {string} userId
   * @param {Object} params
   * @param {number} params.amount Deposit amount in minor units
   * @param {string} [params.description]
   */
  async depositFunds(userId, { amount, description }) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('AMOUNT_INVALID', 'Deposit amount must be a positive integer in minor units', 422);
    }

    const account = await accountRepository.findByUserId(userId);
    if (!account) {
      throw new AppError('ACCOUNT_NOT_FOUND', 'Wallet account not found for user', 404);
    }

    if (account.status === 'frozen') {
      throw new AppError('ACCOUNT_FROZEN', 'Cannot deposit to a frozen account', 403);
    }

    const newBalance = account.cachedBalance + amount;
    const idempotencyKey = `dep_${crypto.randomUUID()}`;

    // 1. Update account balance FIRST with optimistic version locking
    const updatedAccount = await accountRepository.updateBalanceWithVersion(
      account._id,
      newBalance,
      account.version,
    );

    if (!updatedAccount) {
      throw new AppError(
        'CONCURRENCY_CONFLICT',
        'Optimistic concurrency conflict while updating account balance. Please retry.',
        409,
      );
    }

    // 2. Create transaction document with COMPLETED status
    const transaction = await transactionRepository.create({
      senderAccountId: account._id,
      receiverAccountId: account._id,
      amount,
      status: 'COMPLETED',
      idempotencyKey,
      description,
    });

    // 3. Create ledger credit entry
    const createdEntries = await ledgerEntryRepository.createMany([
      {
        transactionId: transaction._id,
        accountId: account._id,
        type: 'CREDIT',
        amount,
        balanceAfter: newBalance,
      },
    ]);

    // 4. Create notification for deposit
    const { default: notificationRepository } = await import('../repositories/notification.repository.js');
    await notificationRepository.create({
      userId,
      transactionId: transaction._id,
      type: 'ACCOUNT_DEPOSIT',
      read: false,
    }).catch(() => {});

    // 5. Record audit log
    try {
      await auditLogRepository.create({
        actorId: userId,
        action: 'ACCOUNT_DEPOSIT',
        targetType: 'Account',
        targetId: account._id,
        metadata: { amount, newBalance, transactionId: transaction._id },
      });
    } catch {
      /* silent audit error */
    }

    return {
      account: {
        id: updatedAccount._id.toString(),
        userId: updatedAccount.userId.toString(),
        currency: updatedAccount.currency,
        cachedBalance: updatedAccount.cachedBalance,
        status: updatedAccount.status,
      },
      transaction,
      ledgerEntry: createdEntries[0],
    };
  }

  /**
   * Toggle account freeze/unfreeze status (Admin capability).
   * @param {string} targetUserId
   * @param {Object} params
   * @param {'freeze'|'unfreeze'} params.action
   * @param {string} params.actorId
   */
  async toggleAccountFreeze(targetUserId, { action, actorId }) {
    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Target user not found', 404);
    }

    const account = await accountRepository.findByUserId(targetUserId);
    if (!account) {
      throw new AppError('ACCOUNT_NOT_FOUND', 'Wallet account not found for target user', 404);
    }

    const newStatus = action === 'freeze' ? 'frozen' : 'active';
    await userRepository.updateStatus(targetUserId, newStatus);
    await accountRepository.updateStatus(account._id, newStatus);

    await auditLogRepository.create({
      actorId,
      action: action === 'freeze' ? 'ACCOUNT_FROZEN' : 'ACCOUNT_UNFROZEN',
      targetType: 'Account',
      targetId: account._id,
      metadata: { targetUserId, action },
    });

    return {
      userId: targetUserId,
      accountId: account._id.toString(),
      status: newStatus,
    };
  }
}

export default new AccountService();
