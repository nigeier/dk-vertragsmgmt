/**
 * Zentrale Auth-Types für das Backend
 */

/**
 * JWT Payload - Inhalt des Access Tokens
 */
export interface JwtPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  exp?: number;
  iat?: number;
}

/**
 * Refresh Token JWT Payload
 */
export interface RefreshTokenPayload {
  sub: string;
  token: string;
  type: 'refresh';
}

/**
 * Authentifizierter Benutzer (aus Request extrahiert)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roles: string[]; // Für Kompatibilität mit @Roles() Decorator
}

/**
 * Login-Kontext mit Request-Metadaten
 */
export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}
