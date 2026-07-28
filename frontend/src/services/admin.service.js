import api from './api.js';

export const adminService = {
  async getUsers({ page = 1, limit = 10, search = '' } = {}) {
    const res = await api.get('/admin/users', { params: { page, limit, search } });
    return res.data;
  },

  async toggleFreezeUser(userId, action = 'freeze') {
    const res = await api.patch(`/admin/users/${userId}/freeze`, { action });
    return res.data;
  },

  async getTransactions({ page = 1, limit = 10, status, userId, startDate, endDate } = {}) {
    const res = await api.get('/admin/transactions', {
      params: { page, limit, status, userId, startDate, endDate },
    });
    return res.data;
  },

  async reviewTransaction(transactionId, decision) {
    const res = await api.patch(`/admin/transactions/${transactionId}/review`, { decision });
    return res.data;
  },

  async getAuditLogs({ page = 1, limit = 20, action, targetType } = {}) {
    const res = await api.get('/admin/audit-logs', { params: { page, limit, action, targetType } });
    return res.data;
  },
};

export default adminService;
