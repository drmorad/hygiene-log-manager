import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { db } from '@workspace/db';
import { graduateWorksheets } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, isFallbackMode } from '../lib/auth';
import { HttpError, assert } from '../lib/errors';
import { getFallbackStore } from '../lib/fallback-log-store';

const router = Router();
router.use(requireAuth);

// A worksheet is owned by the submitting manager; directors see everything.
function canList(user: Express.Request['user'], rowHotelId: string): boolean {
  if (user?.role === 'director') return true;
  return user?.allowedHotels?.includes(rowHotelId) ?? false;
}

function toBool(v: unknown): boolean | null {
  if (v === undefined || v === null || v === '') return null;
  return v === true || v === 'true' || v === 'yes' || v === 'Y';
}

interface WorksheetInput {
  id: string;
  hotelId: string;
  managerId: string;
  managerName: string;
  date: string;
  standupRisk?: string;
  standupFixed?: string;
  standupVip?: string;
  auditZone?: string;
  auditTimeInOut?: string;
  auditStandard?: string;
  auditFinding?: string;
  photoRef?: string;
  nonConformities?: { location: string; violation: string; correctiveAction: string }[];
  mentorConcept?: string;
  mentorChange?: string;
  mentorQuestion?: string;
  selfLogsOnTime?: boolean;
  selfAuditHonest?: boolean;
  selfZonesCovered?: boolean;
  selfPhotosAttached?: boolean;
  signature?: string;
}

function buildWorksheet(body: Record<string, unknown>, manager: { id: string; name: string }): WorksheetInput {
  if (typeof body !== 'object' || body === null) throw new HttpError(400, 'Request body must be an object');
  const hotelId = body.hotelId;
  const date = body.date;
  if (!hotelId || !date) throw new HttpError(400, 'hotelId and date are required');

  let nonConformities: WorksheetInput['nonConformities'] = [];
  if (Array.isArray(body.nonConformities)) {
    nonConformities = body.nonConformities
      .filter((n: any) => n && (n.location || n.violation))
      .map((n: any) => ({
        location: String(n.location ?? ''),
        violation: String(n.violation ?? ''),
        correctiveAction: String(n.correctiveAction ?? ''),
      }));
  }

  return {
    id: typeof body.id === 'string' && body.id ? body.id : randomUUID(),
    hotelId: String(hotelId),
    date: String(date),
    managerId: manager.id,
    managerName: manager.name,
    standupRisk: body.standupRisk ? String(body.standupRisk) : null,
    standupFixed: body.standupFixed ? String(body.standupFixed) : null,
    standupVip: body.standupVip ? String(body.standupVip) : null,
    auditZone: body.auditZone ? String(body.auditZone) : null,
    auditTimeInOut: body.auditTimeInOut ? String(body.auditTimeInOut) : null,
    auditStandard: body.auditStandard ? String(body.auditStandard) : null,
    auditFinding: body.auditFinding ? String(body.auditFinding) : null,
    photoRef: body.photoRef ? String(body.photoRef) : null,
    nonConformities,
    mentorConcept: body.mentorConcept ? String(body.mentorConcept) : null,
    mentorChange: body.mentorChange ? String(body.mentorChange) : null,
    mentorQuestion: body.mentorQuestion ? String(body.mentorQuestion) : null,
    selfLogsOnTime: toBool(body.selfLogsOnTime),
    selfAuditHonest: toBool(body.selfAuditHonest),
    selfZonesCovered: toBool(body.selfZonesCovered),
    selfPhotosAttached: toBool(body.selfPhotosAttached),
    signature: body.signature ? String(body.signature) : null,
  } as WorksheetInput;
}

// ─── List ──────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { hotel, date, managerId } = req.query as { hotel?: string; date?: string; managerId?: string };
    if (isFallbackMode()) {
      let rows = getFallbackStore('worksheets')!.all();
      if (hotel) rows = rows.filter((r) => r.hotelId === hotel);
      if (date) rows = rows.filter((r) => r.date === date);
      if (req.user?.role !== 'director' && managerId) rows = rows.filter((r) => r.managerId === managerId);
      if (req.user?.role !== 'director') rows = rows.filter((r) => r.managerId === req.user?.id);
      res.json(rows.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date))));
      return;
    }
    const conditions = [];
    if (hotel) conditions.push(eq(graduateWorksheets.hotelId, hotel));
    if (date) conditions.push(eq(graduateWorksheets.date, date));
    // Managers only ever see their own submissions.
    if (req.user?.role !== 'director') {
      conditions.push(eq(graduateWorksheets.managerId, req.user!.id));
    } else if (managerId) {
      conditions.push(eq(graduateWorksheets.managerId, managerId));
    }
    const rows = await db.select().from(graduateWorksheets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(graduateWorksheets.date));
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── Create / Update ────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    assert(canList(req.user, String(body.hotelId ?? '')), 403, 'Hotel access denied');
    const values = buildWorksheet(body, req.user!);
    if (isFallbackMode()) {
      getFallbackStore('worksheets')!.add(values as any);
    } else {
      await db.insert(graduateWorksheets).values(values as any)
        .onConflictDoUpdate({
          target: graduateWorksheets.id,
          set: {
            standupRisk: values.standupRisk,
            standupFixed: values.standupFixed,
            standupVip: values.standupVip,
            auditZone: values.auditZone,
            auditTimeInOut: values.auditTimeInOut,
            auditStandard: values.auditStandard,
            auditFinding: values.auditFinding,
            photoRef: values.photoRef,
            nonConformities: values.nonConformities,
            mentorConcept: values.mentorConcept,
            mentorChange: values.mentorChange,
            mentorQuestion: values.mentorQuestion,
            selfLogsOnTime: values.selfLogsOnTime,
            selfAuditHonest: values.selfAuditHonest,
            selfZonesCovered: values.selfZonesCovered,
            selfPhotosAttached: values.selfPhotosAttached,
            signature: values.signature,
          },
        });
    }
    res.status(201).json({ ok: true, id: values.id });
  } catch (err) { next(err); }
});

// ─── Single ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    if (isFallbackMode()) {
      const row = getFallbackStore('worksheets')!.all().find((r) => r.id === req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      if (!canList(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
      res.json(row);
      return;
    }
    const [row] = await db.select().from(graduateWorksheets)
      .where(eq(graduateWorksheets.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canList(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

// ─── Delete ──────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (isFallbackMode()) {
      const row = getFallbackStore('worksheets')!.all().find((r) => r.id === req.params.id);
      if (!row) { res.status(404).json({ error: 'Not found' }); return; }
      if (!canList(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
      getFallbackStore('worksheets')!.remove(req.params.id);
      res.json({ ok: true });
      return;
    }
    const [row] = await db.select().from(graduateWorksheets)
      .where(eq(graduateWorksheets.id, req.params.id)).limit(1);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    if (!canList(req.user, row.hotelId)) { res.status(403).json({ error: 'Forbidden' }); return; }
    await db.delete(graduateWorksheets).where(eq(graduateWorksheets.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
