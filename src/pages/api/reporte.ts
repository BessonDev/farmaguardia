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
    const [inserted] = await db.insert(reportes).values({
      farmaciaId: Number(farmaciaId),
      mensaje: mensaje.trim(),
    }).returning();

    // Optionally send a Telegram notification if credentials are set
    const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      try {
        const telegramMessage = `🚨 Nuevo reporte en FarmaGuardia\n\nFarmacia ID: ${farmaciaId}\nMensaje: ${mensaje.trim()}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage,
          }),
        });
      } catch (telegramError) {
        // Don't fail the request if Telegram fails
        console.error('Error sending Telegram notification:', telegramError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id }),
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