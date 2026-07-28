import Notification from '../models/Notification.model.js';

export class NotificationRepository {
  /**
   * Create a new notification document.
   * @param {Object} notificationData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(notificationData, session = null) {
    const options = session ? { session } : {};
    const [notification] = await Notification.create([notificationData], options);
    return notification;
  }

  /**
   * Get paginated user notifications sorted by newest first.
   * @param {string} userId
   * @param {Object} pagination
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=20]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByUserId(userId, { page = 1, limit = 20 } = {}, session = null) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session),
      Notification.countDocuments({ userId }).session(session),
    ]);
    return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Mark notification as read.
   * @param {string} id
   * @param {import('mongoose').ClientSession} [session]
   */
  async markAsRead(id, session = null) {
    return Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true, session },
    );
  }
}

export default new NotificationRepository();
