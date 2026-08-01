import type { APIRoute } from 'astro';
import { db } from '../../db';
import { farmacias, reportes } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { sendReportToTelegram } from '../../utils/telegram';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { farmacia_id, turno_id, tipo, detalle } = body;

    // Validación básica
    if (!['cerrada', 'datos_incorrectos', 'otro'].includes(tipo)) {
      return new Response(JSON.stringify({ ok: false, error: 'Tipo de reporte inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.insert(reportes).values({
      farmaciaId: farmacia_id ? Number(farmacia_id) : null,
      turnoId: turno_id ? Number(turno_id) : null,
      tipo,
      detalle: detalle || null,
    });

    // Enviar a Telegram si hay farmacia asociada
    if (farmacia_id) {
      try {
        const farm = await db.select().from(farmacias).where(eq(farmacias.id, Number(farmacia_id))).limit(1);
        if (farm.length > 0) {
          await sendReportToTelegram({
            farmaciaNombre: farm[0].nombre,
            farmaciaDireccion: farm[0].direccion,
            tipo,
            detalle: detalle || '',
            fecha: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error('Error enviando a Telegram:', e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error procesando el reporte' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};