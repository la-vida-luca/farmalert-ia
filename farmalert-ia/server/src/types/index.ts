export interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'farmer';
  createdAt: string;
  updatedAt: string;
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
  farmType: 'cereals' | 'dairy' | 'organic' | 'livestock' | 'vegetables' | 'fruits';
  size: number; // en hectares
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
}

export interface AuthRequest extends Request {
  user?: User;
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

export interface AlertRule {
  type: string;
  condition: (weather: WeatherData) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
}