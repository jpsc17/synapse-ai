import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, getStoredAuthToken, setStoredAuthToken } from '../services/apiService';
import type { AuthUser } from '../services/apiService';
import { AuthStateContext } from './authState';

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setStoredAuthToken('');
    setUser(null);
    setExpiresAt(null);
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const session = await apiService.getCurrentSession();
        if (active) {
          setUser(session.user);
          setExpiresAt(session.expires_at);
        }
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    const handleExpired = () => clearSession();
    window.addEventListener('synapse-session-expired', handleExpired);
    return () => {
      active = false;
      window.removeEventListener('synapse-session-expired', handleExpired);
    };
  }, [clearSession]);

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    const timeout = window.setTimeout(clearSession, Math.max(0, remaining));
    return () => window.clearTimeout(timeout);
  }, [clearSession, expiresAt]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiService.login(email, password);
    setStoredAuthToken(result.access_token);
    setUser(result.user);
    setExpiresAt(result.expires_at);
  }, []);

  const logout = useCallback(async () => {
    if (getStoredAuthToken()) {
      try {
        await apiService.logout();
      } finally {
        clearSession();
      }
    } else {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
};
