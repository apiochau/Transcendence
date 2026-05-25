import { create } from 'zustand';
import { AuthUser } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
}

function getStoredUser() {
  const storedUser = sessionStorage.getItem('user');
  return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
}

const storedToken = sessionStorage.getItem('accessToken');

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: storedToken,
  user: getStoredUser(),
  isAuthenticated: Boolean(storedToken),
  setSession: (accessToken, user) => {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('user', JSON.stringify(user));
    set({ accessToken, user, isAuthenticated: true });
  },
  logout: () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ accessToken: null, user: null, isAuthenticated: false });
  },
}));
