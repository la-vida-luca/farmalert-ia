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
  Cloud
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {farmIcon}
            <CardTitle>{farm.name}</CardTitle>
          </div>
          <Badge variant="secondary">{farmTypeLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{farm.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created: {formatDate(farm.createdAt)}</span>
          </div>
        </div>
        {showActions && (
          <div className="flex gap-2 mt-4">
            {onViewWeather && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewWeather(farm.id)}
              >
                <Cloud className="h-4 w-4 mr-2" />
                Weather
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(farm)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(farm.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
