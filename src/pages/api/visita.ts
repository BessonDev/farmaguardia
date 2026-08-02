import type { APIRoute } from 'astro';
import { db } from '../../db';
import { visitas } from '../../db/schema';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => null);
    const ruta = body?.ruta && typeof body.ruta === 'string'
      ? body.ruta.slice(0, 200)
      : '/';

    await db.insert(visitas).values({ ruta });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error registrando visita:', e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ ok: true, method: 'POST' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
