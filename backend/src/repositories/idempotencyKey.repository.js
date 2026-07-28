import IdempotencyKey from '../models/IdempotencyKey.model.js';

export class IdempotencyKeyRepository {
  /**
   * Create durable idempotency key entry.
   * @param {Object} data
   * @param {string} data._id Client idempotency key
   * @param {string} data.requestHash Hash of request body
   * @param {Date} data.expiresAt Expiry date
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(data, session = null) {
    const options = session ? { session } : {};
    const [keyDoc] = await IdempotencyKey.create([data], options);
    return keyDoc;
  }

  /**
   * Find idempotency key document by key string.
   * @param {string} key
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByKey(key, session = null) {
    return IdempotencyKey.findById(key).session(session);
  }

  /**
   * Update idempotency status and record cached response snapshot.
   * @param {string} key
   * @param {'IN_PROGRESS'|'COMPLETED'} status
   * @param {Object} [responseSnapshot=null]
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateStatusAndSnapshot(key, status, responseSnapshot = null, session = null) {
    return IdempotencyKey.findByIdAndUpdate(
      key,
      { status, responseSnapshot },
      { new: true, runValidators: true, session },
    );
  }

  /**
   * Remove an idempotency key.
   * @param {string} key
   * @param {import('mongoose').ClientSession} [session]
   */
  async deleteByKey(key, session = null) {
    return IdempotencyKey.findByIdAndDelete(key, { session });
  }
}

export default new IdempotencyKeyRepository();
