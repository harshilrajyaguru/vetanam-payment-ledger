import LedgerEntry from '../models/LedgerEntry.model.js';

export class LedgerEntryRepository {
  /**
   * Create a new ledger entry document.
   * @param {Object} entryData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(entryData, session = null) {
    const options = session ? { session } : {};
    const [entry] = await LedgerEntry.create([entryData], options);
    return entry;
  }

  /**
   * Bulk insert double-entry ledger records.
   * @param {Array<Object>} entries
   * @param {import('mongoose').ClientSession} [session]
   */
  async createMany(entries, session = null) {
    const options = session ? { session, ordered: true } : {};
    return LedgerEntry.create(entries, options);
  }

  /**
   * Find all ledger entries for a transaction ID.
   * @param {string} transactionId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByTransactionId(transactionId, session = null) {
    return LedgerEntry.find({ transactionId }).session(session);
  }

  /**
   * Find all ledger entries for an account ID.
   * @param {string} accountId
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   * @param {number} [options.skip=0]
   */
  async findByAccountId(accountId, { limit = 50, skip = 0 } = {}) {
    return LedgerEntry.find({ accountId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}

export default new LedgerEntryRepository();
