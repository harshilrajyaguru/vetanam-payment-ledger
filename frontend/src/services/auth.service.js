import api from './api.js';

export const authService = {
  async register({ email, password }) {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
  },

  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  async refresh(refreshToken) {
    const res = await api.post('/auth/refresh', { refreshToken });
    return res.data;
  },

  async logout(refreshToken) {
    try {
      const res = await api.post('/auth/logout', { refreshToken });
      return res.data;
    } catch {
      // Ignore logout API failure
    }
  },

  async getMe() {
    const res = await api.get('/accounts/me');
    return res.data;
  },
};

export default authService;
