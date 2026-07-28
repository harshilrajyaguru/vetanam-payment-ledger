import api from './api.js';

export const notificationService = {
  async getMyNotifications({ page = 1, limit = 20 } = {}) {
    const res = await api.get('/notifications', { params: { page, limit } });
    return res.data;
  },
};

export default notificationService;
