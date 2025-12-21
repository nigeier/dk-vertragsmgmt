'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface LoginResponse {
  user: User;
  expiresIn: number;
  requiresTwoFactor?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    twoFactorCode?: string,
  ) => Promise<{ requiresTwoFactor?: boolean }>;
  logout: () => Promise<void>;
  /** Prüft ob User die Rolle oder eine höhere hat (Hierarchie: ADMIN > MANAGER > USER > VIEWER) */
  hasRole: (role: string) => boolean;
  /** Prüft ob User exakt diese Rolle hat (ohne Hierarchie) */
  hasExactRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async (): Promise<void> => {
    // Mit httpOnly Cookies brauchen wir kein localStorage mehr
    // Der Cookie wird automatisch mitgesendet
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
    } catch {
      // Kein gültiger Token/Cookie
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (
    email: string,
    password: string,
    twoFactorCode?: string,
  ): Promise<{ requiresTwoFactor?: boolean }> => {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
      twoFactorCode,
    });

    // Wenn 2FA erforderlich ist
    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true };
    }

    // Cookie wird automatisch vom Backend gesetzt
    // Wir speichern nur noch den User im State
    setUser(data.user);

    return {};
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
    }
  };

  /**
   * Rollen-Hierarchie: ADMIN > MANAGER > USER > VIEWER
   * hasRole('MANAGER') ist true für ADMIN und MANAGER
   */
  const ROLE_HIERARCHY: Record<string, number> = {
    ADMIN: 4,
    MANAGER: 3,
    USER: 2,
    VIEWER: 1,
  };

  const hasRole = (requiredRole: string): boolean => {
    if (!user?.role) return false;
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
  };

  const hasExactRole = (role: string): boolean => {
    return user?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasExactRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
