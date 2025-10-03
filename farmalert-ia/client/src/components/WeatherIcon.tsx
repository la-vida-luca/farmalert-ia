import React from 'react';
import { getWeatherIcon } from '@/lib/utils';

interface WeatherIconProps {
  condition: string;
  size?: number;
  className?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ 
  condition, 
  size = 24, 
  className = '' 
}) => {
  const icon = getWeatherIcon(condition);
  
  return (
    <span 
      className={`text-${size} ${className}`}
      style={{ fontSize: `${size}px` }}
      role="img"
      aria-label={`Condition météo: ${condition}`}
    >
      {icon}
    </span>
  );
};