import Transaction from '../models/Transaction.model.js';

export class TransactionRepository {
  /**
   * Create a new transaction document.
   * @param {Object} transactionData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(transactionData, session = null) {
    const options = session ? { session } : {};
    const [transaction] = await Transaction.create([transactionData], options);
    return transaction;
  }

  /**
   * Find transaction by ID.
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async findById(id, session = null) {
    return Transaction.findById(id).session(session);
  }

  /**
   * Find transaction by client idempotency key.
   * @param {string} idempotencyKey
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByIdempotencyKey(idempotencyKey, session = null) {
    return Transaction.findOne({ idempotencyKey }).session(session);
  }

  /**
   * Update transaction status and optional metadata (riskScore, failureReason).
   * @param {string} id
   * @param {'PENDING'|'PROCESSING'|'COMPLETED'|'FAILED'|'FLAGGED'|'REVERSED'} status
   * @param {Object} [extraFields={}]
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateStatus(id, status, extraFields = {}, session = null) {
    return Transaction.findByIdAndUpdate(
      id,
      { status, ...extraFields },
      { new: true, runValidators: true, session },
    );
  }

  /**
   * Get paginated transaction history for a given account ID (sender or receiver).
   * @param {string} accountId
   * @param {Object} pagination
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=10]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findHistoryByAccountId(accountId, { page = 1, limit = 10 } = {}, session = null) {
    if (!accountId) {
      return { transactions: [], total: 0, page, limit, totalPages: 0 };
    }
    const query = {
      $or: [{ senderAccountId: accountId }, { receiverAccountId: accountId }],
    };
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).session(session),
      Transaction.countDocuments(query).session(session),
    ]);
    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) || 0 };
  }

  /**
   * Find transactions with general pagination and status/date filtering.
   * @param {Object} filterQuery
   * @param {Object} pagination
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=10]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findPaginated(filterQuery = {}, { page = 1, limit = 10 } = {}, session = null) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Transaction.find(filterQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session),
      Transaction.countDocuments(filterQuery).session(session),
    ]);
    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export default new TransactionRepository();
