import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
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
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
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
      return { ...initialState, isInitialized: true };
    default:
      return state;
  }
};

// Contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialiser l'authentification au montage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          dispatch({ type: 'SET_TOKEN', payload: token });
          const user = await authService.getProfile();
          dispatch({ type: 'SET_USER', payload: user });
        } catch (error) {
          removeAuthToken();
          dispatch({ type: 'LOGOUT' });
        }
      }
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    };

    initAuth();
  }, []);

  // Fonctions du contexte
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.login(credentials);
      setAuthToken(response.token);
      dispatch({ type: 'SET_TOKEN', payload: response.token });
      dispatch({ type: 'SET_USER', payload: response.user as AuthUser });
      toast.success('Connexion réussie !');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.register(data);
      setAuthToken(response.token);
      dispatch({ type: 'SET_TOKEN', payload: response.token });
      dispatch({ type: 'SET_USER', payload: response.user as AuthUser });
      toast.success('Inscription réussie !');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur d\'inscription');
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = (): void => {
    removeAuthToken();
    dispatch({ type: 'LOGOUT' });
    toast.info('Déconnexion réussie');
  };

  const updateUser = (user: AuthUser): void => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook pour utiliser le contexte
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
