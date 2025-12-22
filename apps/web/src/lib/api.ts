const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<{ data: T; status: number }> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Keine manuelle Token-Verwaltung mehr - httpOnly Cookies werden automatisch gesendet
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Wichtig: Cookies werden mitgesendet
      ...options,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: 'An error occurred',
        error: response.statusText,
      }));

      // Auto-Logout bei 401 Unauthorized (außer bei Login/Refresh-Endpunkten)
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }

      throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: null as T, status: response.status };
    }

    const data = await response.json();
    return { data, status: response.status };
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; status: number }> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<{ data: T; status: number }> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<{ data: T; status: number }> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<{ data: T; status: number }> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; status: number }> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  async downloadBlob(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Download failed',
      }));
      throw new Error(error.message);
    }

    return response.blob();
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
  ): Promise<{ data: T; status: number }> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Keine manuelle Token-Verwaltung - httpOnly Cookies werden automatisch gesendet
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Wichtig: Cookies werden mitgesendet
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Upload failed',
      }));
      throw new Error(error.message);
    }

    const data = await response.json();
    return { data, status: response.status };
  }
}

export const api = new ApiClient(API_URL);
