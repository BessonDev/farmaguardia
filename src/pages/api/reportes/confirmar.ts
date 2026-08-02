import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { reportes, reporteConfirmaciones } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { hashIp, getClientIp, readJsonBody } from '../../../utils/fingerprint';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readJsonBody(request);
    if (!body) {
      return json({ ok: false, error: 'Body inválido' }, 400);
    }

    const { reporte_id, huella_local } = body as {
      reporte_id?: number | null;
      huella_local?: string;
    };

    if (!reporte_id) {
      return json({ ok: false, error: 'reporte_id requerido' }, 400);
    }
    if (!huella_local) {
      return json({ ok: false, error: 'Huella local requerida' }, 400);
    }

    const reporteId = Number(reporte_id);
    const ipHash = hashIp(getClientIp(request));

    const reporte = await db.select().from(reportes).where(eq(reportes.id, reporteId)).limit(1);
    if (reporte.length === 0) {
      return json({ ok: false, error: 'Reporte no encontrado' }, 404);
    }

    // Evitar duplicado: misma huella no puede confirmar dos veces
    const yaConfirmo = await db
      .select({ id: reporteConfirmaciones.id })
      .from(reporteConfirmaciones)
      .where(and(
        eq(reporteConfirmaciones.reporteId, reporteId),
        eq(reporteConfirmaciones.huellaLocal, huella_local)
      ))
      .limit(1);

    if (yaConfirmo.length > 0) {
      return json({ ok: true, confirmaciones: reporte[0].confirmaciones, yaConfirmado: true });
    }

    await db.insert(reporteConfirmaciones).values({
      reporteId,
      huellaLocal: huella_local,
      ipHash,
    });
    await db.update(reportes).set({ confirmaciones: reporte[0].confirmaciones + 1 })
      .where(eq(reportes.id, reporteId));

    return json({ ok: true, confirmaciones: reporte[0].confirmaciones + 1, yaConfirmado: false });
  } catch (e) {
    console.error('Error confirmando reporte:', e);
    return json({ ok: false, error: 'Error confirmando el reporte' }, 500);
  }
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
