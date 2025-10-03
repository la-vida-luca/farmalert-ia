import { useState, useCallback } from 'react';
import { WeatherResponse, WeatherData, WeatherForecast } from '../types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

export const useWeather = () => {
  const [currentWeather, setCurrentWeather] = useState<WeatherResponse | null>(null);
  const [weatherHistory, setWeatherHistory] = useState<WeatherData[]>([]);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWeatherForFarm = async (farmId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getWeatherForFarm(farmId);
      setCurrentWeather(response.current);
      setWeatherHistory(response.history);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la récupération des données météo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getForecastForFarm = async (farmId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getForecastForFarm(farmId);
      setForecast(response.forecast);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la récupération des prévisions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherForLocation = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCurrentWeather(lat, lon);
      setCurrentWeather(response.weather);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la récupération des données météo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getForecastForLocation = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getWeatherForecast(lat, lon);
      setForecast(response.forecast);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la récupération des prévisions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const refreshWeather = useCallback(async () => {
    if (currentWeather) {
      // Si on a des données météo actuelles, on peut les rafraîchir
      // Pour l'instant, on ne peut pas rafraîchir sans connaître la localisation
      toast.info('Utilisez le bouton de rafraîchissement sur une ferme spécifique');
    }
  }, [currentWeather]);

  const clearWeather = useCallback(() => {
    setCurrentWeather(null);
    setWeatherHistory([]);
    setForecast([]);
    setError(null);
  }, []);

  return {
    currentWeather,
    weatherHistory,
    forecast,
    loading,
    error,
    getWeatherForFarm,
    getForecastForFarm,
    getWeatherForLocation,
    getForecastForLocation,
    refreshWeather,
    clearWeather,
  };
};