export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'farmer';
  createdAt: string;
}

export interface Farm {
  id: number;
  userId: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  location: string;
  farmType: 'cereals' | 'dairy' | 'organic' | 'livestock' | 'vegetables' | 'fruits';
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherData {
  id: number;
  farmId: number;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudiness: number;
  visibility: number;
  uvIndex: number;
  timestamp: string;
  weatherCondition: string;
  weatherDescription: string;
}

export interface Alert {
  id: number;
  farmId: number;
  userId: number;
  type: 'frost' | 'drought' | 'fungal_disease' | 'excessive_rain' | 'strong_wind' | 'heat_wave';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  isActive: boolean;
  triggeredAt: string;
  acknowledgedAt?: string;
  weatherDataId?: number;
  farmName?: string;
}

export interface WeatherResponse {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudiness: number;
  visibility: number;
  uvIndex: number;
  weatherCondition: string;
  weatherDescription: string;
  timestamp: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateFarmRequest {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  farmType: 'cereals' | 'dairy' | 'organic' | 'livestock' | 'vegetables' | 'fruits';
  size: number;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  frost: number;
  drought: number;
  fungal_disease: number;
  excessive_rain: number;
  strong_wind: number;
  heat_wave: number;
}

export interface OptimalConditions {
  temperature: { min: number; max: number; optimal: number };
  humidity: { min: number; max: number; optimal: number };
  precipitation: { min: number; max: number; optimal: number };
  windSpeed: { max: number };
  description: string;
}

export interface WeatherForecast {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudiness: number;
  visibility: number;
  uvIndex: number;
  weatherCondition: string;
  weatherDescription: string;
  timestamp: string;
}

// Types pour les formulaires
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface FarmFormData {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  postalCode: string;
  region: string;
  farmType: 'cereals' | 'dairy' | 'organic' | 'livestock' | 'vegetables' | 'fruits';
  size: number;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Types pour les composants UI
export interface WeatherIconProps {
  condition: string;
  size?: number;
  className?: string;
}

export interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (alertId: number) => void;
}

export interface FarmCardProps {
  farm: Farm;
  onEdit?: (farm: Farm) => void;
  onDelete?: (farmId: number) => void;
  onViewWeather?: (farmId: number) => void;
}

export interface WeatherCardProps {
  weather: WeatherResponse;
  farmName?: string;
  showDetails?: boolean;
}

// Types pour les hooks
export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface UseFarmsReturn {
  farms: Farm[];
  loading: boolean;
  error: string | null;
  createFarm: (data: CreateFarmRequest) => Promise<void>;
  updateFarm: (id: number, data: Partial<CreateFarmRequest>) => Promise<void>;
  deleteFarm: (id: number) => Promise<void>;
  refreshFarms: () => Promise<void>;
}

export interface UseAlertsReturn {
  alerts: Alert[];
  activeAlerts: Alert[];
  loading: boolean;
  error: string | null;
  acknowledgeAlert: (alertId: number) => Promise<void>;
  refreshAlerts: () => Promise<void>;
  getAlertsByFarm: (farmId: number) => Alert[];
  getAlertsByType: (type: string) => Alert[];
}

export interface UseWeatherReturn {
  currentWeather: WeatherResponse | null;
  weatherHistory: WeatherData[];
  forecast: WeatherForecast[];
  loading: boolean;
  error: string | null;
  getWeatherForFarm: (farmId: number) => Promise<void>;
  getWeatherForLocation: (lat: number, lon: number) => Promise<void>;
  refreshWeather: () => Promise<void>;
}