import { hash, verify } from '@node-rs/argon2';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'fg_session';
const CSRF_COOKIE = 'fg_csrf';
const CSRF_FIELD = '_csrf';

const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 chars');
  }
  return s;
}

/**
 * Hashea un password con argon2id.
 * Usar al rotar la variable ADMIN_PASSWORD_HASH en .env.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  try {
    return await verify(hashStr, password, ARGON2_OPTS);
  } catch {
    return false;
  }
}

/**
 * Firma un payload con HMAC-SHA256.
 * Devuelve `base64(payload).base64(hmac)`.
 */
export function signCookie(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64url');
  const mac = createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${mac}`;
}

/**
 * Verifica firma y devuelve el payload original, o null si está corrupto/expirado.
 */
export function verifyCookie<T = unknown>(cookie: string, maxAgeSeconds = 60 * 60 * 24 * 7): T | null {
  const parts = cookie.split('.');
  if (parts.length !== 2) return null;
  const [b64, mac] = parts;
  const expectedMac = createHmac('sha256', getSecret()).update(b64).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expectedMac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as { exp?: number };
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (typeof payload.exp === 'number' && payload.exp - Math.floor(Date.now() / 1000) > maxAgeSeconds + 60) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  sub: 'admin';
  iat: number;
  exp: number;
}

export function makeSession(ttlSeconds = 60 * 60 * 24 * 7): { value: string; payload: SessionPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub: 'admin', iat: now, exp: now + ttlSeconds };
  return { value: signCookie(payload), payload };
}

export function readSession(cookie: string | undefined): SessionPayload | null {
  if (!cookie) return null;
  return verifyCookie<SessionPayload>(cookie);
}

export function makeCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function verifyCsrf(formToken: string | undefined, cookieToken: string | undefined): boolean {
  if (!formToken || !cookieToken) return false;
  if (formToken.length !== cookieToken.length) return false;
  return timingSafeEqual(Buffer.from(formToken), Buffer.from(cookieToken));
}

export const cookies = {
  session: SESSION_COOKIE,
  csrf: CSRF_COOKIE,
  csrfField: CSRF_FIELD,
};

export function buildSessionSetCookie(value: string, maxAge = 60 * 60 * 24 * 7): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

export function buildCsrfSetCookie(value: string): string {
  return `${CSRF_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=86400`;
}

export function buildClearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}