import React, { useEffect, useMemo, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type ApiSuccess = { success?: boolean; token?: string; message?: string }

type Farm = {
  _id?: string
  name: string
  location: string
  cropType?: string
  areaHa?: number
  lat?: number
  lon?: number
}

type WeatherAlert = {
  _id?: string
  type: 'FROST' | 'HEAT' | 'WIND' | 'RAIN' | 'HAIL' | 'DROUGHT'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  farmId?: string
  createdAt?: string
}

function useAuth() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data } = await axios.post<ApiSuccess>(`${API_URL}/api/auth/login`, { email, password })
      if (data?.token) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
        return { ok: true }
      }
      return { ok: false, error: 'Token manquant' }
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erreur de connexion' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data } = await axios.post<ApiSuccess>(`${API_URL}/api/auth/register`, { email, password })
      if (data?.success) {
        return { ok: true }
      }
      return { ok: false, error: 'Inscription échouée' }
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erreur d\'inscription' }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  return { token, setToken, loading, login, register, logout }
}

function useApi(token: string | null) {
  const client = useMemo(() => {
    const instance = axios.create({ baseURL: API_URL })
    instance.interceptors.request.use((config) => {
      if (token) (config.headers as any).Authorization = `Bearer ${token}`
      return config
    })
    return instance
  }, [token])
  return client
}

function Topbar({ onLogout }: { onLogout: () => void }) {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>🌾 FarmAlert</span>
        <nav style={{ display: 'flex', gap: 10 }}>
          <Link to="/dashboard">Tableau de bord</Link>
          <Link to="/farms">Fermes</Link>
          <Link to="/alerts">Alertes météo</Link>
          <Link to="/settings">Paramètres</Link>
        </nav>
      </div>
      <button onClick={onLogout}>Se déconnecter</button>
    </header>
  )
}

function StatCard({ label, value, accent = '#16a34a' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, minWidth: 180 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  )
}

function DashboardHome({ api }: { api: ReturnType<typeof useApi> }) {
  const [stats, setStats] = useState<{ farms: number; activeAlerts: number; lastUpdate?: string }>({ farms: 0, activeAlerts: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true)
      try {
        const [farmsRes, alertsRes] = await Promise.all([
          api.get('/api/farms'),
          api.get('/api/alerts?active=true'),
        ])
        if (!mounted) return
        setStats({ farms: farmsRes.data?.length || 0, activeAlerts: alertsRes.data?.length || 0, lastUpdate: new Date().toISOString() })
      } catch (e) {
      } finally {
        setLoading(false)
      }
    }
    run()
    return () => { mounted = false }
  }, [api])

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Total fermes" value={loading ? '...' : stats.farms} />
        <StatCard label="Alertes actives" value={loading ? '...' : stats.activeAlerts} accent="#ef4444" />
        <StatCard label="Dernière mise à jour" value={stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleString() : '-'} accent="#3b82f6" />
      </div>
      <section>
        <h3>Activité récente</h3>
        <ul style={{ marginTop: 8, color: '#374151' }}>
          <li>Surveillez les risques météo pour vos parcelles en temps réel.</li>
          <li>Configurez des seuils d'alerte pour le gel, la chaleur, la pluie et le vent.</li>
          <li>Ajoutez vos fermes et localisations pour une précision accrue.</li>
        </ul>
      </section>
    </div>
  )
}

function FarmsPage({ api }: { api: ReturnType<typeof useApi> }) {
  const empty: Farm = { name: '', location: '', cropType: '', areaHa: undefined }
  const [farms, setFarms] = useState<Farm[]>([])
  const [form, setForm] = useState<Farm>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/farms')
      setFarms(data || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement des fermes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setError(null)
    setLoading(true)
    try {
      if (form._id) {
        await api.put(`/api/farms/${form._id}`, form)
      } else {
        await api.post('/api/farms', form)
      }
      setForm(empty)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id?: string) => {
    if (!id) return
    setLoading(true)
    try {
      await api.delete(`/api/farms/${id}`)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Suppression échouée')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h3>Gestion des fermes</h3>

      <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <input placeholder="Nom de la ferme" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Localisation (ville, pays)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Culture (blé, maïs...)" value={form.cropType || ''} onChange={e => setForm({ ...form, cropType: e.target.value })} />
          <input type="number" step="0.1" placeholder="Surface (ha)" value={form.areaHa || ''} onChange={e => setForm({ ...form, areaHa: Number(e.target.value) })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" step="0.0001" placeholder="Latitude" value={form.lat || ''} onChange={e => setForm({ ...form, lat: Number(e.target.value) })} />
          <input type="number" step="0.0001" placeholder="Longitude" value={form.lon || ''} onChange={e => setForm({ ...form, lon: Number(e.target.value) })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} disabled={loading || !form.name || !form.location}>{form._id ? 'Mettre à jour' : 'Ajouter la ferme'}</button>
          <button onClick={() => setForm(empty)} disabled={loading}>Réinitialiser</button>
        </div>
        {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <h4>Vos fermes</h4>
        {loading && <div>Chargement…</div>}
        {!loading && farms.length === 0 && <div>Aucune ferme pour le moment.</div>}
        <ul style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {farms.map(f => (
            <li key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{f.location} • {f.cropType || 'Culture N/A'} • {f.areaHa ? `${f.areaHa} ha` : 'Surface N/A'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setForm(f)}>Éditer</button>
                <button onClick={() => remove(f._id)} style={{ color: '#b91c1c' }}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AlertsPage({ api }: { api: ReturnType<typeof useApi> }) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newAlert, setNewAlert] = useState<WeatherAlert>({ type: 'FROST', severity: 'medium', message: '' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/alerts')
      setAlerts(data || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur de chargement des alertes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    setError(null)
    setLoading(true)
    try {
      await api.post('/api/alerts', newAlert)
      setNewAlert({ type: 'FROST', severity: 'medium', message: '' })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Création d\'alerte échouée')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id?: string) => {
    if (!id) return
    setLoading(true)
    try { await api.delete(`/api/alerts/${id}`); await load() } catch (e: any) {
      setError(e?.response?.data?.message || 'Suppression échouée')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h3>Alertes météo</h3>

      <div style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={newAlert.type} onChange={e => setNewAlert({ ...newAlert, type: e.target.value as WeatherAlert['type'] })}>
            <option value="FROST">Gel</option>
            <option value="HEAT">Canicule</option>
            <option value="WIND">Vent</option>
            <option value="RAIN">Pluie</option>
            <option value="HAIL">Grêle</option>
            <option value="DROUGHT">Sécheresse</option>
          </select>
          <select value={newAlert.severity} onChange={e => setNewAlert({ ...newAlert, severity: e.target.value as WeatherAlert['severity'] })}>
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Élevée</option>
            <option value="critical">Critique</option>
          </select>
        </div>
        <input placeholder="Message / consignes" value={newAlert.message} onChange={e => setNewAlert({ ...newAlert, message: e.target.value })} />
        <div>
          <button onClick={create} disabled={loading || !newAlert.message}>Créer une alerte</button>
        </div>
        {error && <div style={{ color: '#b91c1c' }}>{error}</div>}
      </div>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <h4>Liste des alertes</h4>
        {loading && <div>Chargement…</div>}
        {!loading && alerts.length === 0 && <div>Aucune alerte.</div>}
        <ul style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {alerts.map(a => (
            <li key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.type} • {a.severity.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{a.message}</div>
              </div>
             
