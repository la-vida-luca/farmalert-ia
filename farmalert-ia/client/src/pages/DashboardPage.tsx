import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFarms } from '@/hooks/useFarms';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertCard } from '@/components/AlertCard';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  AlertTriangle,
  Cloud,
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
}
