import React, { useEffect, useState } from 'react';
import { Save, Bell, Globe2, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { settingsService } from '../services/settingsService';

interface UserSettings {
  locale: 'fr' | 'en';
  units: 'metric' | 'imperial';
  weatherProvider: 'openweather';
  favoriteCrop: string;
  alertThresholds: {
    frostTemp: number; // °C
    windSpeed: number; // m/s
    rain24h: number; // mm
    humidityHigh: number; // %
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

const defaultSettings: UserSettings = {
  locale: 'fr',
  units: 'metric',
  weatherProvider: 'openweather',
  favoriteCrop: 'ble',
  alertThresholds: {
    frostTemp: 2,
    windSpeed: 15,
    rain24h: 20,
    humidityHigh: 85,
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
  },
};

const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const s = await settingsService.get(token!);
        if (s) setSettings(s);
      } catch {
        // keep defaults on error
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      await settingsService.update(token!, settings);
      setMessage('Paramètres enregistrés avec succès');
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {message && (
        <div className="mb-4 p-3 rounded border border-green-200 bg-green-50 text-green-700">{message}</div>
      )}

      <div className="space-y-6">
        {/* Localization */}
        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold">Langue et unités</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Langue</label>
              <select className="border rounded-lg px-3 py-2 w-full" value={settings.locale}
                onChange={(e) => setSettings({ ...settings, locale: e.target.value as any })}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Unités</label>
              <select className="border rounded-lg px-3 py-2 w-full" value={settings.units}
                onChange={(e) => setSettings({ ...settings, units: e.target.value as any })}
              >
                <option value="metric">Métrique (°C, m/s)</option>
                <option value="imperial">Impérial (°F, mph)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Culture favorite</label>
              <select className="border rounded-lg px-3 py-2 w-full" value={settings.favoriteCrop}
                onChange={(e) => setSettings({ ...settings, favoriteCrop: e.target.value })}
              >
                <option value="ble">Blé</option>
                <option value="mais">Maïs</option>
                <option value="colza">Colza</option>
                <option value="pommes">Pommes</option>
                <option value="laitier">Prairies (laitier)</option>
                <option value="legumes">Légumes</option>
              </select>
            </div>
          </div>
        </section>

        {/* Alert thresholds */}
        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold">Seuils d'alerte</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <NumericField label="Gelée (°C)" value={settings.alertThresholds.frostTemp}
              onChange={(v) => setSettings({ ...settings, alertThresholds: { ...settings.alertThresholds, frostTemp: v } })}
            />
            <NumericField label="Vent (m/s)" value={settings.alertThresholds.windSpeed}
              onChange={(v) => setSettings({ ...settings, alertThresholds: { ...settings.alertThresholds, windSpeed: v } })}
            />
            <NumericField label="Pluie 24h (mm)" value={settings.alertThresholds.rain24h}
              onChange={(v) => setSettings({ ...settings, alertThresholds: { ...settings.alertThresholds, rain24h: v } })}
            />
            <NumericField label="Humidité élevée (%)" value={settings.alertThresholds.humidityHigh}
              onChange={(v) => setSettings({ ...settings, alertThresholds: { ...settings.alertThresholds, humidityHigh: v } })}
            />
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <ToggleField label="Email" checked={settings.notifications.email}
              onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, email: v } })}
            />
            <ToggleField label="SMS" checked={settings.notifications.sms}
              onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, sms: v } })}
            />
            <ToggleField label="Push" checked={settings.notifications.push}
              onChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, push: v } })}
            />
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold">Confidentialité</h2>
          </div>
          <p className="text-sm text-gray-600">Vos données sont stockées de manière sécurisée et ne sont pas partagées avec des tiers.</p>
        </section>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

const NumericField: React.FC<{ label: string; value: number; onChange: (v: number) => void }>
= ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-1">{label}</label>
    <input type="number" className="border rounded-lg px-3 py-2 w-full" value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

const ToggleField: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }>
= ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

export default SettingsPage;
