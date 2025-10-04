import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://farmalert-ia-production.up.railway.app'

const Icons = {
  farm: '🌾',
  alert: '⚠️',
  rain: '🌧️',
  sun: '☀️',
  temp: '🌡️',
  wind: '💨',
  crop: '🧑‍🌾',
  map: '🗺️'
}

const colors = {
  brand: '#2E7D32',
  brandDark: '#1B5E20',
  brandLight: '#A5D6A7',
  accent: '#F9A825',
  bg: '#F4F8F2',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB'
}

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/farms" element={<FarmsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password })
      if (data?.token) {
        localStorage.setItem('token', data.token)
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Échec de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ ...cardStyle, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 32 }}>{Icons.farm}</span>
          <h1 style={{ 
            color: colors.brand, 
            fontSize: 24, 
            fontWeight: 'bold', 
            margin: '8px 0 4px' 
          }}>
            FarmAlert IA
          </h1>
          <p style={{ color: colors.muted, fontSize: 14 }}>
            Système intelligent d'alertes agricoles
          </p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 14, 
              fontWeight: 'medium', 
              color: colors.text, 
              marginBottom: 6 
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.brand
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border
              }}
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: 'block', 
              fontSize: 14, 
              fontWeight: 'medium', 
              color: colors.text, 
              marginBottom: 6 
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.brand
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border
              }}
            />
          </div>
          
          {error && (
            <div style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: 12,
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? colors.muted : colors.brand,
              color: 'white',
              border: 'none',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 'medium',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DashboardPage() {
  const [stats] = useState([
    { icon: Icons.farm, label: 'Fermes', value: '12', color: colors.brand },
    { icon: Icons.alert, label: 'Alertes actives', value: '3', color: colors.accent },
    { icon: Icons.temp, label: 'Température', value: '24°C', color: '#3B82F6' },
    { icon: Icons.rain, label: 'Pluviométrie', value: '5mm', color: '#6366F1' }
  ])

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 24 }}>{Icons.farm}</span>
          <h1 style={{ color: colors.brand, fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            Tableau de bord
          </h1>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{stat.icon}</span>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 14 }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ ...cardStyle }}>
          <h2 style={{ color: colors.text, fontSize: 20, margin: '0 0 16px' }}>
            Dernières alertes
          </h2>
          <div style={{ color: colors.muted }}>
            Système de surveillance météorologique en temps réel pour optimiser vos cultures.
          </div>
        </div>
      </div>
    </div>
  )
}

function FarmsPage() {
  const [farms] = useState([
    { id: '1', name: 'Ferme du Nord', crop: 'Blé', area: '120 ha' },
    { id: '2', name: 'Domaine Sud', crop: 'Maïs', area: '95 ha' },
    { id: '3', name: 'Exploitation Est', crop: 'Tournesol', area: '80 ha' }
  ])

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: colors.brand, fontSize: 28, fontWeight: 'bold', marginBottom: 24 }}>
          {Icons.farm} Mes Fermes
        </h1>
        
        <div style={{ display: 'grid', gap: 16 }}>
          {farms.map(farm => (
            <div key={farm.id} style={{ ...cardStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{Icons.crop}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 16, color: colors.text }}>
                      {farm.name}
                    </div>
                    <div style={{ color: colors.muted, fontSize: 14 }}>
                      Culture principale: {farm.crop}
                    </div>
                  </div>
                </div>
                <div style={{ color: colors.muted, fontSize: 14 }}>
                  {farm.area}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AlertsPage() {
  const [alerts] = useState([
    { 
      id: 'a1', 
      title: 'Orage intense', 
      severity: 'Haute' as const, 
      description: 'Risque de grêle et fortes pluies', 
      when: "Aujourd'hui 16:00-22:00" 
    },
    { 
      id: 'a2', 
      title: 'Vent fort', 
      severity: 'Moyenne' as const, 
      description: 'Rafales jusqu\'à 70 km/h', 
      when: 'Demain 10:00-18:00' 
    }
  ])

  const getSeverityColor = (severity: 'Basse' | 'Moyenne' | 'Haute') => {
    switch (severity) {
      case 'Haute': return '#EF4444'
      case 'Moyenne': return '#F59E0B'
      case 'Basse': return '#10B981'
      default: return colors.muted
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ color: colors.brand, fontSize: 28, fontWeight: 'bold', marginBottom: 24 }}>
          {Icons.alert} Alertes météo
        </h1>
        
        <div style={{ display: 'grid', gap: 16 }}>
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              style={{ 
                ...cardStyle, 
                borderLeft: `4px solid ${getSeverityColor(alert.severity)}` 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{Icons.alert}</span>
                <div style={{ fontWeight: 'bold', fontSize: 16, color: colors.text }}>
                  {alert.title}
                </div>
              </div>
              <div style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>
                Sévérité: {alert.severity} • {alert.when}
              </div>
              <div style={{ color: colors.text, fontSize: 14 }}>
                {alert.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
