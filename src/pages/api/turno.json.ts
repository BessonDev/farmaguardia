import type { APIRoute } from 'astro';
import { db } from '../../db';
import { farmacias, turnos } from '../../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { toUtcISO, nowUtc } from '../../utils/time';

export const GET: APIRoute = async () => {
  const ahoraISO = toUtcISO(nowUtc());

  const turnoActual = await db
    .select({
      id: turnos.id,
      inicio: turnos.inicio,
      fin: turnos.fin,
      farmacia: {
        id: farmacias.id,
        nombre: farmacias.nombre,
        direccion: farmacias.direccion,
        telefono: farmacias.telefono,
        whatsapp: farmacias.whatsapp,
        latitud: farmacias.latitud,
        longitud: farmacias.longitud,
        sector: farmacias.sector,
        delivery: farmacias.delivery,
      },
    })
    .from(turnos)
    .innerJoin(farmacias, eq(turnos.farmaciaId, farmacias.id))
    .where(and(
      lte(turnos.inicio, ahoraISO),
      gte(turnos.fin, ahoraISO),
      eq(farmacias.activa, 1)
    ))
    .limit(1);

  return new Response(JSON.stringify({
    ok: true,
    generadoEn: ahoraISO,
    turno: turnoActual[0] ?? null,
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};