import User from '../models/User.model.js';

export class UserRepository {
  /**
   * Create a new user document.
   * @param {Object} userData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(userData, session = null) {
    const options = session ? { session } : {};
    const [user] = await User.create([userData], options);
    return user;
  }

  /**
   * Find a user by ID.
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async findById(id, session = null) {
    return User.findById(id).session(session);
  }

  /**
   * Find a user by email.
   * @param {string} email
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByEmail(email, session = null) {
    return User.findOne({ email: email.toLowerCase().trim() }).session(session);
  }

  /**
   * Update user status (active/frozen).
   * @param {string} id
   * @param {'active'|'frozen'} status
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateStatus(id, status, session = null) {
    return User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, session },
    );
  }

  /**
   * Find users with pagination and optional email search filter.
   * @param {Object} filter
   * @param {number} [filter.page=1]
   * @param {number} [filter.limit=10]
   * @param {string} [filter.search]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findPaginated({ page = 1, limit = 10, search = '' }, session = null) {
    const query = {};
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).session(session),
      User.countDocuments(query).session(session),
    ]);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export default new UserRepository();
