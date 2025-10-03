import React from 'react';
import { Farm } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  getFarmTypeIcon, 
  getFarmTypeLabel, 
  formatDate 
} from '@/lib/utils';
import { 
  MapPin, 
  Calendar, 
  Edit, 
  Trash2, 
  Cloud, 
  Eye 
} from 'lucide-react';

interface FarmCardProps {
  farm: Farm;
  onEdit?: (farm: Farm) => void;
  onDelete?: (farmId: number) => void;
  onViewWeather?: (farmId: number) => void;
  showActions?: boolean;
}

export const FarmCard: React.FC<FarmCardProps> = ({ 
  farm, 
  onEdit, 
  onDelete, 
  onViewWeather,
  showActions = true 
}) => {
  const farmIcon = getFarmTypeIcon(farm.farmType);
  const farmTypeLabel = getFarmTypeLabel(farm.farmType);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{farmIcon}</span>
            <div>
              <CardTitle className="text-xl">{farm.name}</CardTitle>
              <Badge variant="farm" className="mt-1">
                {farmTypeLabel}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {farm.description && (
          <p className="text-sm text-muted-foreground">
            {farm.description}
          </p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{farm.address}, {farm.city} {farm.postalCode}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Ajoutée le {formatDate(farm.createdAt)}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium">Taille:</span>
            <span>{farm.size} hectares</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium">Coordonnées:</span>
            <span className="font-mono text-xs">
              {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
            </span>
          </div>
        </div>
        
        {showActions && (
          <div className="flex space-x-2 pt-2">
            {onViewWeather && (
              <Button
                size="sm"
                variant="weather"
                onClick={() => onViewWeather(farm.id)}
                className="flex-1"
              >
                <Cloud className="h-4 w-4 mr-1" />
                Météo
              </Button>
            )}
            
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(farm)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(farm.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};