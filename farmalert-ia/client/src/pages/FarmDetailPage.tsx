import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, ThermometerSun, Droplets, Wind, CloudRain, Sunrise } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { farmsService } from '../services/farmsService';
import { weatherService } from '../services/weatherService';
import type { Farm } from '../types/farm';

interface Weather {
  temp: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  description: string;
  icon: string;
}

const FarmDetailPage: React.FC = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<Weather[]>([]);
  const [cropType, setCropType] = useState('ble');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError('');
      const f = await farmsService.getById(token, Number(id));
      setFarm(f);
      const w = await weatherService.current(token, f.id);
      setWeather(w);
      const fc = await weatherService.forecast(token, f.id);
      setForecast(fc);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, token]);

  const handleCropChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCropType(value);
    // Optionally fetch optimal conditions/recommendations
    try {
      await weatherService.optimalConditions(token!, value);
    } catch {}
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!farm) return <div className="p-6">Ferme introuvable</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link to="/farms" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Retour aux fermes
      </Link>

      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold">{farm.name}</h1>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{farm.address} — {farm.region}</span>
          <span className="text-xs">({farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)})</span>
        </div>
      </div>

      {/* Crop selector for personalized weather */}
      <div className="mt-6 bg-white border rounded-xl p-4">
        <label className="text-sm text-gray-700 mr-3">Culture suivie</label>
        <select className="border rounded-lg px-3 py-2" value={cropType} onChange={handleCropChange}>
          <option value="ble">Blé</option>
          <option value="mais">Maïs</option>
          <option value="colza">Colza</option>
          <option value="pommes">Pommes</option>
          <option value="laitier">Prairies (laitier)</option>
          <option value="legumes">Légumes</option>
        </select>
      </div>

      {/* Current weather */}
      {weather && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <WeatherCard icon={<ThermometerSun className="w-5 h-5" />} label="Temp." value={`${Math.round(weather.temp)}°C`} />
          <WeatherCard icon={<Droplets className="w-5 h-5" />} label="Humidité" value={`${weather.humidity}%`} />
          <WeatherCard icon={<Wind className="w-5 h-5" />} label="Vent" value={`${weather.windSpeed} m/s`} />
          <WeatherCard icon={<CloudRain className="w-5 h-5" />} label="Pluie" value={`${weather.precipitation} mm`} />
          <WeatherCard icon={<Sunrise className="w-5 h-5" />} label="Conditions" value={weather.description} />
        </div>
      )}

      {/* Forecast */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Prévisions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {forecast.map((d, idx) => (
            <div key={idx} className="bg-white border rounded-xl p-4 text-center">
              <div className="text-sm text-gray-500">J+{idx+1}</div>
              <div className="text-2xl font-bold">{Math.round(d.temp)}°C</div>
              <div className="text-xs text-gray-600">Hum {d.humidity}% • Vent {d.windSpeed} m/s</div>
              <div className="text-xs text-gray-500 mt-1">{d.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WeatherCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white border rounded-xl p-4">
    <div className="flex items-center gap-2 text-gray-500 text-sm">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-xl font-semibold mt-1">{value}</div>
  </div>
);

export default FarmDetailPage;
