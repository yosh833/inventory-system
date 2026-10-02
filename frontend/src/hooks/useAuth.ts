import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { api } from '../api/client';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout, refreshUser, hasRole, isAdmin, isOperator } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !isAuthenticated) {
      refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    hasRole,
    isAdmin,
    isOperator
  };
}

export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}