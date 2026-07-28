import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { eq } from 'drizzle-orm';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies: ctxCookies, redirect }) => {
  const id = Number(params.id);
  if (!id) return redirect('/admin/farmacias', 302);

  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/farmacias?error=csrf', 302);
  }

  const f = db.select().from(schema.farmacias).where(eq(schema.farmacias.id, id)).get();
  if (!f) return redirect('/admin/farmacias', 302);

  const nuevoEstado = f.activa === 1 ? 0 : 1;
  db.update(schema.farmacias).set({ activa: nuevoEstado }).where(eq(schema.farmacias.id, id)).run();

  log('FARMACIA_TOGGLE', { id, nombre: f.nombre, activa: nuevoEstado });
  return redirect('/admin/farmacias', 302);
};