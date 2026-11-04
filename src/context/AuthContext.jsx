import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setSessionExpiredHandler, tokens } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!tokens.access && !tokens.refresh) {
      setUser(null);
      return null;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
      return data.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    refreshUser().finally(() => setReady(true));
  }, [refreshUser]);

  const handleAuth = (payload) => {
    tokens.set(payload);
    setUser(payload.user);
    return payload;
  };

  const login = async (login, password) => {
    const { data } = await api.post('/auth/login', { login, password });
    return { ...handleAuth(data.data), message: data.message };
  };

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form);
    return { ...handleAuth(data.data), message: data.message };
  };

  const logout = async () => {
    try { await api.post('/auth/logout', { refresh_token: tokens.refresh }); } catch { /* hors ligne */ }
    tokens.clear();
    setUser(null);
  };

  const has = (role) => Boolean(user?.roles?.includes(role));
  const isSeller = user?.shop?.status === 'approved';

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, register, logout, refreshUser, has, isSeller }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
