import { db } from '~/db/client';
import { loginAttempts } from '~/db/schema';
import { gte, eq, count, and } from 'drizzle-orm';

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

/**
 * Cuenta cuántos intentos fallidos hubo desde esta IP en los últimos 15 minutos.
 */
export function failedAttemptsSince(ip: string): number {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const row = db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.exitoso, 0),
        gte(loginAttempts.createdAt, since),
      ),
    )
    .get();
  return row?.n ?? 0;
}

export function isRateLimited(ip: string): boolean {
  return failedAttemptsSince(ip) >= MAX_FAILURES;
}

export function recordAttempt(ip: string, exitoso: boolean): void {
  db.insert(loginAttempts).values({ ip, exitoso: exitoso ? 1 : 0 }).run();
}

export function clearAttempts(ip: string): void {
  db.delete(loginAttempts).where(eq(loginAttempts.ip, ip)).run();
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}