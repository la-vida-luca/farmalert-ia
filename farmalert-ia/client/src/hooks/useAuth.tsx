import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginFormData, RegisterFormData } from '../types';
import apiService from '../services/api';
import { toast } from 'react-toastify';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Vérifier que le token est toujours valide
          await apiService.getProfile();
        } catch (error) {
          // Token invalide, nettoyer le localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login(data);
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success('Connexion réussie !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur de connexion';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const { confirmPassword, ...registerData } = data;
      
      if (data.password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      const response = await apiService.register(registerData);
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      toast.success('Inscription réussie !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur d\'inscription';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    toast.info('Déconnexion réussie');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};