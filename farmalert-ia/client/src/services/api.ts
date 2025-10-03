import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  Farm, 
  Alert, 
  WeatherResponse, 
  WeatherData, 
  WeatherForecast,
  LoginRequest, 
  RegisterRequest, 
  CreateFarmRequest,
  AuthResponse,
  AlertStats,
  OptimalConditions
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'https://farmalert-ia-production.up.railway.app',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
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

    // Intercepteur pour gérer les erreurs de réponse
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expiré ou invalide
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Méthodes d'authentification
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/api/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/api/auth/register', userData);
    return response.data;
  }

  async getProfile(): Promise<{ user: User }> {
    const response: AxiosResponse<{ user: User }> = await this.api.get('/api/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.put('/api/auth/profile', data);
    return response.data;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.put('/api/auth/password', data);
    return response.data;
  }

  // Méthodes pour les fermes
  async getFarms(): Promise<{ farms: Farm[] }> {
    const response: AxiosResponse<{ farms: Farm[] }> = await this.api.get('/api/farms');
    return response.data;
  }

  async getFarm(id: number): Promise<{ farm: Farm }> {
    const response: AxiosResponse<{ farm: Farm }> = await this.api.get(`/api/farms/${id}`);
    return response.data;
  }

  async createFarm(farmData: CreateFarmRequest): Promise<{ message: string; farm: Farm }> {
    const response: AxiosResponse<{ message: string; farm: Farm }> = await this.api.post('/api/farms', farmData);
    return response.data;
  }

  async updateFarm(id: number, farmData: Partial<CreateFarmRequest>): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.put(`/api/farms/${id}`, farmData);
    return response.data;
  }

  async deleteFarm(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.delete(`/api/farms/${id}`);
    return response.data;
  }

  // Méthodes pour les données météo
  async getWeatherForFarm(farmId: number): Promise<{ current: WeatherResponse; history: WeatherData[] }> {
    const response: AxiosResponse<{ current: WeatherResponse; history: WeatherData[] }> = await this.api.get(`/api/farms/${farmId}/weather`);
    return response.data;
  }

  async getForecastForFarm(farmId: number): Promise<{ forecast: WeatherForecast[] }> {
    const response: AxiosResponse<{ forecast: WeatherForecast[] }> = await this.api.get(`/api/farms/${farmId}/forecast`);
    return response.data;
  }

  async getCurrentWeather(lat: number, lon: number): Promise<{ weather: WeatherResponse }> {
    const response: AxiosResponse<{ weather: WeatherResponse }> = await this.api.get('/api/weather/current', {
      params: { lat, lon }
    });
    return response.data;
  }

  async getWeatherForecast(lat: number, lon: number): Promise<{ forecast: WeatherForecast[] }> {
    const response: AxiosResponse<{ forecast: WeatherForecast[] }> = await this.api.get('/api/weather/forecast', {
      params: { lat, lon }
    });
    return response.data;
  }

  async getOptimalConditions(cropType: string): Promise<{ cropType: string; optimalConditions: OptimalConditions; recommendations: any }> {
    const response: AxiosResponse<{ cropType: string; optimalConditions: OptimalConditions; recommendations: any }> = await this.api.get(`/api/weather/optimal-conditions/${cropType}`);
    return response.data;
  }

  // Méthodes pour les alertes
  async getAlerts(): Promise<{ alerts: Alert[] }> {
    const response: AxiosResponse<{ alerts: Alert[] }> = await this.api.get('/api/alerts');
    return response.data;
  }

  async getActiveAlerts(): Promise<{ alerts: Alert[] }> {
    const response: AxiosResponse<{ alerts: Alert[] }> = await this.api.get('/api/alerts/active');
    return response.data;
  }

  async getAlertsByFarm(farmId: number): Promise<{ alerts: Alert[] }> {
    const response: AxiosResponse<{ alerts: Alert[] }> = await this.api.get(`/api/alerts/farm/${farmId}`);
    return response.data;
  }

  async getAlert(id: number): Promise<{ alert: Alert }> {
    const response: AxiosResponse<{ alert: Alert }> = await this.api.get(`/api/alerts/${id}`);
    return response.data;
  }

  async acknowledgeAlert(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.api.put(`/api/alerts/${id}/acknowledge`);
    return response.data;
  }

  async getAlertStats(): Promise<{ stats: AlertStats }> {
    const response: AxiosResponse<{ stats: AlertStats }> = await this.api.get('/api/alerts/stats/summary');
    return response.data;
  }

  async getAlertsByType(type: string): Promise<{ alerts: Alert[] }> {
    const response: AxiosResponse<{ alerts: Alert[] }> = await this.api.get(`/api/alerts/type/${type}`);
    return response.data;
  }

  async getAlertsBySeverity(severity: string): Promise<{ alerts: Alert[] }> {
    const response: AxiosResponse<{ alerts: Alert[] }> = await this.api.get(`/api/alerts/severity/${severity}`);
    return response.data;
  }

  // Méthodes pour vérifier les alertes
  async checkAlertsForFarm(farmId: number): Promise<{ message: string; newAlerts: Alert[]; weatherData: WeatherResponse }> {
    const response: AxiosResponse<{ message: string; newAlerts: Alert[]; weatherData: WeatherResponse }> = await this.api.post(`/api/farms/${farmId}/check-alerts`);
    return response.data;
  }

  // Méthodes utilitaires
  async getDemoData(): Promise<any> {
    const response: AxiosResponse<any> = await this.api.get('/api/demo/data');
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response: AxiosResponse<{ status: string; timestamp: string }> = await this.api.get('/health');
    return response.data;
  }
}

// Instance singleton
export const apiService = new ApiService();
export default apiService;