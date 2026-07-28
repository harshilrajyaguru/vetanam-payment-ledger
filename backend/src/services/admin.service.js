import userRepository from '../repositories/user.repository.js';
import accountRepository from '../repositories/account.repository.js';
import transactionRepository from '../repositories/transaction.repository.js';
import auditLogRepository from '../repositories/auditLog.repository.js';
import ledgerService from './ledger.service.js';
import { enqueueNotificationJob, enqueueAuditLogJob } from '../queues/index.js';
import { AppError } from '../utils/AppError.js';

export class AdminService {
  /**
   * Get paginated user list with populated wallet account balance and status.
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.search='']
   */
  async getUsersPaginated({ page = 1, limit = 10, search = '' } = {}) {
    const result = await userRepository.findPaginated({ page, limit, search });

    const usersWithAccounts = await Promise.all(
      result.users.map(async (userDoc) => {
        const account = await accountRepository.findByUserId(userDoc._id);
        const userObj = userDoc.toObject ? userDoc.toObject() : userDoc;
        delete userObj.passwordHash;
        return {
          ...userObj,
          account: account
            ? {
                id: account._id.toString(),
                cachedBalance: account.cachedBalance,
                currency: account.currency,
                status: account.status,
              }
            : null,
        };
      }),
    );

    return {
      users: usersWithAccounts,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get global transaction list filtered by status, userId, or date range.
   * @param {Object} filters
   * @param {number} [filters.page=1]
   * @param {number} [filters.limit=10]
   * @param {string} [filters.status]
   * @param {string} [filters.userId]
   * @param {string} [filters.startDate]
   * @param {string} [filters.endDate]
   */
  async getTransactionsPaginated({
    page = 1,
    limit = 10,
    status,
    userId,
    startDate,
    endDate,
  } = {}) {
    const query = {};

    if (status) {
      query.status = status;
    }

    if (userId) {
      const account = await accountRepository.findByUserId(userId);
      if (account) {
        query.$or = [{ senderAccountId: account._id }, { receiverAccountId: account._id }];
      } else {
        return { transactions: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    return transactionRepository.findPaginated(query, { page, limit });
  }

  /**
   * Approve or reject a FLAGGED transaction (Admin override).
   * @param {string} transactionId
   * @param {Object} params
   * @param {'approve'|'reject'} params.decision
   * @param {string} params.adminUserId
   */
  async reviewFlaggedTransaction(transactionId, { decision, adminUserId }) {
    const transaction = await transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new AppError('TRANSACTION_NOT_FOUND', 'Transaction not found', 404);
    }

    if (transaction.status !== 'FLAGGED') {
      throw new AppError('INVALID_TRANSACTION_STATE', 'Only FLAGGED transactions can be reviewed', 400);
    }

    if (decision === 'approve') {
      // 1. Execute Double-Entry Ledger Posting
      await ledgerService.executeLedgerTransaction({
        transactionId: transaction._id.toString(),
        senderAccountId: transaction.senderAccountId.toString(),
        receiverAccountId: transaction.receiverAccountId.toString(),
        amount: transaction.amount,
      });

      // 2. Transition transaction status to COMPLETED
      const updatedTx = await transactionRepository.updateStatus(transaction._id, 'COMPLETED');

      const senderAccount = await accountRepository.findById(transaction.senderAccountId);
      const receiverAccount = await accountRepository.findById(transaction.receiverAccountId);

      // Async background notifications & audit logging
      if (senderAccount) {
        enqueueNotificationJob({
          transactionId: updatedTx._id.toString(),
          userId: senderAccount.userId.toString(),
          type: 'TXN_COMPLETED',
        }).catch(() => {});
      }

      if (receiverAccount) {
        enqueueNotificationJob({
          transactionId: updatedTx._id.toString(),
          userId: receiverAccount.userId.toString(),
          type: 'TXN_COMPLETED',
        }).catch(() => {});
      }

      enqueueAuditLogJob({
        actorId: adminUserId,
        action: 'ADMIN_APPROVED_TRANSACTION',
        targetType: 'Transaction',
        targetId: updatedTx._id,
        metadata: { amount: updatedTx.amount },
      }).catch(() => {});

      return updatedTx;
    }

    if (decision === 'reject') {
      const updatedTx = await transactionRepository.updateStatus(transaction._id, 'FAILED', {
        failureReason: 'REJECTED_BY_ADMIN',
      });

      const senderAccount = await accountRepository.findById(transaction.senderAccountId);

      if (senderAccount) {
        enqueueNotificationJob({
          transactionId: updatedTx._id.toString(),
          userId: senderAccount.userId.toString(),
          type: 'TXN_FAILED',
        }).catch(() => {});
      }

      enqueueAuditLogJob({
        actorId: adminUserId,
        action: 'ADMIN_REJECTED_TRANSACTION',
        targetType: 'Transaction',
        targetId: updatedTx._id,
        metadata: { failureReason: 'REJECTED_BY_ADMIN' },
      }).catch(() => {});

      return updatedTx;
    }

    throw new AppError('INVALID_DECISION', 'Review decision must be approve or reject', 400);
  }

  /**
   * Get paginated audit logs.
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {string} [params.action]
   * @param {string} [params.targetType]
   */
  async getAuditLogsPaginated({ page = 1, limit = 20, action, targetType } = {}) {
    return auditLogRepository.findPaginated({ page, limit, action, targetType });
  }
}

export default new AdminService();
