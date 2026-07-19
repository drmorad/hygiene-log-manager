import { describe, expect, it } from 'vitest';
import { createFallbackManagerStore } from './fallback-manager-store';

describe('createFallbackManagerStore', () => {
  it('stores and lists managers without a database', () => {
    const store = createFallbackManagerStore();
    const created = store.add({
      id: '1',
      username: 'manager',
      name: 'Test Manager',
      role: 'manager',
      allowedHotels: ['Rewaya Majestic'],
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    expect(store.hasAny()).toBe(true);
    expect(store.list()).toEqual([created]);
  });
});
