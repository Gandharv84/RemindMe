import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { Role } from '../src/types';

const scrypt = promisify(scryptCallback);
const tokenTtlSeconds = 60 * 60;
const developmentSecret = randomBytes(32).toString('hex');
function getSessionSecret() {
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET, 'utf8') < 32)) throw new Error('SESSION_SECRET must contain at least 32 bytes in production');
  return process.env.SESSION_SECRET || developmentSecret;
}

export interface SessionUser {
  id: string;
  role: Role;
  showroomId: string;
  exp: number;
}

declare global {
  namespace Express {
    interface Request { auth?: SessionUser }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string | undefined): Promise<boolean> {
  if (!encoded || typeof password !== 'string') return false;
  if (/^\$2[aby]\$\d{2}\$/.test(encoded)) {
    try { return await bcrypt.compare(password, encoded); } catch { return false; }
  }
  const [scheme, salt, expectedHex, extra] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !expectedHex || extra) return false;
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    if (expected.length !== 64) return false;
    const actual = await scrypt(password, salt, expected.length) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch { return false; }
}

export function createSessionToken(user: Omit<SessionUser, 'exp'>, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(now / 1000) + tokenTtlSeconds })).toString('base64url');
  const signature = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string, now = Date.now()): SessionUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  let expected: Buffer;
  try { expected = createHmac('sha256', getSessionSecret()).update(payload).digest(); } catch { return null; }
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser;
    if (!value.id || !value.showroomId || !['EMPLOYEE', 'ADMIN', 'CUSTOMER'].includes(value.role) || !Number.isInteger(value.exp) || value.exp <= Math.floor(now / 1000)) return null;
    return value;
  } catch { return null; }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = verifySessionToken(token);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  req.auth = session;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

export function safeCustomer<T extends { passwordHash?: string }>(customer: T) {
  const value = customer as unknown as Record<string, unknown>;
  const publicCustomer: Record<string, unknown> = {};
  for (const key of ['id','showroomId','customerCode','name','phone','email','address','city','pincode','status','preferredChannel','vehicleCount','vehicles','role','showroomName']) {
    if (key in value) publicCustomer[key] = value[key];
  }
  return publicCustomer;
}

export function safeEmployee<T extends { passwordHash?: string }>(employee: T) {
  const value = employee as unknown as Record<string, unknown>;
  const publicEmployee: Record<string, unknown> = {};
  for (const key of ['id','name','email','phone','role','showroomId','designation','showroomName']) {
    if (key in value) publicEmployee[key] = value[key];
  }
  return publicEmployee;
}

export function safeDocument<T extends { verificationCode?: string }>(document: T) {
  const { verificationCode: _verificationCode, ...publicDocument } = document;
  return publicDocument;
}
