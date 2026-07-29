import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect }) => {
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/plantillas/nueva?error=csrf', 302);
  }

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) {
    return redirect('/admin/plantillas/nueva?error=required', 302);
  }

  // Extraer slots: farmacia_id_X donde X es la posición
  const slots: Array<{ posicion: number; farmaciaId: number }> = [];
  for (const [key, val] of formData.entries()) {
    const match = key.match(/^farmacia_id_(\d+)$/);
    if (match) {
      const fid = Number(val);
      if (fid) {
        slots.push({ posicion: Number(match[1]), farmaciaId: fid });
      }
    }
  }

  if (slots.length === 0) {
    return redirect('/admin/plantillas/nueva?error=noslots', 302);
  }

  slots.sort((a, b) => a.posicion - b.posicion);

  const plantilla = db.insert(schema.plantillas).values({ nombre }).returning().get();

  db.insert(schema.plantillaSlots)
    .values(slots.map((s) => ({ plantillaId: plantilla.id, ...s })))
    .run();

  log('PLANTILLA_CREAR', { plantillaId: plantilla.id, nombre, slots: slots.length });
  return redirect('/admin/plantillas', 302);
};
