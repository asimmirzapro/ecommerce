import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';

const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const WARNING_MS = 30 * 1000;      // warn 30s before logout

export function useInactivityLogout() {
  const { isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    clearAuth();
    router.push('/login?reason=inactivity');
  }, [clearAuth, router]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Refresh the cookie max-age on every activity
    const token = localStorage.getItem('accessToken');
    if (token) {
      document.cookie = `auth-token=${encodeURIComponent(token)}; path=/; max-age=${TIMEOUT_MS / 1000}; SameSite=Lax`;
    }

    timerRef.current = setTimeout(logout, TIMEOUT_MS);
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [isAuthenticated, resetTimer]);
}
