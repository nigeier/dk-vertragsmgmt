/**
 * Shared Constants
 */

// API Configuration
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

// File Upload
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Date Formats
export const DATE_FORMAT = 'dd.MM.yyyy';
export const DATE_TIME_FORMAT = 'dd.MM.yyyy HH:mm';
export const ISO_DATE_FORMAT = 'yyyy-MM-dd';

// Contract Number Format
export const CONTRACT_NUMBER_PREFIX = 'DK';
export const CONTRACT_NUMBER_YEAR_FORMAT = 'yyyy';
export const CONTRACT_NUMBER_SEQUENCE_LENGTH = 5;

// Session & Authentication
export const SESSION_TIMEOUT_MINUTES = 30;
export const REFRESH_TOKEN_THRESHOLD_SECONDS = 60;
export const ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 Minuten
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Login Security
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCKOUT_MINUTES = 15;
export const MAX_2FA_ATTEMPTS = 5;
export const TWO_FACTOR_LOCKOUT_MINUTES = 10;

// Password Hashing
export const BCRYPT_SALT_ROUNDS = 12;

// Rate Limiting
export const RATE_LIMIT_TTL_SECONDS = 60;
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const AUTH_RATE_LIMIT_LOGIN = 5; // pro Minute
export const AUTH_RATE_LIMIT_REGISTER = 3; // pro Minute
export const AUTH_RATE_LIMIT_REFRESH = 10; // pro Minute

// Password Policy (Keycloak-aligned)
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_REQUIRE_UPPERCASE = true;
export const PASSWORD_REQUIRE_LOWERCASE = true;
export const PASSWORD_REQUIRE_NUMBER = true;
export const PASSWORD_REQUIRE_SPECIAL = true;

// Reminder Defaults
export const DEFAULT_EXPIRATION_REMINDER_DAYS = [90, 60, 30, 14, 7];

// Currency
export const DEFAULT_CURRENCY = 'EUR';
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

// Languages
export const DEFAULT_LANGUAGE = 'de';
export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;
