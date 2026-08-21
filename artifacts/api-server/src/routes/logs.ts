import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db } from '@workspace/db';
import { buffetLogs, thawingLogs, receivedLogs, disinfectionLogs } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, isFallbackMode } from '../lib/auth';
import { HttpError, assert } from '../lib/errors';
import { getFallbackStore } from '../lib/fallback-log-store';

const router = Router();
router.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canAccessHotel(user: Express.Request['user'], hotelId: string): boolean {
  if (user?.role === 'director') return true;
  return user?.allowedHotels?.includes(hotelId) ?? false;
}

const STATUSES = new Set(['pass', 'caution', 'fail']);

interface FieldSpec {
  key: string;
  required?: boolean;
  num?: boolean;
}

function toNumber(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}

/**
 * Builds a clean insert object from the request body. Unknown keys are dropped,
 * required fields are enforced, numeric fields are coerced, and the id/manager
 * fields are always owned by the server. Throws HttpError on invalid input.
 */
function buildLog(specs: FieldSpec[], body: Record<string, unknown>, manager: { id: string; name: string }) {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Request body must be an object');
  }
  const out: Record<string, unknown> = {
    id: typeof body.id === 'string' && body.id ? body.id : randomUUID(),
    managerId: manager.id,
    managerName: manager.name,
  };

  for (const spec of specs) {
    const raw = body[spec.key];
    if (spec.num) {
      const n = toNumber(raw);
      if (spec.required && n === null) {
        throw new HttpError(400, `Field "${spec.key}" is required and must be numeric`);
      }
      out[spec.key] = n;
    } else {
      let val: unknown = raw;
      if (val === undefined || val === null) val = null;
      if (spec.required && (val === null || val === '')) {
        throw new HttpError(400, `Field "${spec.key}" is required`);
      }
      out[spec.key] = val;
    }
  }

  if (body.status !== undefined && !STATUSES.has(String(body.status))) {
    throw new HttpError(400, `Invalid status "${body.status}"`);
  }

  return out;
}

const BUFFET_SPECS: FieldSpec[] = [
  { key: 'hotelId', required: true },
  { key: 'date', required: true },
  { key: 'time', required: true },
  { key: 'item', required: true },
  { key: 'zone' },
  { key: 'type', required: true },
  { key: 'temperature', required: true, num: true },
  { key: 'status', required: true },
  { key: 'correctiveAction' },
  { key: 'monitoredBy' },
  { key: 'notes' },
];

const THAWING_SPECS: FieldSpec[] = [
  { key: 'hotelId', required: true },
  { key: 'date', required: true },
  { key: 'itemName', required: true },
  { key: 'method', required: true },
  { key: 'startDate', required: true },
  { key: 'endDate', required: true },
  { key: 'initialTemp', required: true, num: true },
  { key: 'finalTemp', num: true },
  { key: 'unit' },
  { key: 'quantity' },
  { key: 'status', required: true },
  { key: 'correctiveAction' },
  { key: 'monitoredBy' },
  { key: 'notes' },
];

const RECEIVED_SPECS: FieldSpec[] = [
  { key: 'hotelId', required: true },
  { key: 'date', required: true },
  { key: 'time', required: true },
  { key: 'supplier', required: true },
  { key: 'vehicleTemp', required: true, num: true },
  { key: 'items' },
  { key: 'status', required: true },
  { key: 'monitoredBy' },
  { key: 'notes' },
];

const DISINFECTION_SPECS: FieldSpec[] = [
  { key: 'hotelId', required: true },
  { key: 'date', required: true },
  { key: 'time', required: true },
  { key: 'items', required: true },
  { key: 'solution', required: true },
  { key: 'concentration', required: true, num: true },
  { key: 'contactTime', required: true, num: true },
  { key: 'waterTemp', required: true, num: true },
  { key: 'ph', num: true },
  { key: 'status', required: true },
  { key: 'correctiveAction' },
  { key: 'monitoredBy' },
  { key: 'notes' },
];

// ─── Buffet Logs ──────────────────────────────────────────────────────────────

router.get('/buffet', async (req, res, next) => {
  try {
    const { hotel, date } = req.query as { hotel?: string; date?: string };
    assert(hotel && canAccessHotel(req.user, hotel), 403, 'Hotel access denied');
    if (isFallbackMode()) {
      res.json(getFallbackStore('buffet')!.list({ hotel, date }));
      return;
    }
    const conditions = [eq(buffetLogs.hotelId, hotel)];
    if (date) conditions.push(eq(buffetLogs.date, date));
    const rows = await db.select().from(buffetLogs).where(and(...conditions)).orderBy(desc(buffetLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/buffet', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    assert(canAccessHotel(req.user, String(body.hotelId ?? '')), 403, 'Hotel access denied');
    const values = buildLog(BUFFET_SPECS, body, req.user!);
    if (isFallbackMode()) {
      getFallbackStore('buffet')!.add(values);
    } else {
      await db.insert(buffetLogs).values(values as any);
    }
    res.status(201).json({ ok: true, id: values.id });
  } catch (err) { next(err); }
});

router.delete('/buffet/:id', async (req, res, next) => {
  try {
    if (isFallbackMode()) {
      const store = getFallbackStore('buffet')!;
      const row = store.list().find((r) => r.id === req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
      store.remove(req.params.id);
      res.json({ ok: true });
      return;
    }
    const [row] = await db.select().from(buffetLogs).where(eq(buffetLogs.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.delete(buffetLogs).where(eq(buffetLogs.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── Thawing Logs ─────────────────────────────────────────────────────────────

router.get('/thawing', async (req, res, next) => {
  try {
    const { hotel, date } = req.query as { hotel?: string; date?: string };
    assert(hotel && canAccessHotel(req.user, hotel), 403, 'Hotel access denied');
    if (isFallbackMode()) {
      res.json(getFallbackStore('thawing')!.list({ hotel, date }));
      return;
    }
    const conditions = [eq(thawingLogs.hotelId, hotel)];
    if (date) conditions.push(eq(thawingLogs.date, date));
    const rows = await db.select().from(thawingLogs).where(and(...conditions)).orderBy(desc(thawingLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/thawing', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    assert(canAccessHotel(req.user, String(body.hotelId ?? '')), 403, 'Hotel access denied');
    const values = buildLog(THAWING_SPECS, body, req.user!);
    if (isFallbackMode()) {
      getFallbackStore('thawing')!.add(values);
    } else {
      await db.insert(thawingLogs).values(values as any);
    }
    res.status(201).json({ ok: true, id: values.id });
  } catch (err) { next(err); }
});

router.delete('/thawing/:id', async (req, res, next) => {
  try {
    if (isFallbackMode()) {
      const store = getFallbackStore('thawing')!;
      const row = store.list().find((r) => r.id === req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
      store.remove(req.params.id);
      res.json({ ok: true });
      return;
    }
    const [row] = await db.select().from(thawingLogs).where(eq(thawingLogs.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.delete(thawingLogs).where(eq(thawingLogs.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── Received Logs ────────────────────────────────────────────────────────────

router.get('/received', async (req, res, next) => {
  try {
    const { hotel, date } = req.query as { hotel?: string; date?: string };
    assert(hotel && canAccessHotel(req.user, hotel), 403, 'Hotel access denied');
    if (isFallbackMode()) {
      res.json(getFallbackStore('received')!.list({ hotel, date }));
      return;
    }
    const conditions = [eq(receivedLogs.hotelId, hotel)];
    if (date) conditions.push(eq(receivedLogs.date, date));
    const rows = await db.select().from(receivedLogs).where(and(...conditions)).orderBy(desc(receivedLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/received', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    assert(canAccessHotel(req.user, String(body.hotelId ?? '')), 403, 'Hotel access denied');
    const values = buildLog(RECEIVED_SPECS, body, req.user!);
    if (isFallbackMode()) {
      getFallbackStore('received')!.add(values);
    } else {
      await db.insert(receivedLogs).values(values as any);
    }
    res.status(201).json({ ok: true, id: values.id });
  } catch (err) { next(err); }
});

router.delete('/received/:id', async (req, res, next) => {
  try {
    if (isFallbackMode()) {
      const store = getFallbackStore('received')!;
      const row = store.list().find((r) => r.id === req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
      store.remove(req.params.id);
      res.json({ ok: true });
      return;
    }
    const [row] = await db.select().from(receivedLogs).where(eq(receivedLogs.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.delete(receivedLogs).where(eq(receivedLogs.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── Disinfection Logs ────────────────────────────────────────────────────────

router.get('/disinfection', async (req, res, next) => {
  try {
    const { hotel, date } = req.query as { hotel?: string; date?: string };
    assert(hotel && canAccessHotel(req.user, hotel), 403, 'Hotel access denied');
    if (isFallbackMode()) {
      res.json(getFallbackStore('disinfection')!.list({ hotel, date }));
      return;
    }
    const conditions = [eq(disinfectionLogs.hotelId, hotel)];
    if (date) conditions.push(eq(disinfectionLogs.date, date));
    const rows = await db.select().from(disinfectionLogs).where(and(...conditions)).orderBy(desc(disinfectionLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/disinfection', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    assert(canAccessHotel(req.user, String(body.hotelId ?? '')), 403, 'Hotel access denied');
    const values = buildLog(DISINFECTION_SPECS, body, req.user!);
    if (isFallbackMode()) {
      getFallbackStore('disinfection')!.add(values);
    } else {
      await db.insert(disinfectionLogs).values(values as any);
    }
    res.status(201).json({ ok: true, id: values.id });
  } catch (err) { next(err); }
});

router.delete('/disinfection/:id', async (req, res, next) => {
  try {
    if (isFallbackMode()) {
      const store = getFallbackStore('disinfection')!;
      const row = store.list().find((r) => r.id === req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
      store.remove(req.params.id);
      res.json({ ok: true });
      return;
    }
    const [row] = await db.select().from(disinfectionLogs).where(eq(disinfectionLogs.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.delete(disinfectionLogs).where(eq(disinfectionLogs.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
