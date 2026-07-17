import { API_BASE } from "./types";

const TOKEN_KEY = "rewaya_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ─── Auth ──────────────────────────────────────────────
  login: (username: string, password: string) =>
    request<{ token: string; user: import("./types").AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ user: import("./types").AuthUser }>("/api/auth/me"),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // ─── Logs ──────────────────────────────────────────────
  listLogs: (type: string, hotel: string, date?: string) => {
    const qs = new URLSearchParams({ hotel });
    if (date) qs.set("date", date);
    return request<any[]>(`/api/logs/${type}?${qs.toString()}`);
  },
  createLog: (type: string, body: unknown) =>
    request<{ ok: true }>(`/api/logs/${type}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteLog: (type: string, id: string) =>
    request<{ ok: true }>(`/api/logs/${type}/${id}`, { method: "DELETE" }),

  // ─── Users (director) ─────────────────────────────────
  listManagers: () => request<import("./types").ManagerUser[]>("/api/users"),
  createManager: (body: {
    username: string;
    password: string;
    name: string;
    allowedHotels: string[];
  }) => request<import("./types").ManagerUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  deleteManager: (id: string) =>
    request<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" }),

  // ─── Analytics (director) ─────────────────────────────
  analytics: () => request<any>("/api/analytics"),
};
