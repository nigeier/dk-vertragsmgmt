/**
 * User-related types shared between frontend and backend
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department?: string;
  roles: UserRole[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.USER]: 'Benutzer',
  [UserRole.VIEWER]: 'Betrachter',
};

export const USER_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    'users:read',
    'users:write',
    'users:delete',
    'contracts:read',
    'contracts:write',
    'contracts:delete',
    'contracts:approve',
    'documents:read',
    'documents:write',
    'documents:delete',
    'reports:read',
    'reports:export',
    'settings:read',
    'settings:write',
    'audit:read',
  ],
  [UserRole.MANAGER]: [
    'contracts:read',
    'contracts:write',
    'contracts:approve',
    'documents:read',
    'documents:write',
    'reports:read',
    'reports:export',
    'audit:read',
  ],
  [UserRole.USER]: [
    'contracts:read',
    'contracts:write',
    'documents:read',
    'documents:write',
  ],
  [UserRole.VIEWER]: [
    'contracts:read',
    'documents:read',
  ],
};
