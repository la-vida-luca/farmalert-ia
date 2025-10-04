import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { User, Alert } from '../types';
import { useAuth } from './AuthContext';

interface UserStats {
  totalFarms: number;
  activeAlerts: number;
  criticalAlerts: number;
  recentActivity: Activity[];
}

interface Activity {
  id: number;
  type: 'farm_created' | 'alert_generated' | 'alert_acknowledged' | 'profile_updated';
  description: string;
  timestamp: string;
  metadata?: any;
}

interface UserContextType {
  alerts: Alert[];
  stats: UserStats | null;
  isLoadingAlerts: boolean;
  isLoadingStats: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  getActiveAlerts: () => Promise<Alert[]>;
  getAlertById: (id: number) => Promise<Alert>;
  acknowledgeAlert: (id: number) => Promise<void>;
  getUserStats: () => Promise<UserStats>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Fetch alerts and stats when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
      getUserStats();
    } else {
      setAlerts([]);
      setStats(null);
    }
  }, [isAuthenticated]);

  const fetchAlerts = async () => {
    try {
      setIsLoadingAlerts(true);
      setError(null);
      const response = await api.get('/alerts');
      setAlerts(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch alerts';
      setError(errorMessage);
      console.error('Error fetching alerts:', err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const getActiveAlerts = async (): Promise<Alert[]> => {
    try {
      const response = await api.get('/alerts/active');
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to fetch active alerts');
    }
  };

  const getAlertById = async (id: number): Promise<Alert> => {
    try {
      const response = await api.get(`/alerts/${id}`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to fetch alert');
    }
  };

  const acknowledgeAlert = async (id: number): Promise<void> => {
    try {
      setError(null);
      await api.put(`/alerts/${id}/acknowledge`);
      // Update local state
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.id === id ? { ...alert, isAcknowledged: true } : alert
        )
      );
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to acknowledge alert';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getUserStats = async (): Promise<UserStats> => {
    try {
      setIsLoadingStats(true);
      setError(null);
      const response = await api.get('/alerts/stats/summary');
      const statsData = response.data;
      
      // Transform API response to UserStats format
      const userStats: UserStats = {
        totalFarms: statsData.totalFarms || 0,
        activeAlerts: statsData.activeAlerts || 0,
        criticalAlerts: statsData.criticalAlerts || 0,
        recentActivity: statsData.recentActivity || [],
      };
      
      setStats(userStats);
      return userStats;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch user stats';
      setError(errorMessage);
      console.error('Error fetching user stats:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: UserContextType = {
    alerts,
    stats,
    isLoadingAlerts,
    isLoadingStats,
    error,
    fetchAlerts,
    getActiveAlerts,
    getAlertById,
    acknowledgeAlert,
    getUserStats,
    clearError,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
