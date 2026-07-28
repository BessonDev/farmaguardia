import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { eq } from 'drizzle-orm';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies: ctxCookies, redirect }) => {
  const id = Number(params.id);
  if (!id) return redirect('/admin/turnos', 302);

  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/turnos?error=csrf', 302);
  }

  db.delete(schema.turnos).where(eq(schema.turnos.id, id)).run();
  log('TURNO_BORRAR', { id });
  return redirect('/admin/turnos', 302);
};