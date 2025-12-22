/**
 * API-related types shared between frontend and backend
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Alias für Backend-Kompatibilität
export type PaginatedResult<T> = PaginatedResponse<T>;

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Erweiterte Pagination-Meta mit Navigation-Flags
 * (für zukünftige Nutzung)
 */
export interface ExtendedPaginationMeta extends PaginationMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  search?: string;
}

export type SortOrder = 'asc' | 'desc';
