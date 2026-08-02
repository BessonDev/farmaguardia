import type { APIRoute } from 'astro';
import { db } from '../../db';
import { farmacias, reportes, reporteConfirmaciones } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { sendReportToTelegram } from '../../utils/telegram';
import { hashIp, getClientIp, readJsonBody } from '../../utils/fingerprint';

const TIPOS_VALIDOS = ['cerrada', 'datos_incorrectos', 'otro'];

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readJsonBody(request);
    if (!body) {
      return json({ ok: false, error: 'Body inválido' }, 400);
    }

    const { farmacia_id, turno_id, tipo, detalle, huella_local } = body as {
      farmacia_id?: number | null;
      turno_id?: number | null;
      tipo?: string;
      detalle?: string;
      huella_local?: string;
    };

    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return json({ ok: false, error: 'Tipo de reporte inválido' }, 400);
    }
    if (!huella_local) {
      return json({ ok: false, error: 'Huella local requerida' }, 400);
    }

    const farmaciaId = farmacia_id ? Number(farmacia_id) : null;
    const turnoId = turno_id ? Number(turno_id) : null;
    const ipHash = hashIp(getClientIp(request));

    // Buscar un reporte existente para la misma farmacia+turno+tipo
    const existente = farmaciaId || turnoId
      ? await db
          .select()
          .from(reportes)
          .where(and(
            turnoId ? eq(reportes.turnoId, turnoId) : eq(reportes.farmaciaId, farmaciaId!),
            eq(reportes.tipo, tipo),
          ))
          .orderBy(reportes.createdAt)
          .limit(1)
      : [];

    if (existente.length > 0) {
      // Reporte ya existe → registrar confirmación si la huella es nueva
      const yaConfirmo = await db
        .select({ id: reporteConfirmaciones.id })
        .from(reporteConfirmaciones)
        .where(and(
          eq(reporteConfirmaciones.reporteId, existente[0].id),
          eq(reporteConfirmaciones.huellaLocal, huella_local)
        ))
        .limit(1);

      if (yaConfirmo.length === 0) {
        await db.insert(reporteConfirmaciones).values({
          reporteId: existente[0].id,
          huellaLocal: huella_local,
          ipHash,
        });
        await db.update(reportes).set({ confirmaciones: existente[0].confirmaciones + 1 })
          .where(eq(reportes.id, existente[0].id));
      }

      return json({ ok: true, confirmado: true, confirmaciones: existente[0].confirmaciones + (yaConfirmo.length === 0 ? 1 : 0) });
    }

    // Crear nuevo reporte
    const nuevo = await db.insert(reportes).values({
      farmaciaId,
      turnoId,
      tipo,
      detalle: detalle || null,
    }).returning({ id: reportes.id });

    const reporteId = nuevo[0].id;

    // Registrar la confirmación del autor
    await db.insert(reporteConfirmaciones).values({
      reporteId,
      huellaLocal: huella_local,
      ipHash,
    });

    // Enviar a Telegram si hay farmacia asociada
    if (farmaciaId) {
      try {
        const farm = await db.select().from(farmacias).where(eq(farmacias.id, farmaciaId)).limit(1);
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

    return json({ ok: true, confirmado: false, confirmaciones: 1, reporteId });
  } catch (e) {
    console.error('Error procesando reporte:', e);
    return json({ ok: false, error: 'Error procesando el reporte' }, 500);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
