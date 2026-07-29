import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { cookies, verifyCsrf } from '~/lib/auth';
import { log } from '~/lib/audit';
import { turnoCaracas, caracasToUtc } from '~/lib/tz';

export const prerender = false;

interface Fila {
  farmaciaId: number;
  fechaInicio: string;
  fechaFin: string | null;
  notas: string | null;
}

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect }) => {
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const formData = await request.formData();

  if (!verifyCsrf(String(formData.get('_csrf') ?? ''), csrfCookie)) {
    return redirect('/admin/turnos/importar?error=csrf', 302);
  }

  const rawRows = formData.getAll('rows') as string[];
  const rows: Fila[] = [];
  for (const r of rawRows) {
    try {
      const parsed = JSON.parse(r);
      if (typeof parsed.farmaciaId === 'number' && parsed.fechaInicio) {
        rows.push(parsed);
      }
    } catch {
      // skip invalid rows
    }
  }

  if (rows.length === 0) {
    return redirect('/admin/turnos/importar?error=import', 302);
  }

  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    try {
      const fechaHoraInicio = row.fechaFin
        ? row.fechaInicio
        : row.fechaInicio;

      const horaInicio = fechaHoraInicio.includes('T')
        ? fechaHoraInicio.split('T')[1]
        : fechaHoraInicio.includes(' ')
          ? fechaHoraInicio.split(' ')[1] || '08:00'
          : '08:00';

      const fechaInicio = fechaHoraInicio.includes('T')
        ? fechaHoraInicio.split('T')[0]
        : fechaHoraInicio.split(' ')[0];

      const horaFin = row.fechaFin
        ? (row.fechaFin.includes('T')
          ? row.fechaFin.split('T')[1]
          : row.fechaFin.includes(' ')
            ? row.fechaFin.split(' ')[1] || '08:00'
            : '08:00')
        : '08:00';

      const fechaFin = row.fechaFin
        ? (row.fechaFin.includes('T')
          ? row.fechaFin.split('T')[0]
          : row.fechaFin.split(' ')[0])
        : null;

      const { inicioUtc, finUtc } = turnoCaracas(fechaInicio, horaInicio, horaFin);
      const finalUtc = fechaFin
        ? caracasToUtc(`${fechaFin}T${horaFin}:00`)
        : finUtc;

      db.insert(schema.turnos)
        .values({
          farmaciaId: row.farmaciaId,
          inicioUtc,
          finUtc: finalUtc,
          notas: row.notas,
        })
        .run();

      ok++;
    } catch {
      fail++;
    }
  }

  log('CSV_IMPORT', { ok, fail });

  if (fail > 0) {
    return redirect(`/admin/turnos/importar?ok=${ok}&fail=${fail}`, 302);
  }
  return redirect(`/admin/turnos/importar?ok=${ok}`, 302);
};
