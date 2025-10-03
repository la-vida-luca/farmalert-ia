import { useState, useEffect, useCallback } from 'react';
import { Alert } from '../types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

export const useAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAlerts();
      setAlerts(response.alerts);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors du chargement des alertes';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveAlerts = useCallback(async () => {
    try {
      setError(null);
      const response = await apiService.getActiveAlerts();
      setActiveAlerts(response.alerts);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors du chargement des alertes actives';
      setError(errorMessage);
    }
  }, []);

  const acknowledgeAlert = async (alertId: number) => {
    try {
      setError(null);
      await apiService.acknowledgeAlert(alertId);
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, isActive: false, acknowledgedAt: new Date().toISOString() }
            : alert
        )
      );
      
      setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast.success('Alerte marquée comme lue !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la reconnaissance de l\'alerte';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const refreshAlerts = useCallback(async () => {
    await Promise.all([fetchAlerts(), fetchActiveAlerts()]);
  }, [fetchAlerts, fetchActiveAlerts]);

  const getAlertsByFarm = useCallback((farmId: number) => {
    return alerts.filter(alert => alert.farmId === farmId);
  }, [alerts]);

  const getAlertsByType = useCallback((type: string) => {
    return alerts.filter(alert => alert.type === type);
  }, [alerts]);

  const getAlertsBySeverity = useCallback((severity: string) => {
    return alerts.filter(alert => alert.severity === severity);
  }, [alerts]);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  return {
    alerts,
    activeAlerts,
    loading,
    error,
    acknowledgeAlert,
    refreshAlerts,
    getAlertsByFarm,
    getAlertsByType,
    getAlertsBySeverity,
  };
};