import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { Farm, WeatherData } from '../types';
import { useAuth } from './AuthContext';

interface FarmContextType {
  farms: Farm[];
  selectedFarm: Farm | null;
  isLoading: boolean;
  error: string | null;
  fetchFarms: () => Promise<void>;
  getFarmById: (id: number) => Promise<Farm>;
  createFarm: (farmData: Omit<Farm, 'id' | 'userId' | 'createdAt'>) => Promise<Farm>;
  updateFarm: (id: number, farmData: Partial<Farm>) => Promise<Farm>;
  deleteFarm: (id: number) => Promise<void>;
  selectFarm: (farm: Farm | null) => void;
  getFarmWeather: (farmId: number) => Promise<WeatherData>;
  getFarmForecast: (farmId: number) => Promise<any>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const useFarms = () => {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarms must be used within a FarmProvider');
  }
  return context;
};

interface FarmProviderProps {
  children: ReactNode;
}

export const FarmProvider: React.FC<FarmProviderProps> = ({ children }) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Fetch farms when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchFarms();
    } else {
      setFarms([]);
      setSelectedFarm(null);
    }
  }, [isAuthenticated]);

  const fetchFarms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/farms');
      setFarms(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch farms';
      setError(errorMessage);
      console.error('Error fetching farms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFarmById = async (id: number): Promise<Farm> => {
    try {
      const response = await api.get(`/farms/${id}`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to fetch farm');
    }
  };

  const createFarm = async (farmData: Omit<Farm, 'id' | 'userId' | 'createdAt'>): Promise<Farm> => {
    try {
      setError(null);
      const response = await api.post('/farms', farmData);
      const newFarm = response.data;
      setFarms(prevFarms => [...prevFarms, newFarm]);
      return newFarm;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create farm';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateFarm = async (id: number, farmData: Partial<Farm>): Promise<Farm> => {
    try {
      setError(null);
      const response = await api.put(`/farms/${id}`, farmData);
      const updatedFarm = response.data;
      setFarms(prevFarms => prevFarms.map(farm => farm.id === id ? updatedFarm : farm));
      if (selectedFarm?.id === id) {
        setSelectedFarm(updatedFarm);
      }
      return updatedFarm;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update farm';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteFarm = async (id: number): Promise<void> => {
    try {
      setError(null);
      await api.delete(`/farms/${id}`);
      setFarms(prevFarms => prevFarms.filter(farm => farm.id !== id));
      if (selectedFarm?.id === id) {
        setSelectedFarm(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete farm';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const selectFarm = (farm: Farm | null) => {
    setSelectedFarm(farm);
  };

  const getFarmWeather = async (farmId: number): Promise<WeatherData> => {
    try {
      const response = await api.get(`/farms/${farmId}/weather`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to fetch weather data');
    }
  };

  const getFarmForecast = async (farmId: number): Promise<any> => {
    try {
      const response = await api.get(`/farms/${farmId}/forecast`);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to fetch forecast data');
    }
  };

  const value: FarmContextType = {
    farms,
    selectedFarm,
    isLoading,
    error,
    fetchFarms,
    getFarmById,
    createFarm,
    updateFarm,
    deleteFarm,
    selectFarm,
    getFarmWeather,
    getFarmForecast,
  };

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
};
