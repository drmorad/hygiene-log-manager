import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Status = 'pass' | 'fail' | 'caution';

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
}

const AppContext = createContext<AppContextType | null>(null);

const KEYS = {
  settings: '@fsm_settings',
  buffet: '@fsm_buffet',
  thawing: '@fsm_thawing',
  received: '@fsm_received',
  disinfection: '@fsm_disinfection',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    establishmentName: 'My Establishment',
    address: '',
    defaultMonitor: '',
  });
  const [buffetLogs, setBuffetLogs] = useState<BuffetEntry[]>([]);
  const [thawingLogs, setThawingLogs] = useState<ThawingEntry[]>([]);
  const [receivedLogs, setReceivedLogs] = useState<ReceivedEntry[]>([]);
  const [disinfectionLogs, setDisinfectionLogs] = useState<DisinfectionEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, b, t, r, d] = await Promise.all([
          AsyncStorage.getItem(KEYS.settings),
          AsyncStorage.getItem(KEYS.buffet),
          AsyncStorage.getItem(KEYS.thawing),
          AsyncStorage.getItem(KEYS.received),
          AsyncStorage.getItem(KEYS.disinfection),
        ]);
        if (s) setSettings(JSON.parse(s));
        if (b) setBuffetLogs(JSON.parse(b));
        if (t) setThawingLogs(JSON.parse(t));
        if (r) setReceivedLogs(JSON.parse(r));
        if (d) setDisinfectionLogs(JSON.parse(d));
      } catch (_) {}
    })();
  }, []);

  const save = async (key: string, data: unknown) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  };

  const updateSettings = (s: Settings) => {
    setSettings(s);
    save(KEYS.settings, s);
  };

  const addBuffetEntry = (entry: BuffetEntry) => {
    setBuffetLogs(prev => {
      const next = [entry, ...prev];
      save(KEYS.buffet, next);
      return next;
    });
  };
  const deleteBuffetEntry = (id: string) => {
    setBuffetLogs(prev => {
      const next = prev.filter(e => e.id !== id);
      save(KEYS.buffet, next);
      return next;
    });
  };

  const addThawingEntry = (entry: ThawingEntry) => {
    setThawingLogs(prev => {
      const next = [entry, ...prev];
      save(KEYS.thawing, next);
      return next;
    });
  };
  const deleteThawingEntry = (id: string) => {
    setThawingLogs(prev => {
      const next = prev.filter(e => e.id !== id);
      save(KEYS.thawing, next);
      return next;
    });
  };

  const addReceivedEntry = (entry: ReceivedEntry) => {
    setReceivedLogs(prev => {
      const next = [entry, ...prev];
      save(KEYS.received, next);
      return next;
    });
  };
  const deleteReceivedEntry = (id: string) => {
    setReceivedLogs(prev => {
      const next = prev.filter(e => e.id !== id);
      save(KEYS.received, next);
      return next;
    });
  };

  const addDisinfectionEntry = (entry: DisinfectionEntry) => {
    setDisinfectionLogs(prev => {
      const next = [entry, ...prev];
      save(KEYS.disinfection, next);
      return next;
    });
  };
  const deleteDisinfectionEntry = (id: string) => {
    setDisinfectionLogs(prev => {
      const next = prev.filter(e => e.id !== id);
      save(KEYS.disinfection, next);
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
