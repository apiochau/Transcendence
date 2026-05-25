import { create } from 'zustand';
import { AuthUser } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
}

const storedToken = localStorage.getItem('accessToken');
const storedUser = localStorage.getItem('user');

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: storedToken,
  user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
  isAuthenticated: Boolean(storedToken),
  setSession: (accessToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ accessToken, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));
