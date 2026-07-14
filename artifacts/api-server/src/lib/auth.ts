import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '@workspace/db';
import { sessions, users } from '@workspace/db/schema';
import { eq, gt } from 'drizzle-orm';

// ─── Password hashing ─────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

// ─── Token generation ─────────────────────────────────────────────────────────

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Auth middleware ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  allowedHotels: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const [session] = await db
      .select({ userId: sessions.userId, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      allowedHotels: user.allowedHotels as string[],
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireDirector(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'director') {
    res.status(403).json({ error: 'Director access required' });
    return;
  }
  next();
}
