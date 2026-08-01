/**
 * Cliente simple para Telegram Bot API
 * Configuración vía variables de entorno:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID (o TELEGRAM_ADMIN_CHAT_ID)
 */

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID || import.meta.env.TELEGRAM_ADMIN_CHAT_ID;

function getApiUrl(method: string): string {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

export async function sendTelegramMessage(message: TelegramMessage): Promise<TelegramResponse> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('⚠️ Telegram no configurado: faltan TELEGRAM_BOT_TOKEN y/o TELEGRAM_CHAT_ID');
    return { ok: false, description: 'Telegram no configurado' };
  }

  const payload = {
    ...message,
    chat_id: message.chat_id || CHAT_ID,
  };

  try {
    const response = await fetch(getApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error) {
    console.error('❌ Error enviando mensaje a Telegram:', error);
    return { ok: false, description: String(error) };
  }
}

export async function sendReportToTelegram(report: {
  farmaciaNombre: string;
  farmaciaDireccion: string;
  tipo: string;
  detalle: string;
  fecha: string;
}): Promise<TelegramResponse> {
  const emojiMap: Record<string, string> = {
    cerrada: '🔴',
    datos_incorrectos: '⚠️',
    otro: '📝',
  };
  const emoji = emojiMap[report.tipo] || '📝';

  const text = [
    `${emoji} <b>Nuevo reporte comunitario</b>`,
    '',
    `<b>Farmacia:</b> ${report.farmaciaNombre}`,
    `<b>Dirección:</b> ${report.farmaciaDireccion}`,
    `<b>Tipo:</b> ${report.tipo}`,
    `<b>Detalle:</b> ${report.detalle || '—'}`,
    `<b>Fecha:</b> ${report.fecha}`,
    '',
    '<i>FarmaGuardia - Puerto Ayacucho</i>',
  ].join('\n');

  return sendTelegramMessage({
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

export async function testTelegramConnection(): Promise<TelegramResponse> {
  return sendTelegramMessage({
    text: '✅ <b>Test de conexión FarmaGuardia</b>\n\nBot configurado correctamente.',
    parse_mode: 'HTML',
  });
}

export function isTelegramConfigured(): boolean {
  return !!(BOT_TOKEN && CHAT_ID);
}