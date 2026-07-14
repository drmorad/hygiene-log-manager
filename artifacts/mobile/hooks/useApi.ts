import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Platform } from 'react-native';

/**
 * Returns the API base URL. In Expo Go on a physical device the
 * EXPO_PUBLIC_DOMAIN env var is the Replit dev domain. On web it
 * falls back to a relative path since both run behind the same proxy.
 */
export function getApiBase(): string {
  // EXPO_PUBLIC_DOMAIN is injected by the mobile workflow command
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    // The API server artifact is at /api-server/api
    return `https://${domain}/api-server/api`;
  }
  // Fallback for local/web
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
