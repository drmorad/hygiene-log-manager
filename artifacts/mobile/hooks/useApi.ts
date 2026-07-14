import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Platform } from 'react-native';

/**
 * Returns the API base URL.
 *
 * On web we use a relative URL ("/api-server/api") so the browser makes a
 * same-origin request.  Same-origin requests carry no Origin header, which
 * lets Replit's proxy route /api-server correctly to the API server (port 8080)
 * without being intercepted by the Expo dev-server's CORS middleware.
 *
 * On native (Expo Go / dev build) we need the absolute URL because there is
 * no shared proxy — EXPO_PUBLIC_DOMAIN is the Replit dev domain baked in at
 * Metro bundle time.
 */
export function getApiBase(): string {
  if (Platform.OS === 'web') {
    return '/api-server/api';
  }
  // Native: use baked-in env var
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api-server/api`;
  return '/api-server/api';
}

export function useApi() {
  const { token } = useAuth();

  const request = useCallback(async <T = any>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const url = `${getApiBase()}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [token]);

  const get = useCallback(<T = any>(path: string) => request<T>(path), [request]);

  const post = useCallback(<T = any>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }), [request]);

  const del = useCallback(<T = any>(path: string) =>
    request<T>(path, { method: 'DELETE' }), [request]);

  const patch = useCallback(<T = any>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }), [request]);

  return { get, post, del, patch, request };
}
