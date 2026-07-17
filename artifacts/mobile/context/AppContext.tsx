import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { getApiBase } from '@/hooks/useApi';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Status = 'pass' | 'fail' | 'caution';

export type MenuItemCategory = 'hot' | 'cold' | 'thawing' | 'produce' | 'received';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuItemCategory;
  defaultZone?: string;
  defaultMethod?: 'refrigerator' | 'cold_water' | 'microwave' | 'cooking';
  defaultUnit?: string;
}

export interface BuffetEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  zone: string;
  item: string;
  type: 'hot' | 'cold';
  temperature: string;
  criticalLimit: string;
  status: Status;
  correctiveAction: string;
  monitoredBy: string;
}

export interface ThawingEntry {
  id: string;
  date: string;
  time: string;
  item: string;
  quantity: string;
  unit: string;
  method: 'refrigerator' | 'cold_water' | 'microwave' | 'cooking';
  temperature: string;
  status: Status;
  correctiveAction: string;
  monitoredBy: string;
}

export interface ReceivedItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  temperature: string;
  packagingOk: boolean;
  status: Status;
}

export interface ReceivedEntry {
  id: string;
  date: string;
  time: string;
  supplier: string;
  deliveryNote: string;
  items: ReceivedItem[];
  overallStatus: Status;
  receivedBy: string;
  notes: string;
}

export interface DisinfectionEntry {
  id: string;
  date: string;
  time: string;
  items: string;
  solutionType: string;
  concentration: string;
  contactTime: string;
  rinsed: boolean;
  status: Status;
  monitoredBy: string;
  notes: string;
}

export interface Settings {
  establishmentName: string;
  address: string;
  defaultMonitor: string;
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextType {
  settings: Settings;
  updateSettings: (s: Settings) => void;

  buffetLogs: BuffetEntry[];
  addBuffetEntry: (entry: BuffetEntry) => void;
  deleteBuffetEntry: (id: string) => void;

  thawingLogs: ThawingEntry[];
  addThawingEntry: (entry: ThawingEntry) => void;
  deleteThawingEntry: (id: string) => void;

  receivedLogs: ReceivedEntry[];
  addReceivedEntry: (entry: ReceivedEntry) => void;
  deleteReceivedEntry: (id: string) => void;

  disinfectionLogs: DisinfectionEntry[];
  addDisinfectionEntry: (entry: DisinfectionEntry) => void;
  deleteDisinfectionEntry: (id: string) => void;

  menuItems: MenuItem[];
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  updateMenuItem: (item: MenuItem) => void;
  syncFromServer: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const KEYS = {
  settings: '@fsm_settings',
  buffet: '@fsm_buffet',
  thawing: '@fsm_thawing',
  received: '@fsm_received',
  disinfection: '@fsm_disinfection',
  menuItems: '@fsm_menu_items',
};

// ─── Default Menu Library ─────────────────────────────────────────────────────

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // Hot buffet items
  { id: 'dm_h1', name: 'Roasted Chicken', category: 'hot', defaultZone: 'Hot Counter' },
  { id: 'dm_h2', name: 'Beef Tenderloin', category: 'hot', defaultZone: 'Carving Station' },
  { id: 'dm_h3', name: 'Grilled Salmon', category: 'hot', defaultZone: 'Hot Counter' },
  { id: 'dm_h4', name: 'Lamb Chops', category: 'hot', defaultZone: 'Carving Station' },
  { id: 'dm_h5', name: 'Pasta Bolognese', category: 'hot', defaultZone: 'Hot Counter' },
  { id: 'dm_h6', name: 'Vegetable Curry', category: 'hot', defaultZone: 'Hot Counter' },
  { id: 'dm_h7', name: 'Beef Stew', category: 'hot', defaultZone: 'Hot Counter' },
  { id: 'dm_h8', name: 'Steamed Rice', category: 'hot', defaultZone: 'Hot Counter' },
  { id: 'dm_h9', name: 'Cream of Mushroom Soup', category: 'hot', defaultZone: 'Soup Station' },
  { id: 'dm_h10', name: 'Chicken Tikka Masala', category: 'hot', defaultZone: 'Hot Counter' },
  // Cold buffet items
  { id: 'dm_c1', name: 'Caesar Salad', category: 'cold', defaultZone: 'Salad Bar' },
  { id: 'dm_c2', name: 'Shrimp Cocktail', category: 'cold', defaultZone: 'Cold Counter' },
  { id: 'dm_c3', name: 'Sushi Platter', category: 'cold', defaultZone: 'Cold Counter' },
  { id: 'dm_c4', name: 'Cheese Board', category: 'cold', defaultZone: 'Cold Counter' },
  { id: 'dm_c5', name: 'Fruit Salad', category: 'cold', defaultZone: 'Dessert Counter' },
  { id: 'dm_c6', name: 'Cold Cut Platter', category: 'cold', defaultZone: 'Cold Counter' },
  { id: 'dm_c7', name: 'Smoked Salmon', category: 'cold', defaultZone: 'Cold Counter' },
  { id: 'dm_c8', name: 'Greek Salad', category: 'cold', defaultZone: 'Salad Bar' },
  // Thawing items
  { id: 'dm_t1', name: 'Whole Chicken', category: 'thawing', defaultMethod: 'refrigerator', defaultUnit: 'kg' },
  { id: 'dm_t2', name: 'Beef Sirloin', category: 'thawing', defaultMethod: 'refrigerator', defaultUnit: 'kg' },
  { id: 'dm_t3', name: 'Salmon Fillet', category: 'thawing', defaultMethod: 'refrigerator', defaultUnit: 'kg' },
  { id: 'dm_t4', name: 'Pork Tenderloin', category: 'thawing', defaultMethod: 'refrigerator', defaultUnit: 'kg' },
  { id: 'dm_t5', name: 'Tiger Shrimp', category: 'thawing', defaultMethod: 'cold_water', defaultUnit: 'kg' },
  { id: 'dm_t6', name: 'Ground Beef', category: 'thawing', defaultMethod: 'refrigerator', defaultUnit: 'kg' },
  { id: 'dm_t7', name: 'Lamb Rack', category: 'thawing', defaultMethod: 'refrigerator', defaultUnit: 'kg' },
  // Produce items (disinfection)
  { id: 'dm_p1', name: 'Iceberg Lettuce', category: 'produce' },
  { id: 'dm_p2', name: 'Cherry Tomatoes', category: 'produce' },
  { id: 'dm_p3', name: 'Strawberries', category: 'produce' },
  { id: 'dm_p4', name: 'Mixed Herbs', category: 'produce' },
  { id: 'dm_p5', name: 'Bell Peppers', category: 'produce' },
  { id: 'dm_p6', name: 'Cucumbers', category: 'produce' },
  { id: 'dm_p7', name: 'Spinach Leaves', category: 'produce' },
  { id: 'dm_p8', name: 'Grapes', category: 'produce' },
  { id: 'dm_p9', name: 'Carrots', category: 'produce' },
  // Received goods
  { id: 'dm_r1', name: 'Whole Chicken', category: 'received', defaultUnit: 'kg' },
  { id: 'dm_r2', name: 'Beef Tenderloin', category: 'received', defaultUnit: 'kg' },
  { id: 'dm_r3', name: 'Fresh Salmon', category: 'received', defaultUnit: 'kg' },
  { id: 'dm_r4', name: 'Tiger Shrimp (Frozen)', category: 'received', defaultUnit: 'kg' },
  { id: 'dm_r5', name: 'Pork Ribs', category: 'received', defaultUnit: 'kg' },
  { id: 'dm_r6', name: 'Dairy – Cream', category: 'received', defaultUnit: 'L' },
  { id: 'dm_r7', name: 'Dairy – Butter', category: 'received', defaultUnit: 'kg' },
  { id: 'dm_r8', name: 'Fresh Vegetables Mix', category: 'received', defaultUnit: 'kg' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  // AppProvider is always mounted inside AuthProvider so useAuth() is safe here
  const { user: authUser, token: authToken, currentHotel: authHotel } = useAuth();

  const [settings, setSettings] = useState<Settings>({
    establishmentName: 'My Establishment',
    address: '',
    defaultMonitor: '',
  });
  const [buffetLogs, setBuffetLogs] = useState<BuffetEntry[]>([]);
  const [thawingLogs, setThawingLogs] = useState<ThawingEntry[]>([]);
  const [receivedLogs, setReceivedLogs] = useState<ReceivedEntry[]>([]);
  const [disinfectionLogs, setDisinfectionLogs] = useState<DisinfectionEntry[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);

  useEffect(() => {
    (async () => {
      try {
        const [s, b, t, r, d, m] = await Promise.all([
          AsyncStorage.getItem(KEYS.settings),
          AsyncStorage.getItem(KEYS.buffet),
          AsyncStorage.getItem(KEYS.thawing),
          AsyncStorage.getItem(KEYS.received),
          AsyncStorage.getItem(KEYS.disinfection),
          AsyncStorage.getItem(KEYS.menuItems),
        ]);
        if (s) setSettings(JSON.parse(s));
        if (b) setBuffetLogs(JSON.parse(b));
        if (t) setThawingLogs(JSON.parse(t));
        if (r) setReceivedLogs(JSON.parse(r));
        if (d) setDisinfectionLogs(JSON.parse(d));
        if (m) setMenuItems(JSON.parse(m));
      } catch (_) {}
    })();
  }, []);

  const save = async (key: string, data: unknown) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  };

  /**
   * Pull the current hotel's logs from the API and merge them into local
   * state. This makes logs visible on any device (a new phone, a second
   * manager's device) rather than only the one that created them.
   * Local-only entries that the server doesn't have are preserved.
   */
  const syncFromServer = useCallback(async () => {
    if (!authToken || !authHotel) return;
    const types: { key: keyof typeof KEYS; setter: (v: any[]) => void; remote: string }[] = [
      { key: 'buffet', setter: setBuffetLogs, remote: 'buffet' },
      { key: 'thawing', setter: setThawingLogs, remote: 'thawing' },
      { key: 'received', setter: setReceivedLogs, remote: 'received' },
      { key: 'disinfection', setter: setDisinfectionLogs, remote: 'disinfection' },
    ];
    await Promise.all(
      types.map(async ({ setter, remote }) => {
        try {
          const res = await fetch(
            `${getApiBase()}/logs/${remote}?hotel=${encodeURIComponent(authHotel)}`,
            { headers: { Authorization: `Bearer ${authToken}` } },
          );
          if (!res.ok) return;
          const rows: any[] = await res.json();
          setter((prev: any[]) => {
            const byId = new Map(prev.map((e) => [e.id, e]));
            for (const r of rows) byId.set(r.id, r);
            const next = Array.from(byId.values());
            save(KEYS[remote as keyof typeof KEYS], next);
            return next;
          });
        } catch (_) {
          /* offline — keep local data */
        }
      }),
    );
  }, [authToken, authHotel]);

  // Reload server logs when the authenticated user/hotel changes
  useEffect(() => {
    syncFromServer();
  }, [syncFromServer]);

  /** Fire-and-forget API call — failures are silent, local state is source of truth */
  const apiPost = (path: string, body: unknown) => {
    if (!authToken) return;
    fetch(`${getApiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(body),
    }).catch(() => {});
  };

  const apiDelete = (path: string) => {
    if (!authToken) return;
    fetch(`${getApiBase()}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => {});
  };

  const updateSettings = (s: Settings) => {
    setSettings(s);
    save(KEYS.settings, s);
  };

  const addBuffetEntry = (entry: BuffetEntry) => {
    setBuffetLogs(prev => { const next = [entry, ...prev]; save(KEYS.buffet, next); return next; });
    apiPost('/logs/buffet', {
      id: entry.id, date: entry.date, time: entry.time,
      item: entry.item, zone: entry.zone ?? '', type: entry.type,
      temperature: parseFloat(entry.temperature) || 0,
      status: entry.status, correctiveAction: entry.correctiveAction,
      monitoredBy: entry.monitoredBy, notes: '',
      hotelId: authHotel ?? 'Unknown', managerId: authUser?.id ?? '', managerName: authUser?.name ?? '',
    });
  };
  const deleteBuffetEntry = (id: string) => {
    setBuffetLogs(prev => { const next = prev.filter(e => e.id !== id); save(KEYS.buffet, next); return next; });
    apiDelete(`/logs/buffet/${id}`);
  };

  const addThawingEntry = (entry: ThawingEntry) => {
    setThawingLogs(prev => { const next = [entry, ...prev]; save(KEYS.thawing, next); return next; });
    apiPost('/logs/thawing', {
      id: entry.id, date: entry.date,
      itemName: entry.item, method: entry.method,
      startDate: entry.date, endDate: entry.date,
      initialTemp: parseFloat(entry.temperature) || 0,
      unit: entry.unit, quantity: entry.quantity,
      status: entry.status, correctiveAction: entry.correctiveAction,
      monitoredBy: entry.monitoredBy, notes: '',
      hotelId: authHotel ?? 'Unknown', managerId: authUser?.id ?? '', managerName: authUser?.name ?? '',
    });
  };
  const deleteThawingEntry = (id: string) => {
    setThawingLogs(prev => { const next = prev.filter(e => e.id !== id); save(KEYS.thawing, next); return next; });
    apiDelete(`/logs/thawing/${id}`);
  };

  const addReceivedEntry = (entry: ReceivedEntry) => {
    setReceivedLogs(prev => { const next = [entry, ...prev]; save(KEYS.received, next); return next; });
    apiPost('/logs/received', {
      id: entry.id, date: entry.date, time: entry.time,
      supplier: entry.supplier,
      vehicleTemp: parseFloat(entry.items?.[0]?.temperature ?? '0') || 0,
      items: entry.items,
      status: entry.overallStatus, monitoredBy: entry.receivedBy, notes: entry.notes,
      hotelId: authHotel ?? 'Unknown', managerId: authUser?.id ?? '', managerName: authUser?.name ?? '',
    });
  };
  const deleteReceivedEntry = (id: string) => {
    setReceivedLogs(prev => { const next = prev.filter(e => e.id !== id); save(KEYS.received, next); return next; });
    apiDelete(`/logs/received/${id}`);
  };

  const addDisinfectionEntry = (entry: DisinfectionEntry) => {
    setDisinfectionLogs(prev => { const next = [entry, ...prev]; save(KEYS.disinfection, next); return next; });
    apiPost('/logs/disinfection', {
      id: entry.id, date: entry.date, time: entry.time,
      items: entry.items, solution: entry.solutionType,
      concentration: parseFloat(entry.concentration) || 0,
      contactTime: parseInt(entry.contactTime) || 0,
      waterTemp: 0, ph: null,
      status: entry.status, correctiveAction: '',
      monitoredBy: entry.monitoredBy, notes: entry.notes,
      hotelId: authHotel ?? 'Unknown', managerId: authUser?.id ?? '', managerName: authUser?.name ?? '',
    });
  };
  const deleteDisinfectionEntry = (id: string) => {
    setDisinfectionLogs(prev => { const next = prev.filter(e => e.id !== id); save(KEYS.disinfection, next); return next; });
    apiDelete(`/logs/disinfection/${id}`);
  };

  const addMenuItem = (item: MenuItem) => {
    setMenuItems(prev => {
      const next = [...prev, item];
      save(KEYS.menuItems, next);
      return next;
    });
  };
  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => {
      const next = prev.filter(m => m.id !== id);
      save(KEYS.menuItems, next);
      return next;
    });
  };
  const updateMenuItem = (item: MenuItem) => {
    setMenuItems(prev => {
      const next = prev.map(m => m.id === item.id ? item : m);
      save(KEYS.menuItems, next);
      return next;
    });
  };

  return (
    <AppContext.Provider value={{
      settings, updateSettings,
      buffetLogs, addBuffetEntry, deleteBuffetEntry,
      thawingLogs, addThawingEntry, deleteThawingEntry,
      receivedLogs, addReceivedEntry, deleteReceivedEntry,
      disinfectionLogs, addDisinfectionEntry, deleteDisinfectionEntry,
      menuItems, addMenuItem, deleteMenuItem, updateMenuItem,
      syncFromServer,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

export function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
}
