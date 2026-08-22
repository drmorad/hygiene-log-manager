// In-memory log store used only when the app runs without a production database
// (e.g. local preview / demo). Mirrors the four Postgres tables so the API
// behaves identically with no external dependencies.

export type AnyLog = Record<string, any>;

type Filter = { hotel?: string; date?: string };

function makeStore() {
  const map = new Map<string, AnyLog>();
  return {
    list(filter?: Filter): AnyLog[] {
      let rows = Array.from(map.values());
      if (filter?.hotel) rows = rows.filter((r) => r.hotelId === filter.hotel);
      if (filter?.date) rows = rows.filter((r) => r.date === filter.date);
      return rows;
    },
    add(entry: AnyLog): AnyLog {
      map.set(entry.id, entry);
      return entry;
    },
    remove(id: string): void {
      map.delete(id);
    },
    all(): AnyLog[] {
      return Array.from(map.values());
    },
  };
}

export const fallbackBuffet = makeStore();
export const fallbackThawing = makeStore();
export const fallbackReceived = makeStore();
export const fallbackDisinfection = makeStore();
export const fallbackWorksheets = makeStore();

export function getFallbackStore(type: string) {
  switch (type) {
    case "buffet":
      return fallbackBuffet;
    case "thawing":
      return fallbackThawing;
    case "received":
      return fallbackReceived;
    case "disinfection":
      return fallbackDisinfection;
    case "worksheets":
      return fallbackWorksheets;
    default:
      return null;
  }
}
