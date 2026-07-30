import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect }) => {
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/farmacias/nueva?error=csrf', 302);
  }

  const nombre = String(formData.get('nombre') ?? '').trim();
  const direccion = String(formData.get('direccion') ?? '').trim();
  if (!nombre || !direccion) {
    return redirect('/admin/farmacias/nueva?error=required', 302);
  }

  const f = db
    .insert(schema.farmacias)
    .values({
      nombre,
      direccion,
      sector: String(formData.get('sector') ?? '').trim() || null,
      telefono: String(formData.get('telefono') ?? '').trim() || null,
      whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
      latitud: parseFloat(formData.get('latitud') as string) || null,
      longitud: parseFloat(formData.get('longitud') as string) || null,
      imagenUrl: String(formData.get('imagen_url') ?? '').trim() || null,
      delivery: formData.get('delivery') === 'on' ? 1 : 0,
      activa: 1,
    })
    .returning()
    .get();

  log('FARMACIA_CREAR', { id: f.id, nombre });
  return redirect('/admin/farmacias', 302);
};