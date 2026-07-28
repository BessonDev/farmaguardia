import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { eq } from 'drizzle-orm';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies: ctxCookies, redirect }) => {
  const id = Number(params.id);
  if (!id) return redirect('/admin/plantillas', 302);

  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/plantillas?error=csrf', 302);
  }

  db.delete(schema.plantillas).where(eq(schema.plantillas.id, id)).run();
  log('PLANTILLA_BORRAR', { id });
  return redirect('/admin/plantillas', 302);
};
