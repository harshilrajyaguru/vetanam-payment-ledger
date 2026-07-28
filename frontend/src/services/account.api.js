import api from './api.js';

export const accountApi = {
  async getMyAccount() {
    const res = await api.get('/accounts/me');
    return res.data;
  },

  async deposit({ amount, description }) {
    const res = await api.post('/accounts/deposit', { amount, description });
    return res.data;
  },
};

export default accountApi;
