import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://farmalert-ia-production.up.railway.app'

const Icons = { farm: '🌾', alert: '⚠️', rain: '🌧️', sun: '☀️', temp: '🌡️', wind: '💨', crop: '🧑‍🌾', map: '🗺️' }

const colors = { brand: '#2E7D32', brandDark: '#1B5E20', brandLight: '#A5D6A7', accent: '#F9A825', bg: '#F4F8F2', card: '#FFFFFF', text: '#1F2937', muted: '#6B7280', border: '#E5E7EB' }

const cardStyle: React.CSSProperties = { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
        <Route path="/farms" element={<DashboardLayout><FarmsPage /></DashboardLayout>} />
        <Route path="/alerts" element={<DashboardLayout><AlertsPage /></DashboardLayout>} />
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
      setError(err?.response?.data?.message || 'Echec de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: colors.bg }}>
      <div style={{ ...cardStyle, width: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{Icons.farm}</span>
          <h1 style={{ margin: 0, color: colors.brand }}>FarmAlert IA</h1>
        </div>
        <p style={{ marginTop: 0, color: colors.muted }}>Connectez-vous pour accéder au tableau de bord.</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.border}` }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.border}` }} />
          </div>
          {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 14px', background: colors.brand, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' }}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        </form>
      </div>
    </div>
  )
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, display: 'grid', gridTemplateColumns: '260px 1fr' }}>
      <aside style={{ background: '#ffffff', borderRight: `1px solid ${colors.border}`, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 26 }}>{Icons.farm}</span>
          <strong style={{ color: colors.brand }}>FarmAlert IA</strong>
        </div>
        <nav style={{ display: 'grid', gap: 8 }}>
          <NavItem to="/dashboard" label="Tableau de bord" icon={Icons.map} />
          <NavItem to="/farms" label="Fermes" icon={Icons.crop} />
          <NavItem to="/alerts" label="Alertes météo" icon={Icons.alert} />
        </nav>
        <div style={{ marginTop: 24, borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
          <button onClick={() => { localStorage.removeItem('token'); navigate('/login') }} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'white', cursor: 'pointer' }}>Déconnexion</button>
        </div>
      </aside>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}

function NavItem({ to, label, icon }: { to: string, label: string, icon: string }) {
  const isActive = location.pathname === to
  return (
    <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', textDecoration: 'none', color: isActive ? colors.brandDark : colors.text, background: isActive ? colors.brandLight : 'transparent', borderRadius: 10 }}>
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function StatCard({ title, value, trend, icon, accent }: { title: string, value: string, trend?: string, icon: string, accent?: string }) {
  return (
    <div style={{ ...cardStyle }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: colors.muted, fontSize: 12 }}>{title}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
          {trend && <div style={{ color: colors.brandDark, fontSize: 12 }}>{trend}</div>}
        </div>
        <div style={{ fontSize: 28 }}>{icon}</div>
      </div>
      {accent && <div style={{ height: 4, marginTop: 12, borderRadius: 999, background: accent }} />}
    </div>
  )
}

function Section({ title, action, children }: { title: string, action?: React.ReactNode, children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {action}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </section>
  )
}

function DashboardHome() {
  const [stats] = useState({ farms: 3, activeAlerts: 2, rainfall: 12.4, avgTemp: 22 })
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Tableau de bord</h2>
          <p style={{ margin: 0, color: colors.muted }}>Vue d’ensemble des fermes et alertes météo</p>
        </div>
        <Link to="/alerts" style={{ background: colors.accent, color: '#1F2937', padding: '10px 12px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Voir les alertes</Link>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <StatCard title="Fermes suivies" value={`${stats.farms}`} trend="+1 ce mois" icon={Icons.farm} accent={colors.brand} />
        <StatCard title="Alertes actives" value={`${stats.activeAlerts}`} trend="-1 cette semaine" icon={Icons.alert} accent="#EF4444" />
        <StatCard title="Pluviométrie (7j)" value={`${stats.rainfall} mm`} icon={Icons.rain} accent={colors.accent} />
        <StatCard title="Température moyenne" value={`${stats.avgTemp}°C`} icon={Icons.temp} accent="#60A5FA" />
      </div>
      <Section title="Fermes">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[{ name: 'Ferme du Nord', crop: 'Blé', area: '120 ha' }, { name: 'Domaine Sud', crop: 'Maïs', area: '95 ha' }, { name: 'Valée Bio', crop: 'Soja', area: '60 ha' }].map((f, i) => (
            <div key={i} style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{Icons.crop}</span>
                <strong>{f.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: 10, color: colors.muted, marginTop: 8, fontSize: 13 }}>
                <span>Culture: {f.crop}</span>
                <span>Surface: {f.area}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Alertes météo" action={<Link to="/alerts">Tout voir</Link>}>
        <div style={{ display: 'grid', gap: 10 }}>
          {[{ type: 'Orage', severity: 'Haute', when: 'Aujourd’hui', icon: Icons.rain }, { type: 'Vent fort', severity: 'Moyenne', when: 'Demain', icon: Icons.wind }].map((a, i) => (
            <div key={i} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div>
                  <strong>{a.type}</strong>
                  <div style={{ color: colors.muted, fontSize: 12 }}>Sévérité: {a.severity} • {a.when}</div>
                </div>
              </div>
              <Link to="/alerts" style={{ textDecoration: 'none', color: colors.brand }}>Détails</Link>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function FarmsPage() {
  const [farms] = useState<Array<{ id: string; name: string; crop: string; area: string }>>([
    { id: '1', name: 'Ferme du Nord', crop: 'Blé', area: '120 ha' },
    { id: '2', name: 'Domaine Sud', crop: 'Maïs', area: '95 ha' },
  ])
  return (
    <div>
      <h2>Fermes</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {farms.map(f => (
          <div key={f.id} style={{ ...cardStyle }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{Icons.crop}</span>
                <strong>{f.name}</strong>
              </div>
              <div style={{ color: colors.muted }}>{f.area}</div>
            </div>
            <div style={{ color: colors.muted, marginTop: 6 }}>Culture principale: {f.crop}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertsPage() {
  const [alerts] = useState<Array<{ id: string; title: string; severity: 'Basse'|'Moyenne'|'Haute'; description: string; when: string }>>([
    { id: 'a1', title: 'Orage intense', severity: 'Haute', description: 'Risque de grêle et fortes pluies', when: 'Aujourd’hui 16:00-22:00' },
    { id: 'a2', title: 'Vent fort', severity: 'Moyenne', description: 'Rafales jusqu’à 70 km/h', when: 'Demain 10:00-18:00' },
  ])
  const sevColor = (sev: string) => sev === 'Haute' ? '#EF4444' : sev === 'Moyenne' ? '#F59E0B' : '#10B981'
  return (
    <div>
      <h2>Alertes météo</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {alerts.map(a => (
          <div key={a.id} style={{ ...cardStyle, borderLeft: `4px solid ${sevColor(a.severity)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{Icons.alert}</span>
              <strong>{a.title}</strong>
            </div>
            <div style={{ color: colors.muted, fontSize: 13 }}>Sévérité: {a.severity} • {a.when}</div>
            <div style={{ marginTop: 6 }}>{a.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
