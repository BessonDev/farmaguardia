import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { handleTelegramUpdate, getTelegramWebhookSecret } from '../../../utils/telegram';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const POST: APIRoute = async ({ request }) => {
  const secret = getTelegramWebhookSecret();

  // Verificar secret token del webhook si está configurado
  if (secret) {
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (!headerSecret || !safeEqual(headerSecret, secret)) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Procesar el update sin bloquear la respuesta (el bot responde vía API)
  if (update && typeof update === 'object' && 'message' in (update as object)) {
    await handleTelegramUpdate(update as Parameters<typeof handleTelegramUpdate>[0]);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
