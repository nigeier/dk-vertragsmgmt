import { Request } from 'express';

/**
 * Extrahiert die Client-IP-Adresse aus dem Request
 * Berücksichtigt X-Forwarded-For Header für Proxy-Setups
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  return request.ip || 'unknown';
}

/**
 * Extrahiert den User-Agent aus dem Request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers['user-agent'];
}
