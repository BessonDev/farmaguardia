import type { APIRoute } from 'astro';
import { db } from '../../db';
import { reportes } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { farmaciaId, mensaje } = await request.json();

    if (!farmaciaId || !mensaje) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: farmaciaId y mensaje' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert the report
    await db.insert(reportes).values({
      farmaciaId: Number(farmaciaId),
      mensaje: mensaje.trim(),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error al guardar el reporte:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};