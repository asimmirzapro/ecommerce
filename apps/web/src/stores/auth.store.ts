import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'customer' | 'admin';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          setCookie('auth-token', accessToken, INACTIVITY_TIMEOUT_MS / 1000);
        }
        set({ user, accessToken, isAuthenticated: true });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          deleteCookie('auth-token');
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-store',
      partialize: state => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      // On rehydration, always verify the cookie is still present; if not, clear state
      onRehydrateStorage: () => (state) => {
        if (typeof document === 'undefined') return;
        const hasCookie = document.cookie.includes('auth-token=');
        if (!hasCookie && state) {
          state.user = null;
          state.accessToken = null;
          state.isAuthenticated = false;
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      },
    }
  )
);
