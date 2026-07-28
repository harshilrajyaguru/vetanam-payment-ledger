import api from './api.js';

export const transactionService = {
  async transfer({ recipientEmail, amount, currency = 'INR', description, idempotencyKey }) {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await api.post(
      '/transfers',
      { recipientEmail, amount, currency, description, idempotencyKey },
      { headers },
    );
    return res.data;
  },

  async getMyTransactions({ page = 1, limit = 10 } = {}) {
    const res = await api.get('/transactions', { params: { page, limit } });
    return res.data;
  },

  async getTransactionById(id) {
    const res = await api.get(`/transactions/${id}`);
    return res.data;
  },

  async getTransactionLedger(id) {
    const res = await api.get(`/transactions/${id}/ledger`);
    return res.data;
  },
};

export default transactionService;
