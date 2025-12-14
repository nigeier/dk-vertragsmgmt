const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
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

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: 'An error occurred',
        error: response.statusText,
      }));

      throw new Error(
        Array.isArray(error.message) ? error.message.join(', ') : error.message,
      );
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

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<{ data: T; status: number }> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<{ data: T; status: number }> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<{ data: T; status: number }> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; status: number }> {
    return this.request<T>('DELETE', endpoint, undefined, options);
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

    const headers: HeadersInit = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
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
