import { create } from 'zustand';
import { api } from '@/api/client';
import type { TokenResponse, User } from '@/types';

interface AuthState {
  token: string | null;
  user: { id: number; name: string; role: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (login: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (login, password, rememberMe) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<TokenResponse>('/auth/login', {
        login, password, remember_me: rememberMe,
      });
      api.setToken(data.access_token);
      localStorage.setItem('zarya_token', data.access_token);
      set({
        token: data.access_token,
        user: { id: data.user_id, name: data.name, role: data.role },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e: any) {
      const msg = e.status === 401 ? 'Неверный логин или пароль' :
                  e.status === 403 ? 'Аккаунт деактивирован' :
                  'Сервер недоступен';
      set({ isLoading: false, error: msg });
      throw e;
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    api.setToken(null);
    localStorage.removeItem('zarya_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  init: () => {
    const token = localStorage.getItem('zarya_token');
    if (token) {
      api.setToken(token);
      // Verify token by fetching /me
      api.get<{ id: number; name: string; role: string; email: string }>('/auth/me')
        .then(user => {
          set({ token, user: { id: user.id, name: user.name, role: user.role }, isAuthenticated: true });
        })
        .catch(() => {
          localStorage.removeItem('zarya_token');
          set({ token: null, user: null, isAuthenticated: false });
        });
    }
  },
}));
