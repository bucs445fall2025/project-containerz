import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, signOut } from '../api/auth.js';

const TOKEN_STORAGE_KEY = 'authToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getCurrentUser(token);
        if (!ignore) {
          setUser(response.user);
        }
      } catch (error) {
        console.error('Unable to refresh session', error);
        if (!ignore) {
          setToken(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      ignore = true;
    };
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getCurrentUser(token);
      setUser(response.user ?? null);
    } catch (error) {
      console.error('Unable to refresh user', error);
      setToken(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
    }
  }, [token]);
  

  const login = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await signOut(token);
      }
    } catch (error) {
      console.warn('Sign out failed', error);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo(
    () => ({ token, user, loading, login, logout, refreshUser }),
    [token, user, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
