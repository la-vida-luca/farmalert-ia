import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await api.get('/auth/profile');
          setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string, role = 'farmer') => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role });
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await api.put('/auth/profile', data);
      setUser(response.data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  };

  const updatePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await api.put('/auth/password', { oldPassword, newPassword });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password update failed');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
