import { createContext } from 'react';
import type { AuthUser } from '../api/types';

export interface Session {
  token: string;
  user: AuthUser;
}

export interface AuthContextValue {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  register: (name: string, email: string, password: string) => Promise<Session>;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);