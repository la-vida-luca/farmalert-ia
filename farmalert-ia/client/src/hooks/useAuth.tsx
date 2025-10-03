import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { authService, setAuthToken, removeAuthToken } from '@/services/api';
import type { AuthUser, LoginCredentials, RegisterData } from '@/types';

// Types pour le contexte
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

// Actions du reducer
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'LOGOUT' };

// État initial
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialisation de l'authentification
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          setAuthToken(token);
          dispatch({ type: 'SET_TOKEN', payload: token });
          
          // Vérifier si le token est encore valide en récupérant le profil
          const response = await authService.getProfile();
          dispatch({ type: 'SET_USER', payload: response });
        } catch (error) {
          // Token invalide, nettoyer le localStorage
          removeAuthToken();
          dispatch({ type: 'SET_TOKEN', payload: null });
          dispatch({ type: 'SET_USER', payload: null });
        }
      }
      
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    };

    initializeAuth();
  }, []);

  // Fonction de connexion
  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.login(credentials.email, credentials.password);
      
      // Sauvegarder le token et les données utilisateur
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      dispatch({ type: 'SET_TOKEN', payload: response.token });
      dispatch({ type: 'SET_USER', payload: response.user });
      
      toast.success('Connexion réussie !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de la connexion';
      toast.error(errorMessage);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Fonction d'inscription
  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.register(data);
      
      // Sauvegarder le token et les données utilisateur
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      dispatch({ type: 'SET_TOKEN', payload: response.token });
      dispatch({ type: 'SET_USER', payload: response.user });
      
      toast.success('Compte créé avec succès !');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erreur lors de l\'inscription';
      toast.error(errorMessage);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Fonction de déconnexion
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignorer les erreurs lors de la déconnexion
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      removeAuthToken();
      dispatch({ type: 'LOGOUT' });
      toast.info('Déconnexion réussie');
    }
  };

  // Fonction de mise à jour de l'utilisateur
  const updateUser = (user: AuthUser) => {
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'SET_USER', payload: user });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte d'authentification
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}

// Hook pour vérifier si l'utilisateur est authentifié
export function useIsAuthenticated(): boolean {
  const { user, token } = useAuth();
  return !!(user && token);
}

// Hook pour obtenir les informations de l'utilisateur
export function useUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}