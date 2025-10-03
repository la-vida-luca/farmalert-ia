import axios, { AxiosInstance } from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, NotificationSubscription } from '@/types';

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

// Services d'authentification
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getProfile(): Promise<any> {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

// Services de notifications
export const notificationService = {
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    const response = await api.get('/notifications/vapid-key');
    return response.data;
  },

  async subscribe(subscription: NotificationSubscription): Promise<void> {
    await api.post('/notifications/subscribe', subscription);
  },

  async unsubscribe(endpoint: string): Promise<void> {
    await api.delete(`/notifications/unsubscribe/${endpoint}`);
  },

  async sendTestNotification(message: string): Promise<void> {
    await api.post('/notifications/test', { message });
  }
};

// Fonctions utilitaires pour les tokens
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};
