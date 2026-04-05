import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const login = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post('/auth/login', data).then(r => r.data),
    onSuccess: data => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      api.post('/cart/merge').finally(() => {
        qc.invalidateQueries({ queryKey: ['cart'] });
      });
    },
  });

  const register = useMutation({
    mutationFn: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
      api.post('/auth/register', data).then(r => r.data),
    onSuccess: data => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push('/');
    },
  });

  const logout = useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refreshToken');
      return api.post('/auth/logout', { refreshToken });
    },
    onSuccess: () => {
      clearAuth();
      qc.clear();
      router.push('/login');
    },
    onError: () => {
      clearAuth();
      qc.clear();
      router.push('/login');
    },
  });

  return { user, isAuthenticated, login, register, logout };
}
