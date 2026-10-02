import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../types';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  isAdmin: () => boolean;
  isOperator: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.login(email, password);
          set({ user: response.data.user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      },

      refreshUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        try {
          const response = await api.getProfile();
          set({ user: response.data, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },

      hasRole: (roles: Role[]) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      isAdmin: () => get().hasRole([Role.ADMIN]),
      isOperator: () => get().hasRole([Role.OPERATOR, Role.ADMIN])
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);