export type ManagerRecord = {
  id: string;
  username: string;
  name: string;
  role: string;
  allowedHotels: string[];
  createdAt: string;
};

export function createFallbackManagerStore() {
  const store = new Map<string, ManagerRecord>();

  return {
    hasAny() {
      return store.size > 0;
    },
    list() {
      return Array.from(store.values());
    },
    add(manager: ManagerRecord) {
      store.set(manager.id, manager);
      return manager;
    },
    remove(id: string) {
      store.delete(id);
    },
    update(id: string, updater: (manager: ManagerRecord) => void) {
      const current = store.get(id);
      if (!current) return null;
      updater(current);
      return current;
    },
  };
}

export const fallbackManagers = createFallbackManagerStore();
