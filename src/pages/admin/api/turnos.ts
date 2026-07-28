import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { log } from '~/lib/audit';
import { turnoCaracas, caracasToUtc } from '~/lib/tz';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect }) => {
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/turnos/nuevo?error=csrf', 302);
  }

  const farmaciaId = Number(formData.get('farmacia_id'));
  const fechaInicio = String(formData.get('fecha_inicio') ?? '');
  const horaInicio = String(formData.get('hora_inicio') ?? '08:00');
  const fechaFinRaw = String(formData.get('fecha_fin') ?? '');
  const horaFin = String(formData.get('hora_fin') ?? '08:00');
  const notas = String(formData.get('notas') ?? '').trim() || null;

  if (!farmaciaId || !fechaInicio) {
    return redirect('/admin/turnos/nuevo?error=required', 302);
  }

  // Si no hay fecha fin, es turno de 24h (día siguiente)
  const fechaFin = fechaFinRaw || null;

  const { inicioUtc, finUtc } = turnoCaracas(fechaInicio, horaInicio, horaFin);

  // Si el usuario explicitó una fecha_fin, calcular fin con esa fecha + hora
  const finalUtc = fechaFin
    ? caracasToUtc(`${fechaFin}T${horaFin}:00`)
    : finUtc;

  db.insert(schema.turnos)
    .values({
      farmaciaId,
      inicioUtc,
      finUtc: finalUtc,
      notas,
    })
    .run();

  log('TURNO_CREAR', { farmaciaId, fechaInicio, fechaFin: fechaFin || '(24h)' });
  return redirect('/admin/turnos', 302);
};