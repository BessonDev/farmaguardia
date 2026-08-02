/**
 * Fingerprinting simple para reportes comunitarios.
 * - huella_local: ID aleatorio persistido en localStorage por el cliente.
 * - ip_hash: hash HMAC-SHA256 de la IP (no se almacena la IP cruda).
 */

import { createHmac, randomBytes } from 'node:crypto';

const IP_HASH_SECRET =
  import.meta.env.FINGERPRINT_SECRET ||
  'farmaguardia-default-secret-change-me';

export function hashIp(ip: string): string {
  return createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex');
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function generateHuellaLocal(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Lee el cuerpo JSON de forma segura. Retorna null si no es JSON válido.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const data = await request.json();
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}
