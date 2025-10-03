import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://farmalert-ia-production.up.railway.app';

type ApiSuccess = { success?: boolean; token?: string };

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      console.log('[Auth] submit', { isLogin, email, endpoint, API_URL });

      const response = await axios.post<ApiSuccess>(`${API_URL}${endpoint}`, { email, password });
      console.log('[Auth] response', response?.status, response?.data);

      if (isLogin) {
        if (response?.data?.token) {
          localStorage.setItem('token', response.data.token as string);
          setIsAuthenticated(true);
          setMessage('Connexion réussie.');
        } else {
          setError("Le serveur n'a pas renvoyé de jeton.");
          console.log('[Auth] missing token on login');
        }
      } else {
        if (response?.data?.success === true || response?.status === 200 || response?.status === 201) {
          setMessage('Inscription réussie. Vous pouvez maintenant vous connecter.');
          setIsLogin(true);
        } else {
          setError("L'inscription n'a pas abouti.");
          console.log('[Auth] unexpected register response', response?.data);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Une erreur est survenue';
      setError(msg);
      console.log('[Auth] error', {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
        url: `${API_URL}${isLogin ? '/api/auth/login' : '/api/auth/register'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Bienvenue!</h1>
          <p>Vous êtes connecté avec succès.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">{isLogin ? 'Connexion' : 'Créer un compte'}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="votre@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-700 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Veuillez patienter…' : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <div className="text-sm mt-4">
          {isLogin ? (
            <button
              className="text-blue-600 hover:underline"
              onClick={() => { setIsLogin(false); setError(null); setMessage(null); }}
              type="button"
            >
              Pas de compte ? Créer un compte
            </button>
          ) : (
            <button
              className="text-blue-600 hover:underline"
              onClick={() => { setIsLogin(true); setError(null); setMessage(null); }}
              type="button"
            >
              Déjà un compte ? Se connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
