import { createHash } from 'node:crypto';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function notificarReporte(datos: {
  farmacia: string;
  turno: string;
  motivo: string;
  contacto: string | null;
  ip: string;
}): Promise<void> {
  const mensaje = [
    `🚨 *Reporte de farmacia cerrada*`,
    ``,
    `🏪 *Farmacia:* ${datos.farmacia}`,
    `📅 *Turno:* ${datos.turno}`,
    `💬 *Motivo:* ${datos.motivo}`,
    datos.contacto ? `📞 *Contacto:* ${datos.contacto}` : null,
    `🌐 *IP:* ${datos.ip}`,
  ]
    .filter(Boolean)
    .join('\n');

  console.log('[notificar] Reporte generado:\n', mensaje);

  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[notificar] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. Reporte solo en log.');
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: mensaje,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[notificar] Error al enviar a Telegram:', body);
    } else {
      console.log('[notificar] Notificación enviada a Telegram.');
    }
  } catch (err) {
    console.error('[notificar] Error de red al notificar Telegram:', err);
  }
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}
