/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, first_name: string, last_name: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStoredUser = () => {
  const storedUser = sessionStorage.getItem('auth-user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    sessionStorage.removeItem('auth-user');
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading, setLoading] = useState(false);

  const saveAuthUser = (data: User, fallbackEmail: string) => {
    const authUser = {
      ...data,
      email: data.email || fallbackEmail,
      roles: data.roles || [],
    };
    setUser(authUser);
    sessionStorage.setItem('auth-user', JSON.stringify(authUser));
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      saveAuthUser(response.data, email);

      const profile = localStorage.getItem('userProfile') || sessionStorage.getItem('userProfile');
      if (!profile) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      throw new Error('Login failed', { cause: error });
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, first_name: string, last_name: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.register(email, first_name, last_name, password);
      saveAuthUser(response.data, email);
      sessionStorage.removeItem('userProfile');
      window.location.href = '/onboarding';
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
