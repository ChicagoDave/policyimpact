// client/src/hooks/UseAuth.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  sub: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  credentialsId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface LoginResponse {
  token: string;
  user: User;
}

export const useAuth = () => {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null
  });

  const login = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('https://api.policyimpact.us/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid credentials');
      }

      const { token, user }: LoginResponse = await response.json();

      localStorage.setItem('token', token);
      setState({
        user,
        token,
        loading: false,
        error: null
      });

    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      }));
      throw err; // Re-throw to allow handling by the login form
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setState({
      user: null,
      token: null,
      loading: false,
      error: null
    });
    router.push('/login');
  }, [router]);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setState({
          user: null,
          token: null,
          loading: false,
          error: null
        });
        return;
      }

      const response = await fetch('https://api.policyimpact.us/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const { user }: { user: User } = await response.json();
      
      setState({
        user,
        token,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setState({
        user: null,
        token: null,
        loading: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred'
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isAuthenticated = !!state.token && !!state.user;

  const hasRole = useCallback((requiredRoles: string | string[]): boolean => {
    if (!state.user) return false;
    
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.includes(state.user.role);
  }, [state.user]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    error: state.error,
    isAuthenticated,
    hasRole,
    login,
    logout,
    checkAuth
  };
};

export default useAuth;