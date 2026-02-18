/**
 * API client for communicating with the content-service backend.
 * In development, auto-registers/logs in a dev user for convenience.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DEV_EMAIL = process.env.NEXT_PUBLIC_PB_DEV_EMAIL || 'pagebuilder@agora-cms.local';
const DEV_PASSWORD = process.env.PB_DEV_PASSWORD || process.env.NEXT_PUBLIC_PB_DEV_PASSWORD || '';
const DEV_NAME = 'Page Builder Dev';

/** Check whether a JWT is still valid (not expired). */
function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    // 30-second buffer so we refresh before it actually expires
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

let authPromise: Promise<string> | null = null;

/**
 * Ensure we have a valid auth token.
 * Tries localStorage first, then logs in, then registers if needed.
 */
async function ensureAuth(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const stored = localStorage.getItem('auth_token');
  if (stored && isTokenValid(stored)) return stored;

  // Avoid parallel auth attempts
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      // Try login
      const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        const token = data.accessToken ?? data.access_token ?? '';
        if (token) {
          localStorage.setItem('auth_token', token);
          return token;
        }
      }

      // Login failed — register a new dev user
      const registerRes = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
          name: DEV_NAME,
          role: 'admin',
        }),
      });

      if (registerRes.ok) {
        const data = await registerRes.json();
        const token = data.accessToken ?? data.access_token ?? '';
        if (token) {
          localStorage.setItem('auth_token', token);
          return token;
        }
      }

      throw new Error('Could not authenticate with content-service');
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const token = await ensureAuth();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData — the browser sets it with boundary
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>),
    },
  });

  // If we get a 401, clear the cached token and retry once
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    const freshToken = await ensureAuth();
    if (freshToken) {
      headers['Authorization'] = `Bearer ${freshToken}`;
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...headers,
          ...(options?.headers as Record<string, string>),
        },
      });
      if (!retry.ok) {
        const body = await retry.text().catch(() => '');
        throw new Error(`API ${retry.status}: ${body || retry.statusText}`);
      }
      if (retry.status === 204) return null as T;
      return retry.json() as Promise<T>;
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}
