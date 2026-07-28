import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { log } from '~/lib/audit';
import { turnoCaracas } from '~/lib/tz';
import { eq } from 'drizzle-orm';
import { addDays, parseISO, format } from 'date-fns';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies: ctxCookies, redirect }) => {
  const plantillaId = Number(params.id);
  if (!plantillaId) return redirect('/admin/plantillas?error=invalid', 302);

  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/plantillas/aplicar?error=csrf', 302);
  }

  const desde = String(formData.get('desde') ?? '');
  const hasta = String(formData.get('hasta') ?? '');
  const horaInicio = String(formData.get('hora_inicio') ?? '08:00');
  const horaFin = String(formData.get('hora_fin') ?? '08:00');

  if (!desde || !hasta) {
    return redirect(`/admin/plantillas/aplicar?plantilla_id=${plantillaId}&error=required`, 302);
  }

  const slots = db
    .select()
    .from(schema.plantillaSlots)
    .where(eq(schema.plantillaSlots.plantillaId, plantillaId))
    .orderBy(schema.plantillaSlots.posicion)
    .all();

  if (slots.length === 0) {
    return redirect(`/admin/plantillas/aplicar?plantilla_id=${plantillaId}&error=emptyslots`, 302);
  }

  let current = parseISO(desde);
  const end = parseISO(hasta);
  let idx = 0;
  const values: Array<typeof schema.turnos.$inferInsert> = [];

  while (current <= end) {
    const fechaLocal = format(current, 'yyyy-MM-dd');
    const slot = slots[idx % slots.length];
    const { inicioUtc, finUtc } = turnoCaracas(fechaLocal, horaInicio, horaFin);

    values.push({
      farmaciaId: slot.farmaciaId,
      inicioUtc,
      finUtc,
      notas: `Generado desde plantilla #${plantillaId}`,
    });

    current = addDays(current, 1);
    idx++;
  }

  if (values.length > 0) {
    db.insert(schema.turnos).values(values).run();
  }

  log('PLANTILLA_APLICAR', { plantillaId, desde, hasta, turnos: values.length });
  return redirect(`/admin/plantillas?ok=aplicado&total=${values.length}`, 302);
};
