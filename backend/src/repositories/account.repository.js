import Account from '../models/Account.model.js';

export class AccountRepository {
  /**
   * Create a new account document.
   * @param {Object} accountData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(accountData, session = null) {
    const options = session ? { session } : {};
    const [account] = await Account.create([accountData], options);
    return account;
  }

  /**
   * Find account by ID.
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async findById(id, session = null) {
    return Account.findById(id).session(session);
  }

  /**
   * Find account by user ID.
   * @param {string} userId
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByUserId(userId, session = null) {
    return Account.findOne({ userId }).session(session);
  }

  /**
   * Atomic balance update using optimistic locking via version counter.
   * @param {string} id Account ID
   * @param {number} newBalance Balance in minor units
   * @param {number} expectedVersion Current version number expected
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateBalanceWithVersion(id, newBalance, expectedVersion, session = null) {
    const versionMatch =
      expectedVersion === 0 || expectedVersion === undefined || expectedVersion === null
        ? { $in: [0, undefined, null] }
        : expectedVersion;

    const account = await Account.findOneAndUpdate(
      { _id: id, version: versionMatch },
      {
        $set: { cachedBalance: newBalance },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true, session },
    );
    return account;
  }

  /**
   * Update account status (active/frozen).
   * @param {string} id
   * @param {'active'|'frozen'} status
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateStatus(id, status, session = null) {
    return Account.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, session },
    );
  }
}

export default new AccountRepository();
