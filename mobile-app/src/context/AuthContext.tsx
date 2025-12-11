import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { User, StartGGAuthResponse } from '../types';
import { authService } from '../services/authService';
import { getStartGGConfig } from '../config/startgg';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
};

// Configuración OAuth para start.gg usando config de producción
const startGGConfig = getStartGGConfig();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: START_GG_CLIENT_ID,
      scopes: ['user:read', 'tournament:read'],
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Code,
      state: AuthSession.AuthRequest.createRandomStateString(),
    },
    discovery
  );

  const isAuthenstartGGConfig.clientId,
      scopes: startGGConfig.scopes,
      redirectUri: startGGConfig.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      state: AuthSession.AuthRequest.createRandomStateString(),
    },
    startGGConfig.eEffect(() => {
    if (response?.type === 'success') {
      exchangeCodeForToken(response.params.code);
    }
  }, [response]);

  const initializeAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Validar token con el servidor
        const isValid = await authService.validateToken(storedToken);
        if (!isValid) {
          await logout();
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      setIsLoading(true);
      
      // Intercambiar código por token con nuestro backend
      const authResponse = await authService.exchangeStartGGCode(code, startGGConfig.redirectUri);
      
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authResponse.access_token);
      if (authResponse.refresh_token) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authResponse.refresh_token);
      }
      
      // Crear objeto de usuario desde la respuesta
      const userData: User = {
        id: authResponse.user.id,
        startggId: authResponse.user.id,
        name: authResponse.user.name,
        tag: authResponse.user.slug,
        email: authResponse.user.email,
        avatar: authResponse.user.avatar,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      setUser(userData);
      
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    if (!request) {
      throw new Error('Auth request not ready');
    }
    
    try {
      await promptAsync();
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Limpiar storage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
      
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token || !user) return;

      const updatedUser = await authService.getCurrentUser(token);
      const userData: User = {
        ...user,
        ...updatedUser,
      };

      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};