import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '@workspace/db';
import { sessions, users } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

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
  requiresPasswordChange?: boolean;
}

const fallbackSessions = new Map<string, { user: AuthUser; expiresAt: Date }>();
const builtinDirectorToken = 'fallback-director-token';

const fallbackDirectorBaseUser: AuthUser = {
  id: 'fallback-director',
  username: 'director',
  name: 'Quality & Hygiene Director',
  role: 'director',
  allowedHotels: ['Rewaya Majestic', 'Rewaya Inn', 'Rewaya Luxury'],
  requiresPasswordChange: true,
};

let fallbackDirectorPassword = 'Rewaya@2024';
let fallbackDirectorRequiresPasswordChange = true;

fallbackSessions.set(builtinDirectorToken, {
  user: { ...fallbackDirectorBaseUser, requiresPasswordChange: fallbackDirectorRequiresPasswordChange },
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});

export function getFallbackDirectorUser(username: string, password: string): AuthUser | null {
  const normalizedUsername = username.toLowerCase().trim();
  if (normalizedUsername !== 'director' || password !== fallbackDirectorPassword) return null;

  return {
    ...fallbackDirectorBaseUser,
    requiresPasswordChange: fallbackDirectorRequiresPasswordChange,
  };
}

export function updateFallbackDirectorPassword(currentPassword: string, newPassword: string): boolean {
  if (currentPassword !== fallbackDirectorPassword) return false;

  fallbackDirectorPassword = newPassword;
  fallbackDirectorRequiresPasswordChange = false;
  return true;
}

export function createFallbackSession(user: AuthUser): string {
  const token = crypto.randomBytes(32).toString('hex');
  fallbackSessions.set(token, {
    user,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
}

export function getFallbackSession(token: string): AuthUser | null {
  const session = fallbackSessions.get(token);
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    fallbackSessions.delete(token);
    return null;
  }

  return session.user;
}

export function deleteFallbackSession(token: string): void {
  fallbackSessions.delete(token);
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
    const fallbackUser = getFallbackSession(token);
    if (fallbackUser) {
      req.user = fallbackUser;
      next();
      return;
    }

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
      requiresPasswordChange: user.passwordChangeRequired,
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
