import crypto from 'crypto';
import userRepository from '../repositories/user.repository.js';
import accountRepository from '../repositories/account.repository.js';
import transactionRepository from '../repositories/transaction.repository.js';
import idempotencyKeyRepository from '../repositories/idempotencyKey.repository.js';
import ledgerEntryRepository from '../repositories/ledgerEntry.repository.js';
import ledgerService from './ledger.service.js';
import fraudService from './fraud.service.js';
import { enqueueNotificationJob, enqueueAuditLogJob } from '../queues/index.js';
import { AppError } from '../utils/AppError.js';

export class TransactionService {
  /**
   * Process money transfer between accounts with idempotency protection, fraud evaluation, double-entry posting, and background job enqueueing.
   *
   * @param {Object} params
   * @param {string} params.userId Sender's user ID
   * @param {string} [params.recipientEmail] Receiver's email address (preferred)
   * @param {string} [params.receiverAccountId] Receiver's account ID (internal fallback)
   * @param {number} params.amount Transfer amount in minor units
   * @param {string} [params.currency='INR'] Currency code
   * @param {string} [params.description] Optional description
   * @param {string} [params.idempotencyKey] Optional idempotency key
   * @returns {Promise<Object>} Transfer execution result
   */
  async transferMoney({
    userId,
    recipientEmail,
    receiverAccountId,
    amount,
    currency = 'INR',
    description,
    idempotencyKey: inputIdempotencyKey,
  }) {
    const idempotencyKey = inputIdempotencyKey || `ik_${crypto.randomUUID()}`;
    const currencyCode = (currency || 'INR').toUpperCase();

    // 1. Idempotency Check & Guard
    const existingKey = await idempotencyKeyRepository.findByKey(idempotencyKey);
    if (existingKey) {
      if (existingKey.status === 'COMPLETED' && existingKey.responseSnapshot) {
        return existingKey.responseSnapshot;
      }
      if (existingKey.status === 'IN_PROGRESS') {
        throw new AppError(
          'IDEMPOTENCY_CONFLICT',
          'A transaction with this idempotency key is currently in progress',
          409,
        );
      }
    }

    // 2. Lock Idempotency Key in IN_PROGRESS state
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const requestHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          userId,
          recipientEmail,
          receiverAccountId,
          amount,
          currency: currencyCode,
          idempotencyKey,
        }),
      )
      .digest('hex');

    try {
      await idempotencyKeyRepository.create({
        _id: idempotencyKey,
        requestHash,
        status: 'IN_PROGRESS',
        expiresAt,
      });
    } catch {
      const keyDoc = await idempotencyKeyRepository.findByKey(idempotencyKey);
      if (keyDoc) {
        if (keyDoc.status === 'COMPLETED' && keyDoc.responseSnapshot) {
          return keyDoc.responseSnapshot;
        }
        if (keyDoc.status === 'IN_PROGRESS') {
          throw new AppError(
            'IDEMPOTENCY_CONFLICT',
            'A transaction with this idempotency key is currently in progress',
            409,
          );
        }
      }
    }

    // 3. Pre-ledger account validations
    const senderAccount = await accountRepository.findByUserId(userId);
    if (!senderAccount) {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('SENDER_NOT_FOUND', 'Sender wallet account not found', 404);
    }

    // Resolve receiver account via recipientEmail or receiverAccountId
    let receiverAccount = null;
    if (recipientEmail) {
      const recipientUser = await userRepository.findByEmail(recipientEmail);
      if (!recipientUser) {
        await idempotencyKeyRepository.deleteByKey(idempotencyKey);
        throw new AppError('RECEIVER_NOT_FOUND', 'Recipient user not found', 404);
      }

      if (recipientUser._id.toString() === userId.toString()) {
        await idempotencyKeyRepository.deleteByKey(idempotencyKey);
        throw new AppError('TRANSFER_TO_SELF', 'Sender and receiver accounts cannot be the same', 422);
      }

      receiverAccount = await accountRepository.findByUserId(recipientUser._id);
    } else if (receiverAccountId) {
      receiverAccount = await accountRepository.findById(receiverAccountId);
    }

    if (!receiverAccount) {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('RECEIVER_NOT_FOUND', 'Receiver account not found', 404);
    }

    if (senderAccount._id.toString() === receiverAccount._id.toString()) {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('TRANSFER_TO_SELF', 'Sender and receiver accounts cannot be the same', 422);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('AMOUNT_INVALID', 'Transfer amount must be a positive integer in minor units', 422);
    }

    // 4. Fraud Risk Evaluation
    const fraudVerdict = await fraudService.evaluateTransactionRisk({
      senderAccount,
      receiverAccount,
      amount,
      currency: currencyCode,
    });

    if (fraudVerdict.decision === 'BLOCK') {
      const failedTx = await transactionRepository.create({
        idempotencyKey,
        senderAccountId: senderAccount._id,
        receiverAccountId: receiverAccount._id,
        amount,
        currency: currencyCode,
        status: 'FAILED',
        riskScore: fraudVerdict.riskScore,
        failureReason: 'FRAUD_BLOCKED',
        description,
      });

      enqueueAuditLogJob({
        actorId: senderAccount.userId,
        action: 'TRANSFER_BLOCKED_FRAUD',
        targetType: 'Transaction',
        targetId: failedTx._id,
        metadata: { riskScore: fraudVerdict.riskScore, rulesTriggered: fraudVerdict.rulesTriggered },
      }).catch(() => {});

      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('FRAUD_BLOCKED', 'Transaction blocked by fraud engine', 403);
    }

    if (senderAccount.status === 'frozen') {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('ACCOUNT_FROZEN', 'Sender account is frozen', 403);
    }

    if (receiverAccount.status === 'frozen') {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('ACCOUNT_FROZEN', 'Receiver account is frozen', 403);
    }

    if (senderAccount.cachedBalance < amount) {
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw new AppError('INSUFFICIENT_FUNDS', 'Sender account has insufficient funds for this transfer', 409);
    }

    if (fraudVerdict.decision === 'FLAG') {
      const flaggedTx = await transactionRepository.create({
        idempotencyKey,
        senderAccountId: senderAccount._id,
        receiverAccountId: receiverAccount._id,
        amount,
        currency: currencyCode,
        status: 'FLAGGED',
        riskScore: fraudVerdict.riskScore,
        fraudFlags: fraudVerdict.rulesTriggered,
        description,
      });

      enqueueAuditLogJob({
        actorId: senderAccount.userId,
        action: 'TRANSFER_FLAGGED',
        targetType: 'Transaction',
        targetId: flaggedTx._id,
        metadata: { riskScore: fraudVerdict.riskScore, fraudFlags: fraudVerdict.rulesTriggered },
      }).catch(() => {});

      const responseSnapshot = {
        transaction: {
          id: flaggedTx._id.toString(),
          senderAccountId: flaggedTx.senderAccountId.toString(),
          receiverAccountId: flaggedTx.receiverAccountId.toString(),
          amount: flaggedTx.amount,
          currency: flaggedTx.currency,
          status: flaggedTx.status,
          riskScore: flaggedTx.riskScore,
        },
      };

      // Use correct repository method name
      await idempotencyKeyRepository.updateStatusAndSnapshot(idempotencyKey, 'COMPLETED', responseSnapshot);
      return responseSnapshot;
    }

    // 5. Create PENDING Transaction record FIRST so ledger has a valid transactionId
    const pendingTransaction = await transactionRepository.create({
      idempotencyKey,
      senderAccountId: senderAccount._id,
      receiverAccountId: receiverAccount._id,
      amount,
      currency: currencyCode,
      status: 'PENDING',
      riskScore: fraudVerdict.riskScore,
      description,
    });

    // 6. Execute Double-Entry Ledger Posting via LedgerService (requires transactionId)
    let ledgerResult;
    try {
      ledgerResult = await ledgerService.executeLedgerTransaction({
        transactionId: pendingTransaction._id,
        senderAccountId: senderAccount._id,
        receiverAccountId: receiverAccount._id,
        amount,
        currency: currencyCode,
      });
    } catch (err) {
      // Mark transaction FAILED for auditability
      await transactionRepository.updateStatus(pendingTransaction._id, 'FAILED', {
        failureReason: err.message,
      }).catch(() => {});
      await idempotencyKeyRepository.deleteByKey(idempotencyKey);
      throw err;
    }

    // 7. Mark Transaction as COMPLETED
    const completedTransaction = await transactionRepository.updateStatus(
      pendingTransaction._id,
      'COMPLETED',
    );

    const responseSnapshot = {
      transaction: {
        id: pendingTransaction._id.toString(),
        senderAccountId: pendingTransaction.senderAccountId.toString(),
        receiverAccountId: pendingTransaction.receiverAccountId.toString(),
        amount: pendingTransaction.amount,
        currency: pendingTransaction.currency || currencyCode,
        status: completedTransaction ? completedTransaction.status : 'COMPLETED',
      },
      senderBalanceAfter: ledgerResult.senderBalanceAfter,
      receiverBalanceAfter: ledgerResult.receiverBalanceAfter,
    };

    // Save final snapshot in Idempotency Key record
    await idempotencyKeyRepository.updateStatusAndSnapshot(idempotencyKey, 'COMPLETED', responseSnapshot);

    // 8. Non-blocking Asynchronous Side Effects & Direct Notification Fallback
    const { default: notificationRepository } = await import('../repositories/notification.repository.js');
    
    // Create receiver notification directly to guarantee persistence regardless of worker state
    await notificationRepository.create({
      userId: receiverAccount.userId,
      transactionId: pendingTransaction._id,
      type: 'TRANSFER_RECEIVED',
      read: false,
    }).catch(() => {});

    enqueueNotificationJob({
      userId: receiverAccount.userId,
      transactionId: pendingTransaction._id,
      type: 'TRANSFER_RECEIVED',
      amount,
      currency: currencyCode,
    }).catch(() => {});

    enqueueAuditLogJob({
      actorId: senderAccount.userId,
      action: 'TRANSFER_COMPLETED',
      targetType: 'Transaction',
      targetId: pendingTransaction._id,
      metadata: { amount, currency: currencyCode },
    }).catch(() => {});

    return responseSnapshot;
  }

  async getUserTransactions(userId, { page = 1, limit = 10 } = {}) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) {
      return { transactions: [], total: 0, page, totalPages: 0 };
    }

    // Use correct repository method name: findHistoryByAccountId
    const { transactions, total } = await transactionRepository.findHistoryByAccountId(
      account._id,
      { page, limit },
    );

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getTransactionById(transactionId, userId, userRole) {
    const transaction = await transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new AppError('NOT_FOUND', 'Transaction not found', 404);
    }

    if (userRole !== 'admin') {
      const userAccount = await accountRepository.findByUserId(userId);
      if (
        !userAccount ||
        (transaction.senderAccountId.toString() !== userAccount._id.toString() &&
          transaction.receiverAccountId.toString() !== userAccount._id.toString())
      ) {
        throw new AppError('FORBIDDEN', 'Access denied to transaction details', 403);
      }
    }

    return transaction;
  }

  async getTransactionLedger(transactionId, userId, userRole) {
    const transaction = await this.getTransactionById(transactionId, userId, userRole);
    const entries = await ledgerEntryRepository.findByTransactionId(transaction._id);
    return { transaction, entries };
  }
}

export default new TransactionService();
