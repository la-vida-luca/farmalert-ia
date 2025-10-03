import React from 'react';
import { Alert } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  formatRelativeTime, 
  getAlertIcon, 
  getSeverityColor 
} from '@/lib/utils';
import { CheckCircle, Clock } from 'lucide-react';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (alertId: number) => void;
  showFarmName?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({ 
  alert, 
  onAcknowledge, 
  showFarmName = false 
}) => {
  const handleAcknowledge = () => {
    if (onAcknowledge) {
      onAcknowledge(alert.id);
    }
  };

  const severityColor = getSeverityColor(alert.severity);
  const alertIcon = getAlertIcon(alert.type);

  return (
    <Card className={`border-l-4 ${
      alert.severity === 'critical' ? 'border-red-500' :
      alert.severity === 'high' ? 'border-orange-500' :
      alert.severity === 'medium' ? 'border-yellow-500' :
      'border-green-500'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{alertIcon}</span>
            <div>
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              {showFarmName && alert.farmName && (
                <p className="text-sm text-muted-foreground">
                  Ferme: {alert.farmName}
                </p>
              )}
            </div>
          </div>
          <Badge className={severityColor}>
            {alert.severity === 'critical' ? 'Critique' :
             alert.severity === 'high' ? 'Élevé' :
             alert.severity === 'medium' ? 'Moyen' : 'Faible'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            {alert.description}
          </p>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">
              💡 Recommandation:
            </p>
            <p className="text-sm text-blue-800">
              {alert.recommendation}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(alert.triggeredAt)}</span>
          </div>
          
          {alert.isActive && onAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAcknowledge}
              className="h-8 px-3 text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Marquer comme lu
            </Button>
          )}
          
          {!alert.isActive && alert.acknowledgedAt && (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>Lue {formatRelativeTime(alert.acknowledgedAt)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};