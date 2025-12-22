import { Request } from 'express';

/**
 * Trusted proxy IPs - nur diese dürfen X-Forwarded-For setzen
 * Konfigurierbar via TRUSTED_PROXIES Umgebungsvariable (komma-separiert)
 */
const TRUSTED_PROXIES = new Set(
  (process.env.TRUSTED_PROXIES || '127.0.0.1,::1').split(',').map((ip) => ip.trim()),
);

/**
 * Extrahiert die Client-IP-Adresse aus dem Request
 * X-Forwarded-For wird NUR bei bekannten Proxies vertraut
 */
export function getClientIp(request: Request): string {
  const directIp = request.ip || request.socket?.remoteAddress || 'unknown';

  // Nur bei trusted proxy den X-Forwarded-For Header auswerten
  if (TRUSTED_PROXIES.has(directIp)) {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }
  }

  return directIp;
}

/**
 * Extrahiert den User-Agent aus dem Request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers['user-agent'];
}
