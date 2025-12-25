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
export function parseContractNumber(
  contractNumber: string,
): { year: number; sequence: number } | null {
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
 * Deep clone an object (handles Date objects correctly)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Remove undefined values from an object
 */
export function removeUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

// ============================================
// Validator Functions
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format (v4)
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Password strength requirements
 */
export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-5
  errors: string[];
}

/**
 * Validate password strength
 * Requirements: min 12 chars, uppercase, lowercase, number, special char
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length >= 12) {
    score++;
  } else {
    errors.push('Passwort muss mindestens 12 Zeichen haben');
  }

  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten');
  }

  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    errors.push('Passwort muss mindestens eine Zahl enthalten');
  }

  if (/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/`~';]/.test(password)) {
    score++;
  } else {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten');
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * Validate German phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Accepts formats like: +49 123 456789, 0123-456789, +49(0)123/4567890
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  const cleanedPhone = phone.replace(/\s/g, '');
  return phoneRegex.test(cleanedPhone) && cleanedPhone.length >= 6 && cleanedPhone.length <= 20;
}

/**
 * Validate IBAN format (basic check)
 */
export function isValidIBAN(iban: string): boolean {
  const cleanedIban = iban.replace(/\s/g, '').toUpperCase();
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;
  return ibanRegex.test(cleanedIban);
}

/**
 * Check if string is empty or only whitespace
 */
export function isBlank(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Check if string is not empty and not only whitespace
 */
export function isNotBlank(str: string | null | undefined): boolean {
  return !isBlank(str);
}

/**
 * Normalize email address (lowercase + trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Format German phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');

  // German format: +49 XXX XXXXXXX
  if (cleaned.startsWith('+49')) {
    const rest = cleaned.slice(3);
    if (rest.length >= 10) {
      return `+49 ${rest.slice(0, 3)} ${rest.slice(3)}`;
    }
  }

  // German format: 0XXX XXXXXXX
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }

  return phone;
}
