import type { APIRoute } from 'astro';
import { db, schema } from '~/db/client';
import { eq, and, lte, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { notificarReporte, hashIp } from '~/lib/notificar';

export const prerender = false;

const MAX_REPORTES_POR_IP = 3;
const VENTANA_MINUTOS = 60;

export const POST: APIRoute = async ({ request }) => {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'desconocida';

  const ipHash = hashIp(ip);

  // Rate limit por IP
  const ventana = new Date(Date.now() - VENTANA_MINUTOS * 60 * 1000).toISOString();
  const count = db
    .select({ total: sql<number>`COUNT(*)` })
    .from(schema.reportes)
    .where(
      and(
        eq(schema.reportes.ipHash, ipHash),
        gte(schema.reportes.createdAt, ventana),
      ),
    )
    .get();

  if (count && count.total >= MAX_REPORTES_POR_IP) {
    return new Response(
      JSON.stringify({ error: 'Demasiados reportes. Esperá un rato antes de reportar de nuevo.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Leer body como JSON o form
  let body: { turno_id?: string; motivo?: string; contacto?: string };
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = await request.json();
  } else {
    const fd = await request.formData();
    body = {
      turno_id: String(fd.get('turno_id') ?? ''),
      motivo: String(fd.get('motivo') ?? ''),
      contacto: String(fd.get('contacto') ?? ''),
    };
  }

  const turnoId = Number(body.turno_id);
  const motivo = String(body.motivo ?? '').trim();
  const contacto = String(body.contacto ?? '').trim() || null;

  if (!turnoId || !motivo || motivo.length < 5) {
    return new Response(
      JSON.stringify({ error: 'Motivo muy corto (mín. 5 caracteres).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (motivo.length > 500) {
    return new Response(
      JSON.stringify({ error: 'Motivo muy largo (máx. 500 caracteres).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Insertar reporte
  db.insert(schema.reportes)
    .values({ turnoId, motivo, contacto, ipHash })
    .run();

  // Obtener datos para la notificación
  const turno = db
    .select({
      farmacia: schema.farmacias,
      inicioUtc: schema.turnos.inicioUtc,
      finUtc: schema.turnos.finUtc,
    })
    .from(schema.turnos)
    .innerJoin(schema.farmacias, eq(schema.turnos.farmaciaId, schema.farmacias.id))
    .where(eq(schema.turnos.id, turnoId))
    .get();

  // Notificar (no await para no bloquear respuesta)
  if (turno) {
    notificarReporte({
      farmacia: turno.farmacia.nombre,
      turno: `${turno.inicioUtc} → ${turno.finUtc}`,
      motivo,
      contacto,
      ip,
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
