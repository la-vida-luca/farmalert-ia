import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useFarms';
import { useAlerts } from '@/hooks/useAlerts';
import { FarmCard } from '@/components/FarmCard';
import { AlertCard } from '@/components/AlertCard';
import { 
  formatDate, 
  getSeverityColor, 
  getAlertIcon 
} from '@/lib/utils';
import { 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  Farm, 
  Cloud, 
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { farms, loading: farmsLoading, refreshFarms } = useFarms();
  const { alerts, activeAlerts, loading: alertsLoading, refreshAlerts } = useAlerts();
  const [selectedFarm, setSelectedFarm] = useState<number | null>(null);

  useEffect(() => {
    refreshFarms();
    refreshAlerts();
  }, [refreshFarms, refreshAlerts]);

  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = activeAlerts.filter(alert => alert.severity === 'high');
  const recentAlerts = alerts.slice(0, 5);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getGreeting()}, {user?.firstName} !
              </h1>
              <p className="text-gray-600 mt-1">
                Voici un aperçu de vos fermes et alertes météo
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  refreshFarms();
                  refreshAlerts();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Link to="/farms/new">
                <Button variant="farm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle ferme
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-farm-green/10 rounded-lg">
                  <Farm className="h-6 w-6 text-farm-green" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Fermes</p>
                  <p className="text-2xl font-bold text-gray-900">{farms.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alertes actives</p>
                  <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critiques</p>
                  <p className="text-2xl font-bold text-gray-900">{criticalAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Cloud className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Surveillance</p>
                  <p className="text-2xl font-bold text-gray-900">24/7</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Alertes récentes */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                    Alertes récentes
                  </CardTitle>
                  <Link to="/alerts">
                    <Button variant="outline" size="sm">
                      Voir toutes
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : recentAlerts.length > 0 ? (
                  <div className="space-y-4">
                    {recentAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        showFarmName={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune alerte récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fermes */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Farm className="h-5 w-5 mr-2 text-farm-green" />
                    Mes fermes
                  </CardTitle>
                  <Link to="/farms">
                    <Button variant="outline" size="sm">
                      Gérer
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {farmsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : farms.length > 0 ? (
                  <div className="space-y-4">
                    {farms.slice(0, 3).map((farm) => (
                      <div key={farm.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{farm.name}</h3>
                          <Badge variant="farm">{farm.farmType}</Badge>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {farm.city}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(farm.createdAt)}
                        </div>
                      </div>
                    ))}
                    {farms.length > 3 && (
                      <div className="text-center">
                        <Link to="/farms">
                          <Button variant="outline" size="sm">
                            Voir les {farms.length - 3} autres fermes
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Farm className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Aucune ferme enregistrée</p>
                    <Link to="/farms/new">
                      <Button variant="farm" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une ferme
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alertes critiques */}
        {criticalAlerts.length > 0 && (
          <div className="mt-8">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Alertes critiques nécessitant une attention immédiate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {criticalAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      showFarmName={true}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};