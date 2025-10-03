import { useState, useEffect, useCallback } from 'react';
import { Farm, CreateFarmRequest } from '../types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

export const useFarms = () => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getFarms();
      setFarms(response.farms);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors du chargement des fermes';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFarm = async (data: CreateFarmRequest) => {
    try {
      setError(null);
      const response = await apiService.createFarm(data);
      setFarms(prev => [response.farm, ...prev]);
      toast.success('Ferme créée avec succès !');
      return response.farm;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la création de la ferme';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateFarm = async (id: number, data: Partial<CreateFarmRequest>) => {
    try {
      setError(null);
      await apiService.updateFarm(id, data);
      
      setFarms(prev => 
        prev.map(farm => 
          farm.id === id 
            ? { ...farm, ...data, updatedAt: new Date().toISOString() }
            : farm
        )
      );
      
      toast.success('Ferme mise à jour avec succès !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la mise à jour de la ferme';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const deleteFarm = async (id: number) => {
    try {
      setError(null);
      await apiService.deleteFarm(id);
      setFarms(prev => prev.filter(farm => farm.id !== id));
      toast.success('Ferme supprimée avec succès !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression de la ferme';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    }
  };

  const refreshFarms = useCallback(async () => {
    await fetchFarms();
  }, [fetchFarms]);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  return {
    farms,
    loading,
    error,
    createFarm,
    updateFarm,
    deleteFarm,
    refreshFarms,
  };
};