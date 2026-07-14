import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '@workspace/db';
import { users } from '@workspace/db/schema';
import { eq, ne } from 'drizzle-orm';
import { requireAuth, requireDirector, hashPassword, verifyPassword } from '../lib/auth';

const HOTELS = ['Rewaya Majestic', 'Rewaya Inn', 'Rewaya Luxury'];

const router = Router();
router.use(requireAuth);

// GET /api/users — list all managers (director only)
router.get('/', requireDirector, async (_req, res, next) => {
  try {
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
    await db.insert(users).values({
      id,
      username: username.toLowerCase().trim(),
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
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: 'Current password incorrect' }); return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' }); return;
    }
    await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id (director only)
router.delete('/:id', requireDirector, async (req, res, next) => {
  try {
    await db.delete(users).where(eq(users.id, req.params.id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
