import type { AuthResponse, BookListItem } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

const NETWORK_ERROR = 'Unable to connect to BookMaster. Please try again.';
const GENERIC_ERROR = 'Something went wrong. Please try again.';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  let body: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  } else if (text.trim().length > 0) {
    body = text;
  }

  if (!res.ok) {
    const message =
      typeof body === 'string' && body.trim().length > 0 ? body : GENERIC_ERROR;
    throw new ApiError(res.status, message);
  }

  return body;
}

function post(path: string, payload: unknown): Promise<unknown> {
  return request(path, { method: 'POST', body: JSON.stringify(payload) });
}

export function loginApi(email: string, password: string): Promise<AuthResponse> {
  return post('/auth/login', { email, password }) as Promise<AuthResponse>;
}

export function registerApi(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return post('/auth/register', { name, email, password }) as Promise<AuthResponse>;
}

export function apiPost<T>(
  path: string,
  payload: unknown,
  token?: string | null,
): Promise<T> {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) as Promise<T>;
}

export function acquireCopy(id: number, token?: string | null): Promise<BookListItem> {
  return apiPost<BookListItem>(`/books/${id}/acquire`, {}, token);
}

export function apiPut<T>(
  path: string,
  payload: unknown,
  token?: string | null,
): Promise<T> {
  return request(path, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }) as Promise<T>;
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
  if (!res.ok) throw new ApiError(res.status, 'Request failed.');
  return (await res.json()) as T;
}

export function apiDelete(path: string, token?: string | null): Promise<unknown> {
  return request(path, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}