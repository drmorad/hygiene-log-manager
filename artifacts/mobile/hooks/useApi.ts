import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';

/**
 * Returns the API base URL.
 *
 * Resolution order (first match wins):
 *   1. EXPO_PUBLIC_API_URL env var (injected at EAS build time, or set in .env)
 *   2. expo-constants `extra.apiUrl` (baked into app.json for built apps)
 *   3. Dev fallback "/api-server/api" (Replit proxy / local dev server)
 *
 * All API routes are served under /api, so we append it here.
 */
export function getApiBase(): string {
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (envUrl) {
    return `${envUrl.replace(/\/$/, '')}/api`;
  }
  // Dev fallback (Replit proxy / local dev server)
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
