// Types utilisateur
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: string;
}

export interface AuthUser extends User {
  farms: Farm[];
}

// Types ferme
export interface Farm {
  id: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  crops: string[];
  areaHectares?: number;
  soilType?: SoilType;
  irrigationSystem?: IrrigationSystem;
  createdAt: string;
  updatedAt?: string;
}

export type SoilType = 'argileux' | 'sableux' | 'limoneux' | 'calcaire' | 'humifère' | 'autre';
export type IrrigationSystem = 'aucun' | 'aspersion' | 'goutte_a_goutte' | 'gravitaire' | 'pivot' | 'autre';

// Types météo
export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  visibility: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  timestamp: string;
}

export interface ForecastData extends WeatherData {
  precipitation: number;
}

export interface WeatherRisk {
  type: WeatherRiskType;
  severity: AlertSeverity;
  message: string;
  recommendation: string;
  crops: string[];
  estimatedSavings?: number;
}

export type WeatherRiskType = 'frost' | 'drought' | 'disease_risk' | 'heavy_rain' | 'wind' | 'hail' | 'pest_risk';

// Types alerte
export interface Alert {
  id: number;
  farmId: number;
  farmName?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  coordinates: Coordinates;
  estimatedSavings?: number;
  isRead: boolean;
  createdAt: string;
}

export type AlertType = WeatherRiskType | 'custom';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Types signalement communautaire
export interface CommunityReport {
  id: number;
  farmId: number;
  farmName: string;
  reportType: ReportType;
  title: string;
  description: string;
  coordinates: Coordinates;
  severity: AlertSeverity;
  isVerified: boolean;
  createdAt: string;
  firstName: string;
  lastName: string;
  distance?: number;
}

export type ReportType = 'disease' | 'pest' | 'weather_damage' | 'good_practice' | 'market_info' | 'other';

// Types utilitaires
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Types API
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  [key: string]: T[];
  pagination: Pagination;
}

// Types authentification
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

// Types statistiques
export interface FarmStats {
  alerts: {
    total: number;
    unread: number;
    critical: number;
    high: number;
    totalSavings: number;
  };
  reports: {
    total: number;
    disease: number;
    pest: number;
    goodPractice: number;
  };
  weather: {
    dataPointsLast7Days: number;
  };
}

export interface AlertStats {
  period: number;
  total: number;
  unread: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: {
    frost: number;
    drought: number;
    heavyRain: number;
    diseaseRisk: number;
  };
  totalSavings: number;
}

export interface WeatherStats {
  period: number;
  dataPoints: number;
  averageTemperature: number;
  averageHumidity: number;
  totalPrecipitation: number;
  riskCounts: Record<string, number>;
  alertsGenerated: number;
}

// Types notifications
export interface NotificationSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

// Types formulaires
export interface FarmFormData {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  crops: string[];
  areaHectares?: number;
  soilType?: SoilType;
  irrigationSystem?: IrrigationSystem;
}

export interface AlertFormData {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  farmId: number;
  estimatedSavings?: number;
}

export interface ReportFormData {
  reportType: ReportType;
  title: string;
  description: string;
  coordinates?: Coordinates;
  severity: AlertSeverity;
}

// Types contexte
export interface AppContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

// Types erreurs
export interface ApiError {
  error: string;
  code: string;
  details?: any;
}

// Types filtres
export interface AlertFilters {
  status?: 'all' | 'read' | 'unread';
  severity?: AlertSeverity;
  type?: AlertType;
  farmId?: number;
}

export interface ReportFilters {
  type?: ReportType;
  severity?: AlertSeverity;
  verified?: boolean;
  radius?: number;
  lat?: number;
  lon?: number;
}

// Types cartes
export interface MapMarker {
  id: number;
  position: Coordinates;
  title: string;
  type: 'farm' | 'alert' | 'report';
  data?: any;
}

// Types graphiques
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  date: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  alerts: number;
}