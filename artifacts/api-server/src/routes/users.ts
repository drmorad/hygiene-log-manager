import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '@workspace/db';
import { users } from '@workspace/db/schema';
import { eq, ne } from 'drizzle-orm';
import { requireAuth, requireDirector, hashPassword, verifyPassword, getFallbackSession, updateFallbackDirectorPassword } from '../lib/auth';
import { fallbackManagers, type ManagerRecord } from '../lib/fallback-manager-store';

const HOTELS = ['Rewaya Majestic', 'Rewaya Inn', 'Rewaya Luxury'];

function shouldUseFallbackStorage() {
  return !process.env.DATABASE_URL || process.env.NODE_ENV !== 'production';
}

const router = Router();
router.use(requireAuth);

// GET /api/users — list all managers (director only)
router.get('/', requireDirector, async (_req, res, next) => {
  try {
    if (shouldUseFallbackStorage()) {
      res.json(fallbackManagers.list());
      return;
    }

    const all = await db
      .select({ id: users.id, username: users.username, name: users.name, role: users.role, allowedHotels: users.allowedHotels, createdAt: users.createdAt })
      .from(users)
      .where(ne(users.role, 'director'));
    res.json(all);
  } catch (err) { next(err); }
});

// POST /api/users — create a manager (director only)
router.post('/', requireDirector, async (req, res, next) => {
  try {
    const { username, password, name, allowedHotels } = req.body as {
      username: string; password: string; name: string; allowedHotels: string[];
    };
    if (!username || !password || !name) {
      res.status(400).json({ error: 'username, password and name are required' });
      return;
    }
    if (!Array.isArray(allowedHotels) || allowedHotels.some(h => !HOTELS.includes(h))) {
      res.status(400).json({ error: 'Invalid hotel names' });
      return;
    }

    const id = crypto.randomUUID();
    const normalizedUsername = username.toLowerCase().trim();

    if (shouldUseFallbackStorage()) {
      const created: ManagerRecord = {
        id,
        username: normalizedUsername,
        name: name.trim(),
        role: 'manager',
        allowedHotels,
        createdAt: new Date().toISOString(),
      };
      fallbackManagers.add(created);
      res.status(201).json(created);
      return;
    }

    await db.insert(users).values({
      id,
      username: normalizedUsername,
      passwordHash: hashPassword(password),
      name: name.trim(),
      role: 'manager',
      allowedHotels,
    });

    const [created] = await db
      .select({ id: users.id, username: users.username, name: users.name, role: users.role, allowedHotels: users.allowedHotels, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    next(err);
  }
});

// PATCH /api/users/:id — update name/hotels/password (director only)
router.patch('/:id', requireDirector, async (req, res, next) => {
  try {
    const { name, allowedHotels, password } = req.body as { name?: string; allowedHotels?: string[]; password?: string };
    const updates: Record<string, any> = {};
    if (name) updates.name = name.trim();
    if (allowedHotels) {
      if (allowedHotels.some(h => !HOTELS.includes(h))) {
        res.status(400).json({ error: 'Invalid hotel names' }); return;
      }
      updates.allowedHotels = allowedHotels;
    }
    if (password) updates.passwordHash = hashPassword(password);

    await db.update(users).set(updates).where(eq(users.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/users/me/password — change own password
router.patch('/me/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' }); return;
    }

    if (req.user?.id === 'fallback-director') {
      const fallbackUser = getFallbackSession(req.headers.authorization!.slice(7));
      if (!fallbackUser) {
        res.status(401).json({ error: 'Session expired' }); return;
      }
      if (!updateFallbackDirectorPassword(currentPassword, newPassword)) {
        res.status(401).json({ error: 'Current password incorrect' }); return;
      }
      res.json({ ok: true });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: 'Current password incorrect' }); return;
    }
    await db.update(users).set({
      passwordHash: hashPassword(newPassword),
      passwordChangeRequired: false,
      lastPasswordChangedAt: new Date(),
    }).where(eq(users.id, user.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id (director only)
router.delete('/:id', requireDirector, async (req, res, next) => {
  try {
    if (shouldUseFallbackStorage()) {
      fallbackManagers.remove(req.params.id);
      res.json({ ok: true });
      return;
    }

    await db.delete(users).where(eq(users.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
