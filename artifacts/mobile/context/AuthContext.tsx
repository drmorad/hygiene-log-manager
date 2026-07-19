import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export const HOTELS = ['Rewaya Majestic', 'Rewaya Inn', 'Rewaya Luxury'] as const;
export type Hotel = typeof HOTELS[number];

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: 'director' | 'manager';
  allowedHotels: Hotel[];
  requiresPasswordChange?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  currentHotel: Hotel | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectHotel: (hotel: Hotel) => void;
  markPasswordChanged: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = '@fsm_auth';
const HOTEL_KEY = '@fsm_current_hotel';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentHotel, setCurrentHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from storage
  useEffect(() => {
    (async () => {
      try {
        const [storedAuth, storedHotel] = await Promise.all([
          AsyncStorage.getItem(AUTH_KEY),
          AsyncStorage.getItem(HOTEL_KEY),
        ]);
        if (storedAuth) {
          const { user: u, token: t } = JSON.parse(storedAuth);
          setUser(u);
          setToken(t);
        }
        if (storedHotel) setCurrentHotel(storedHotel as Hotel);
      } catch (_) {}
      finally { setIsLoading(false); }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { getApiBase } = await import('@/hooks/useApi');
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }
    const { token: t, user: u } = await res.json();
    setUser(u);
    setToken(t);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, token: t }));
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        const { getApiBase } = await import('@/hooks/useApi');
        await fetch(`${getApiBase()}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
    }
    setUser(null);
    setToken(null);
    setCurrentHotel(null);
    await AsyncStorage.multiRemove([AUTH_KEY, HOTEL_KEY]);
  }, [token]);

  const selectHotel = useCallback((hotel: Hotel) => {
    setCurrentHotel(hotel);
    AsyncStorage.setItem(HOTEL_KEY, hotel);
  }, []);

  const markPasswordChanged = useCallback(async () => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, requiresPasswordChange: false };
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ user: updated, token }));
      return updated;
    });
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, currentHotel, isLoading, login, logout, selectHotel, markPasswordChanged }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
