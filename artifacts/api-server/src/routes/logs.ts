import { Router } from 'express';
import { db } from '@workspace/db';
import { buffetLogs, thawingLogs, receivedLogs, disinfectionLogs } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../lib/auth';

const router = Router();
router.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function canAccessHotel(user: Express.Request['user'], hotelId: string): boolean {
  if (user?.role === 'director') return true;
  return user?.allowedHotels?.includes(hotelId) ?? false;
}

// ─── Buffet Logs ──────────────────────────────────────────────────────────────

router.get('/buffet', async (req, res, next) => {
  try {
    const { hotel, date } = req.query as { hotel?: string; date?: string };
    if (!hotel || !canAccessHotel(req.user, hotel)) {
      res.status(403).json({ error: 'Hotel access denied' }); return;
    }
    const conditions = [eq(buffetLogs.hotelId, hotel)];
    if (date) conditions.push(eq(buffetLogs.date, date));
    const rows = await db.select().from(buffetLogs).where(and(...conditions)).orderBy(desc(buffetLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/buffet', async (req, res, next) => {
  try {
    const entry = req.body;
    if (!canAccessHotel(req.user, entry.hotelId)) {
      res.status(403).json({ error: 'Hotel access denied' }); return;
    }
    await db.insert(buffetLogs).values({
      ...entry,
      managerId: req.user!.id,
      managerName: req.user!.name,
    });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/buffet/:id', async (req, res, next) => {
  try {
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
    if (!hotel || !canAccessHotel(req.user, hotel)) { res.status(403).json({ error: 'Hotel access denied' }); return; }
    const conditions = [eq(thawingLogs.hotelId, hotel)];
    if (date) conditions.push(eq(thawingLogs.date, date));
    const rows = await db.select().from(thawingLogs).where(and(...conditions)).orderBy(desc(thawingLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/thawing', async (req, res, next) => {
  try {
    const entry = req.body;
    if (!canAccessHotel(req.user, entry.hotelId)) { res.status(403).json({ error: 'Hotel access denied' }); return; }
    await db.insert(thawingLogs).values({ ...entry, managerId: req.user!.id, managerName: req.user!.name });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/thawing/:id', async (req, res, next) => {
  try {
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
    if (!hotel || !canAccessHotel(req.user, hotel)) { res.status(403).json({ error: 'Hotel access denied' }); return; }
    const conditions = [eq(receivedLogs.hotelId, hotel)];
    if (date) conditions.push(eq(receivedLogs.date, date));
    const rows = await db.select().from(receivedLogs).where(and(...conditions)).orderBy(desc(receivedLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/received', async (req, res, next) => {
  try {
    const entry = req.body;
    if (!canAccessHotel(req.user, entry.hotelId)) { res.status(403).json({ error: 'Hotel access denied' }); return; }
    await db.insert(receivedLogs).values({ ...entry, managerId: req.user!.id, managerName: req.user!.name });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/received/:id', async (req, res, next) => {
  try {
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
    if (!hotel || !canAccessHotel(req.user, hotel)) { res.status(403).json({ error: 'Hotel access denied' }); return; }
    const conditions = [eq(disinfectionLogs.hotelId, hotel)];
    if (date) conditions.push(eq(disinfectionLogs.date, date));
    const rows = await db.select().from(disinfectionLogs).where(and(...conditions)).orderBy(desc(disinfectionLogs.createdAt));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/disinfection', async (req, res, next) => {
  try {
    const entry = req.body;
    if (!canAccessHotel(req.user, entry.hotelId)) { res.status(403).json({ error: 'Hotel access denied' }); return; }
    await db.insert(disinfectionLogs).values({ ...entry, managerId: req.user!.id, managerName: req.user!.name });
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/disinfection/:id', async (req, res, next) => {
  try {
    const [row] = await db.select().from(disinfectionLogs).where(eq(disinfectionLogs.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canAccessHotel(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.delete(disinfectionLogs).where(eq(disinfectionLogs.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
