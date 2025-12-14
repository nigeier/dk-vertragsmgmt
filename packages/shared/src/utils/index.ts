/**
 * Shared Utility Functions
 */

import { CONTRACT_NUMBER_PREFIX, CONTRACT_NUMBER_SEQUENCE_LENGTH } from '../constants';

/**
 * Format a number as currency
 */
export function formatCurrency(value: number, currency = 'EUR', locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, locale = 'de-DE'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date with time for display
 */
export function formatDateTime(date: Date | string, locale = 'de-DE'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate days until a date
 */
export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffTime = d.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  return daysUntil(date) < 0;
}

/**
 * Check if a date is within N days
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const daysRemaining = daysUntil(date);
  return daysRemaining >= 0 && daysRemaining <= days;
}

/**
 * Generate a contract number
 */
export function generateContractNumber(sequenceNumber: number, year?: number): string {
  const y = year ?? new Date().getFullYear();
  const seq = String(sequenceNumber).padStart(CONTRACT_NUMBER_SEQUENCE_LENGTH, '0');
  return `${CONTRACT_NUMBER_PREFIX}-${y}-${seq}`;
}

/**
 * Parse a contract number to extract year and sequence
 */
export function parseContractNumber(contractNumber: string): { year: number; sequence: number } | null {
  const regex = new RegExp(`^${CONTRACT_NUMBER_PREFIX}-(\\d{4})-(\\d+)$`);
  const match = contractNumber.match(regex);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Generate a unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop() || '';
  const baseName = sanitizeFilename(originalName.replace(`.${ext}`, ''));
  return `${baseName}_${timestamp}_${randomSuffix}.${ext.toLowerCase()}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Remove undefined values from an object
 */
export function removeUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}
