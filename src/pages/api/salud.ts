import type { APIRoute } from 'astro';
import { db } from '~/db/client';
import { farmacias } from '~/db/schema';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const count = db.select({ id: farmacias.id }).from(farmacias).all().length;
    return new Response(
      JSON.stringify({
        ok: true,
        farmacias: count,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
};