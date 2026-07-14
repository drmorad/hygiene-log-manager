import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '@workspace/db';
import { users, sessions } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateToken, requireAuth } from '../lib/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase().trim())).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(sessions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      expiresAt,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        allowedHotels: user.allowedHotels,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.headers.authorization!.slice(7);
    await db.delete(sessions).where(eq(sessions.token, token));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
