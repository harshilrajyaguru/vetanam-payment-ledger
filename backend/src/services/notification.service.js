import notificationRepository from '../repositories/notification.repository.js';

export class NotificationService {
  /**
   * Get paginated notifications for the calling user.
   * @param {string} userId
   * @param {Object} pagination
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=20]
   */
  async getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    return notificationRepository.findByUserId(userId, { page, limit });
  }

  /**
   * Mark notification as read.
   * @param {string} notificationId
   */
  async markAsRead(notificationId) {
    return notificationRepository.markAsRead(notificationId);
  }
}

export default new NotificationService();
