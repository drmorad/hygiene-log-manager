import { Router } from 'express';
import { db } from '@workspace/db';
import { buffetLogs, thawingLogs, receivedLogs, disinfectionLogs, users } from '@workspace/db/schema';
import { eq, and, gte, desc, ne } from 'drizzle-orm';
import { requireAuth, requireDirector } from '../lib/auth';

const router = Router();
router.use(requireAuth, requireDirector);

const HOTELS = ['Rewaya Majestic', 'Rewaya Inn', 'Rewaya Luxury'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function calcCompliance(logs: { status: string }[]) {
  if (!logs.length) return null;
  const pass = logs.filter(l => l.status === 'pass').length;
  return Math.round((pass / logs.length) * 100);
}

interface ReceivedItem { name: string; quantity: string; unit: string; batchNumber?: string; }
interface ReceivedLog { id: string; hotelId: string; date: string; supplier: string; items: ReceivedItem[]; status: string; }

function isKgUnit(unit: string): boolean {
  const u = unit.toLowerCase().trim();
  return u === 'kg' || u === 'kilogram' || u === 'kilograms' || u === 'kilo' || u === 'g' || u === 'gram' || u === 'grams';
}

function parseKg(quantity: string, unit: string): number {
  const u = unit.toLowerCase().trim();
  const q = parseFloat(quantity);
  if (Number.isNaN(q)) return 0;
  if (u === 'g' || u === 'gram' || u === 'grams') return q / 1000;
  return q;
}

function totalKgForLogs(logs: ReceivedLog[]): number {
  let total = 0;
  for (const log of logs) {
    for (const item of (log.items || [])) {
      if (isKgUnit(item.unit)) total += parseKg(item.quantity, item.unit);
    }
  }
  return Math.round(total * 100) / 100;
}

function supplierBreakdown(logs: ReceivedLog[]) {
  const map: Record<string, { totalKg: number; deliveries: number }> = {};
  for (const log of logs) {
    const key = log.supplier || 'Unknown';
    if (!map[key]) map[key] = { totalKg: 0, deliveries: 0 };
    const entry = map[key];
    entry.deliveries++;
    for (const item of (log.items || [])) {
      if (isKgUnit(item.unit)) entry.totalKg += parseKg(item.quantity, item.unit);
    }
  }
  return Object.entries(map)
    .map(([supplier, data]) => ({
      supplier,
      totalKg: Math.round(data.totalKg * 100) / 100,
      deliveries: data.deliveries,
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

function itemBreakdown(logs: ReceivedLog[]) {
  const map: Record<string, number> = {};
  for (const log of logs) {
    for (const item of (log.items || [])) {
      if (!isKgUnit(item.unit)) continue;
      const key = item.name || 'Unknown';
      map[key] = (map[key] || 0) + parseKg(item.quantity, item.unit);
    }
  }
  return Object.entries(map)
    .map(([item, totalKg]) => ({ item, totalKg: Math.round(totalKg * 100) / 100 }))
    .sort((a, b) => b.totalKg - a.totalKg)
    .slice(0, 10);
}

function buildReceivingStats(logs: ReceivedLog[], today: string) {
  const week = logs;
  const todayLogs = logs.filter(l => l.date === today);
  return {
    totalKgToday: totalKgForLogs(todayLogs),
    totalKgWeek: totalKgForLogs(week),
    billsToday: todayLogs.length,
    billsWeek: week.length,
    bySupplier: supplierBreakdown(week),
    byItem: itemBreakdown(week),
  };
}

// GET /api/analytics — full director overview across all hotels
router.get('/', async (_req, res, next) => {
  try {
    const today = todayStr();
    const week = daysAgo(7);

    // Fetch all logs for the last 7 days across all hotels
    const [bAll, tAll, rAll, dAll, managerList] = await Promise.all([
      db.select().from(buffetLogs).where(gte(buffetLogs.date, week)).orderBy(desc(buffetLogs.createdAt)),
      db.select().from(thawingLogs).where(gte(thawingLogs.date, week)).orderBy(desc(thawingLogs.createdAt)),
      db.select().from(receivedLogs).where(gte(receivedLogs.date, week)).orderBy(desc(receivedLogs.createdAt)),
      db.select().from(disinfectionLogs).where(gte(disinfectionLogs.date, week)).orderBy(desc(disinfectionLogs.createdAt)),
      db.select({ id: users.id, name: users.name, username: users.username, allowedHotels: users.allowedHotels }).from(users).where(ne(users.role, 'director')),
    ]);

    const allLogs = [...bAll, ...tAll, ...rAll, ...dAll];
    const todayLogs = allLogs.filter(l => l.date === today);

    // Per-hotel breakdown
    const hotelStats = HOTELS.map(hotel => {
      const hLogs = allLogs.filter(l => l.hotelId === hotel);
      const hToday = todayLogs.filter(l => l.hotelId === hotel);
      const hReceived = rAll.filter(l => l.hotelId === hotel) as unknown as ReceivedLog[];
      const violations = hLogs.filter(l => l.status === 'fail');
      const cautions = hLogs.filter(l => l.status === 'caution');

      const ccpToday: Record<string, number> = {
        'CCP-1 Buffet': hToday.filter(l => 'temperature' in l && 'type' in l).length,
        'CCP-2 Thawing': hToday.filter(l => 'initialTemp' in l).length,
        'CCP-3 Received': hToday.filter(l => 'vehicleTemp' in l).length,
        'CCP-4 Disinfection': hToday.filter(l => 'concentration' in l).length,
      };

      // Missing CCPs today (0 entries)
      const missingCCPs = Object.entries(ccpToday).filter(([, v]) => v === 0).map(([k]) => k);

      // 7-day compliance trend (daily compliance %)
      const trend: { date: string; compliance: number | null }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = daysAgo(i);
        const dayLogs = hLogs.filter(l => l.date === d);
        trend.push({ date: d, compliance: calcCompliance(dayLogs) });
      }

      // Manager activity today
      const managerActivity: { managerId: string; managerName: string; count: number }[] = [];
      hToday.forEach(l => {
        const existing = managerActivity.find(m => m.managerId === (l as any).managerId);
        if (existing) existing.count++;
        else managerActivity.push({ managerId: (l as any).managerId, managerName: (l as any).managerName, count: 1 });
      });

      return {
        hotel,
        totalToday: hToday.length,
        totalWeek: hLogs.length,
        complianceToday: calcCompliance(hToday),
        complianceWeek: calcCompliance(hLogs),
        violationsWeek: violations.length,
        cautionsWeek: cautions.length,
        missingCCPs,
        ccpToday,
        trend,
        managerActivity,
        recentViolations: violations.slice(0, 10).map(v => ({
          id: (v as any).id,
          date: v.date,
          hotel: v.hotelId,
          managerName: (v as any).managerName,
          type: 'temperature' in v && 'type' in v ? `CCP-1 Buffet (${(v as any).type})` :
                'initialTemp' in v ? 'CCP-2 Thawing' :
                'vehicleTemp' in v ? 'CCP-3 Received' : 'CCP-4 Disinfection',
          item: (v as any).item || (v as any).itemName || (v as any).supplier || (v as any).items || '',
          correctiveAction: (v as any).correctiveAction || '',
        })),
        receiving: buildReceivingStats(hReceived, today),
      };
    });

    // Global totals
    const globalReceived = rAll as unknown as ReceivedLog[];
    const globalStats = {
      totalToday: todayLogs.length,
      totalWeek: allLogs.length,
      complianceToday: calcCompliance(todayLogs),
      complianceWeek: calcCompliance(allLogs),
      violationsToday: todayLogs.filter(l => l.status === 'fail').length,
      cautionsToday: todayLogs.filter(l => l.status === 'caution').length,
      missingHotels: hotelStats.filter(h => h.totalToday === 0).map(h => h.hotel),
      receiving: buildReceivingStats(globalReceived, today),
    };

    // Manager activity today
    const allManagerActivity: { managerId: string; managerName: string; hotel: string; count: number }[] = [];
    todayLogs.forEach(l => {
      const key = `${(l as any).managerId}|${l.hotelId}`;
      const existing = allManagerActivity.find(m => m.managerId === (l as any).managerId && m.hotel === l.hotelId);
      if (existing) existing.count++;
      else allManagerActivity.push({ managerId: (l as any).managerId, managerName: (l as any).managerName, hotel: l.hotelId, count: 1 });
    });

    res.json({
      global: globalStats,
      hotels: hotelStats,
      managerActivity: allManagerActivity,
      managers: managerList,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/:hotel — hotel-specific detail
router.get('/:hotel', async (req, res, next) => {
  try {
    const hotel = decodeURIComponent(req.params.hotel);
    if (!HOTELS.includes(hotel)) { res.status(400).json({ error: 'Invalid hotel' }); return; }

    const [bAll, tAll, rAll, dAll] = await Promise.all([
      db.select().from(buffetLogs).where(eq(buffetLogs.hotelId, hotel)).orderBy(desc(buffetLogs.createdAt)).limit(200),
      db.select().from(thawingLogs).where(eq(thawingLogs.hotelId, hotel)).orderBy(desc(thawingLogs.createdAt)).limit(200),
      db.select().from(receivedLogs).where(eq(receivedLogs.hotelId, hotel)).orderBy(desc(receivedLogs.createdAt)).limit(200),
      db.select().from(disinfectionLogs).where(eq(disinfectionLogs.hotelId, hotel)).orderBy(desc(disinfectionLogs.createdAt)).limit(200),
    ]);

    res.json({ hotel, buffet: bAll, thawing: tAll, received: rAll, disinfection: dAll });
  } catch (err) { next(err); }
});

export default router;
