import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FarmProvider } from './contexts/FarmContext';
import { UserProvider } from './contexts/UserContext';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FarmsPage from './pages/FarmsPage';
import FarmDetailPage from './pages/FarmDetailPage';
import AddFarmPage from './pages/AddFarmPage';
import EditFarmPage from './pages/EditFarmPage';
import SettingsPage from './pages/SettingsPage';
import WeatherPage from './pages/WeatherPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

// Interface pour les utilisateurs
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: {
    theme: 'light' | 'dark';
    language: 'fr' | 'en';
    notifications: boolean;
  };
}

// Interface pour les fermes
interface Farm {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  area: number;
  crop: string;
  owner: string;
  description?: string;
  image?: string;
  createdAt: Date;
  weather?: {
    temperature: number;
    humidity: number;
    conditions: string;
    windSpeed: number;
  };
}

// Composant pour les routes protégées
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Composant pour les routes publiques (redirection si connecté)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Chargement...</p>
      </div>
    );
  }
  
  return !user ? <>{children}</> : <Navigate to="/farms" replace />;
};

// Composant Layout pour les pages authentifiées
const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    // Charger le thème depuis localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  return (
    <AuthProvider>
      <UserProvider>
        <FarmProvider>
          <Router>
            <div className={`app ${theme}`}>
              <Routes>
                {/* Routes publiques */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route 
                  path="/login" 
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  } 
                />
                
                {/* Routes protégées */}
                <Route 
                  path="/farms" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <FarmsPage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/farms/add" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <AddFarmPage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/farms/:id" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <FarmDetailPage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/farms/:id/edit" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <EditFarmPage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/weather" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <WeatherPage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <SettingsPage onThemeToggle={toggleTheme} currentTheme={theme} />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <ProfilePage />
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Route par défaut */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </Router>
        </FarmProvider>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
export type { User, Farm };
