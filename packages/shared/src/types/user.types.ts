/**
 * User-related types shared between frontend and backend
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

// UserStatus: Registrierungs-Workflow
// PENDING → ACTIVE oder REJECTED durch Admin
export enum UserStatus {
  PENDING = 'PENDING', // Wartet auf Admin-Freigabe
  ACTIVE = 'ACTIVE', // Freigeschaltet
  REJECTED = 'REJECTED', // Abgelehnt
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  isActive: boolean; // Temporäre Suspendierung
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
}

// Tokens werden via httpOnly Cookies verwaltet, nicht im Client
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
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
  [UserRole.USER]: ['contracts:read', 'contracts:write', 'documents:read', 'documents:write'],
  [UserRole.VIEWER]: ['contracts:read', 'documents:read'],
};
