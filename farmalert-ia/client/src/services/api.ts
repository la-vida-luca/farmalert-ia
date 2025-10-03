import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-toastify';

// Types
interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Configuration de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Instance Axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<ApiError>) => {
    const errorMessage = error.response?.data?.error || error.message || 'Une erreur est survenue';
    
    // Ne pas afficher de toast pour les erreurs 401 (non authentifié)
    if (error.response?.status !== 401) {
      toast.error(errorMessage);
    }
    
    // Si le token est expiré, rediriger vers la page de connexion
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Service d'authentification
export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  async deleteAccount(password: string) {
    const response = await api.delete('/auth/account', {
      data: { password },
    });
    return response.data;
  },
};

// Service des fermes
export const farmService = {
  async createFarm(data: any) {
    const response = await api.post('/farms', data);
    return response.data;
  },

  async getFarms() {
    const response = await api.get('/farms');
    return response.data;
  },

  async getFarm(farmId: number) {
    const response = await api.get(`/farms/${farmId}`);
    return response.data;
  },

  async updateFarm(farmId: number, data: any) {
    const response = await api.put(`/farms/${farmId}`, data);
    return response.data;
  },

  async deleteFarm(farmId: number) {
    const response = await api.delete(`/farms/${farmId}`);
    return response.data;
  },

  async getNearbyFarms(farmId: number, radius: number = 10) {
    const response = await api.get(`/farms/${farmId}/nearby?radius=${radius}`);
    return response.data;
  },

  async getFarmStats(farmId: number, period: number = 30) {
    const response = await api.get(`/farms/${farmId}/stats?period=${period}`);
    return response.data;
  },
};

// Service météo
export const weatherService = {
  async getWeatherForFarm(farmId: number) {
    const response = await api.get(`/weather/farm/${farmId}`);
    return response.data;
  },

  async getWeatherByCoordinates(lat: number, lon: number) {
    const response = await api.get(`/weather/coordinates/${lat}/${lon}`);
    return response.data;
  },

  async getWeatherHistory(farmId: number, limit: number = 10, offset: number = 0) {
    const response = await api.get(`/weather/farm/${farmId}/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getWeatherStats(farmId: number, period: number = 7) {
    const response = await api.get(`/weather/farm/${farmId}/stats?period=${period}`);
    return response.data;
  },
};

// Service des alertes
export const alertService = {
  async createAlert(data: any) {
    const response = await api.post('/alerts', data);
    return response.data;
  },

  async getAlerts(filters: {
    status?: 'all' | 'read' | 'unread';
    severity?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/alerts?${params.toString()}`);
    return response.data;
  },

  async getFarmAlerts(farmId: number, filters: {
    status?: 'all' | 'read' | 'unread';
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/alerts/farm/${farmId}?${params.toString()}`);
    return response.data;
  },

  async markAlertAsRead(alertId: number) {
    const response = await api.put(`/alerts/${alertId}/read`);
    return response.data;
  },

  async markAllAlertsAsRead(farmId?: number) {
    const response = await api.put('/alerts/read-all', { farmId });
    return response.data;
  },

  async deleteAlert(alertId: number) {
    const response = await api.delete(`/alerts/${alertId}`);
    return response.data;
  },

  async getAlertStats(filters: {
    farmId?: number;
    period?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/alerts/stats?${params.toString()}`);
    return response.data;
  },
};

// Service des signalements communautaires
export const reportService = {
  async createReport(data: any) {
    const response = await api.post('/reports', data);
    return response.data;
  },

  async getReports(filters: {
    type?: string;
    severity?: string;
    verified?: boolean;
    radius?: number;
    lat?: number;
    lon?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/reports?${params.toString()}`);
    return response.data;
  },

  async getFarmReports(farmId: number, limit: number = 50, offset: number = 0) {
    const response = await api.get(`/reports/farm/${farmId}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  async getReport(reportId: number) {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  async deleteReport(reportId: number) {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  },

  async getReportStats(filters: {
    farmId?: number;
    period?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/reports/stats?${params.toString()}`);
    return response.data;
  },
};

// Service des notifications
export const notificationService = {
  async subscribe(subscription: any) {
    const response = await api.post('/notifications/subscribe', { subscription });
    return response.data;
  },

  async unsubscribe(endpoint: string) {
    const response = await api.post('/notifications/unsubscribe', { endpoint });
    return response.data;
  },

  async getVapidPublicKey() {
    const response = await api.get('/notifications/vapid-public-key');
    return response.data;
  },

  async sendTestNotification(message?: string) {
    const response = await api.post('/notifications/test', { message });
    return response.data;
  },

  async getNotificationHistory(limit: number = 50, offset: number = 0) {
    const response = await api.get(`/notifications/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};

// Fonction utilitaire pour gérer les erreurs
export function handleApiError(error: any): string {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'Une erreur inattendue est survenue';
}

// Fonction pour vérifier si l'utilisateur est authentifié
export function isAuthenticated(): boolean {
  const token = localStorage.getItem('token');
  return !!token;
}

// Fonction pour obtenir le token d'authentification
export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

// Fonction pour définir le token d'authentification
export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

// Fonction pour supprimer le token d'authentification
export function removeAuthToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Export de l'instance API pour les cas spéciaux
export default api;