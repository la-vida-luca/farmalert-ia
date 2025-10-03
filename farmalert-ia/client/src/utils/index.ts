import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Utilitaire pour combiner les classes CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatage des dates
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy') {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

export function formatDateTime(date: string | Date) {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

export function formatTime(date: string | Date) {
  return formatDate(date, 'HH:mm');
}

export function formatRelativeTime(date: string | Date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
}

// Formatage des nombres
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${formatNumber(distance, 1)}km`;
}

export function formatArea(area: number): string {
  return `${formatNumber(area, 1)} ha`;
}

// Formatage des coordonnées
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

// Validation des coordonnées
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Calcul de distance entre deux points (formule de Haversine)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Formatage des types d'alerte
export function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    frost: 'Gelée',
    drought: 'Sécheresse',
    disease_risk: 'Risque de maladie',
    heavy_rain: 'Pluie excessive',
    wind: 'Vent fort',
    hail: 'Grêle',
    pest_risk: 'Risque de ravageurs',
    custom: 'Personnalisée'
  };
  return labels[type] || type;
}

export function getAlertTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    frost: '❄️',
    drought: '🌵',
    disease_risk: '🦠',
    heavy_rain: '🌧️',
    wind: '💨',
    hail: '🧊',
    pest_risk: '🐛',
    custom: '⚠️'
  };
  return icons[type] || '⚠️';
}

// Formatage des niveaux de gravité
export function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    critical: 'Critique'
  };
  return labels[severity] || severity;
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  };
  return colors[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  };
  return icons[severity] || '⚪';
}

// Formatage des types de signalement
export function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    disease: 'Maladie',
    pest: 'Ravageur',
    weather_damage: 'Dégât météo',
    good_practice: 'Bonne pratique',
    market_info: 'Info marché',
    other: 'Autre'
  };
  return labels[type] || type;
}

export function getReportTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    disease: '🦠',
    pest: '🐛',
    weather_damage: '🌪️',
    good_practice: '✅',
    market_info: '💰',
    other: '📝'
  };
  return icons[type] || '📝';
}

// Formatage des types de sol
export function getSoilTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    argileux: 'Argileux',
    sableux: 'Sableux',
    limoneux: 'Limoneux',
    calcaire: 'Calcaire',
    humifère: 'Humifère',
    autre: 'Autre'
  };
  return labels[type] || type;
}

// Formatage des systèmes d'irrigation
export function getIrrigationSystemLabel(system: string): string {
  const labels: Record<string, string> = {
    aucun: 'Aucun',
    aspersion: 'Aspersion',
    goutte_a_goutte: 'Goutte à goutte',
    gravitaire: 'Gravitaire',
    pivot: 'Pivot',
    autre: 'Autre'
  };
  return labels[system] || system;
}

// Formatage des icônes météo
export function getWeatherIcon(iconCode: string): string {
  const icons: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
  };
  return icons[iconCode] || '🌤️';
}

// Gestion des erreurs
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return 'Une erreur inattendue est survenue';
}

// Validation des emails
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validation des mots de passe
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Génération d'ID unique
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Copier dans le presse-papiers
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Erreur lors de la copie:', err);
    return false;
  }
}

// Télécharger un fichier
export function downloadFile(data: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Obtenir la géolocalisation
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation non supportée'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    });
  });
}

// Formater les coordonnées pour l'affichage
export function formatCoordinatesForDisplay(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'O';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}