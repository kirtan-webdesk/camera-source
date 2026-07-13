import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { LoginForm, RegisterForm, ApiResponse, User, AuthTokens } from '../types';

export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (form: LoginForm) =>
      api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', form),
    onSuccess: ({ data }) => {
      if (data.data) {
        setAuth(data.data.user, data.data.tokens.accessToken);
        navigate('/dashboard');
      }
    },
  });
};

export const useRegister = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (form: RegisterForm) =>
      api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', form),
    onSuccess: ({ data }) => {
      if (data.data) {
        setAuth(data.data.user, data.data.tokens.accessToken);
        navigate('/dashboard');
      }
    },
  });
};

export const useLogout = () => {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  return () => {
    clearAuth();
    navigate('/login');
  };
};
