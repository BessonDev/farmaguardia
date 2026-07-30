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
    return redirect(`/admin/farmacias/${id}?error=csrf`, 302);
  }

  const nombre = String(formData.get('nombre') ?? '').trim();
  const direccion = String(formData.get('direccion') ?? '').trim();
  if (!nombre || !direccion) {
    return redirect(`/admin/farmacias/${id}?error=required`, 302);
  }

  db.update(schema.farmacias)
    .set({
      nombre,
      direccion,
      sector: String(formData.get('sector') ?? '').trim() || null,
      telefono: String(formData.get('telefono') ?? '').trim() || null,
      whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
      latitud: parseFloat(formData.get('latitud') as string) || null,
      longitud: parseFloat(formData.get('longitud') as string) || null,
      imagenUrl: String(formData.get('imagen_url') ?? '').trim() || null,
      delivery: formData.get('delivery') === 'on' ? 1 : 0,
    })
    .where(eq(schema.farmacias.id, id))
    .run();

  log('FARMACIA_EDITAR', { id, nombre });
  return redirect('/admin/farmacias', 302);
};