import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loginApi, registerApi } from '../api/client';
import type { AuthUser } from '../api/types';
import { AuthContext } from './auth-context';
import type { Session } from './auth-context';

const STORAGE_KEY = 'bookmaster.session';

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      token?: unknown;
      user?: Partial<AuthUser>;
    };
    const user = parsed.user;
    if (
      typeof parsed.token !== 'string' ||
      parsed.token.length === 0 ||
      user === undefined ||
      typeof user.id !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.role !== 'string'
    ) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { token: parsed.token, user: user as AuthUser };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistSession(session: Session | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginApi(email, password);
    const next: Session = { token: response.token, user: response.user };
    setSession(next);
    persistSession(next);
    return next;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await registerApi(name, email, password);
      const next: Session = { token: response.token, user: response.user };
      setSession(next);
      persistSession(next);
      return next;
    },
    [],
  );

  const logout = useCallback(() => {
    setSession(null);
    persistSession(null);
  }, []);

  const updateUser = useCallback((user: Partial<AuthUser>) => {
    setSession((current) => {
      if (!current) return current;
      const next: Session = { ...current, user: { ...current.user, ...user } };
      persistSession(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ session, login, register, logout, updateUser }),
    [session, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}