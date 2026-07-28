import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { eq } from 'drizzle-orm';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect }) => {
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/overrides/nuevo?error=csrf', 302);
  }

  const turnoId = Number(formData.get('turno_id'));
  const farmaciaId = Number(formData.get('farmacia_id'));
  const motivo = String(formData.get('motivo') ?? '').trim();

  if (!turnoId || !farmaciaId || !motivo) {
    return redirect('/admin/overrides/nuevo?error=required', 302);
  }

  // Tomar el rango del turno original para el override
  const turno = db.select().from(schema.turnos).where(eq(schema.turnos.id, turnoId)).get();
  if (!turno) {
    return redirect('/admin/overrides/nuevo?error=notfound', 302);
  }

  // El override es vigente desde ahora hasta el fin del turno
  const ahora = new Date().toISOString();

  db.insert(schema.anunciosTurno)
    .values({
      turnoId,
      farmaciaSustitutaId: farmaciaId,
      motivo,
      vigenteDesdeUtc: ahora,
      vigenteHastaUtc: turno.finUtc,
    })
    .run();

  log('OVERRIDE_CREAR', { turnoId, farmaciaSustitutaId: farmaciaId, motivo });
  return redirect('/admin/overrides', 302);
};