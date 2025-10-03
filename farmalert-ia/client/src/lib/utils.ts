import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'À l\'instant';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }
}

export function getWeatherIcon(condition: string): string {
  const icons: { [key: string]: string } = {
    'Clear': '☀️',
    'Sunny': '☀️',
    'Clouds': '☁️',
    'Cloudy': '☁️',
    'Rain': '🌧️',
    'Rainy': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Storm': '⛈️',
    'Snow': '❄️',
    'Snowy': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️',
    'Smoke': '🌫️',
    'Dust': '🌪️',
    'Sand': '🌪️',
    'Ash': '🌋',
    'Squall': '💨',
    'Tornado': '🌪️'
  };
  
  return icons[condition] || '🌤️';
}

export function getAlertIcon(type: string): string {
  const icons: { [key: string]: string } = {
    'frost': '❄️',
    'drought': '🌵',
    'fungal_disease': '🍄',
    'excessive_rain': '🌧️',
    'strong_wind': '💨',
    'heat_wave': '🔥'
  };
  
  return icons[type] || '⚠️';
}

export function getSeverityColor(severity: string): string {
  const colors: { [key: string]: string } = {
    'low': 'text-green-600 bg-green-100',
    'medium': 'text-yellow-600 bg-yellow-100',
    'high': 'text-orange-600 bg-orange-100',
    'critical': 'text-red-600 bg-red-100'
  };
  
  return colors[severity] || 'text-gray-600 bg-gray-100';
}

export function getFarmTypeIcon(type: string): string {
  const icons: { [key: string]: string } = {
    'cereals': '🌾',
    'dairy': '🐄',
    'organic': '🌱',
    'livestock': '🐑',
    'vegetables': '🥕',
    'fruits': '🍎'
  };
  
  return icons[type] || '🚜';
}

export function getFarmTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    'cereals': 'Céréales',
    'dairy': 'Laitier',
    'organic': 'Biologique',
    'livestock': 'Élevage',
    'vegetables': 'Légumes',
    'fruits': 'Fruits'
  };
  
  return labels[type] || type;
}

export function formatTemperature(temp: number): string {
  return `${Math.round(temp)}°C`;
}

export function formatHumidity(humidity: number): string {
  return `${Math.round(humidity)}%`;
}

export function formatWindSpeed(speed: number): string {
  return `${Math.round(speed)} m/s`;
}

export function formatPrecipitation(precip: number): string {
  return `${precip.toFixed(1)} mm`;
}

export function formatPressure(pressure: number): string {
  return `${Math.round(pressure)} hPa`;
}

export function formatVisibility(visibility: number): string {
  return `${visibility.toFixed(1)} km`;
}

export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

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