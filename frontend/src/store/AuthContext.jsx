import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccount = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data.user);
        setAccount(res.data.account);
      }
    } catch {
      setUser(null);
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccount();

    // Re-fetch on window focus (tab switching)
    const handleFocus = () => fetchAccount();
    window.addEventListener('focus', handleFocus);

    // Periodic polling every 10 seconds for real-time balance & state sync
    const interval = setInterval(() => {
      fetchAccount();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchAccount]);

  const login = async (credentials, passwordArg) => {
    const payload =
      typeof credentials === 'object' && credentials !== null
        ? credentials
        : { email: credentials, password: passwordArg };

    const res = await authService.login(payload);
    if (res.success && res.data) {
      const { user: u, account: a, accessToken, refreshToken } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(u);
      setAccount(a);
    }
    return res;
  };

  const register = async (credentials, passwordArg, roleArg) => {
    const payload =
      typeof credentials === 'object' && credentials !== null
        ? credentials
        : { email: credentials, password: passwordArg, role: roleArg };

    const res = await authService.register(payload);
    return res;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await authService.logout({ refreshToken });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setAccount(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        isLoading,
        login,
        register,
        logout,
        fetchAccount,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
