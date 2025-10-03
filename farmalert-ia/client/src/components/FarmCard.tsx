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
