import React from 'react';
import { WeatherResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherIcon } from '@/components/WeatherIcon';
import { 
  formatTemperature, 
  formatHumidity, 
  formatWindSpeed, 
  formatPrecipitation,
  formatPressure,
  formatVisibility,
  getWindDirection,
  formatDate
} from '@/lib/utils';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  CloudRain, 
  Gauge, 
  Eye 
} from 'lucide-react';

interface WeatherCardProps {
  weather: WeatherResponse;
  farmName?: string;
  showDetails?: boolean;
  className?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ 
  weather, 
  farmName, 
  showDetails = true,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              {farmName ? `Météo - ${farmName}` : 'Conditions météo'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDate(weather.timestamp)}
            </p>
          </div>
          <WeatherIcon condition={weather.weatherCondition} size={32} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Température principale */}
        <div className="text-center">
          <div className="text-4xl font-bold text-farm-blue">
            {formatTemperature(weather.temperature)}
          </div>
          <p className="text-sm text-muted-foreground capitalize">
            {weather.weatherDescription}
          </p>
        </div>
        
        {showDetails && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Humidité</p>
                <p className="font-medium">{formatHumidity(weather.humidity)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vent</p>
                <p className="font-medium">
                  {formatWindSpeed(weather.windSpeed)} {getWindDirection(weather.windDirection)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <CloudRain className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Précipitations</p>
                <p className="font-medium">{formatPrecipitation(weather.precipitation)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pression</p>
                <p className="font-medium">{formatPressure(weather.pressure)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-xs text-muted-foreground">Visibilité</p>
                <p className="font-medium">{formatVisibility(weather.visibility)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">UV Index</p>
                <p className="font-medium">{weather.uvIndex.toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};