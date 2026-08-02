/**
 * Cliente simple para Telegram Bot API
 * Configuración vía variables de entorno:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID (o TELEGRAM_ADMIN_CHAT_ID)
 * - TELEGRAM_WEBHOOK_SECRET (secret para validar updates del webhook)
 */

import { db } from '../db';
import { farmacias, turnos } from '../db/schema';
import { eq, and, lte, gt } from 'drizzle-orm';
import { toUtcISO, nowUtc, formatCaracasDateTime, formatCaracasFullDate } from './time';

/**
 * Lee una variable de entorno priorizando process.env (runtime).
 * import.meta.env (Vite/Astro) se hornea en build time y no existe al correr
 * scripts con tsx, por eso process.env va primero (igual que getAdminPassword).
 */
function getEnv(name: string): string | undefined {
  const meta = (import.meta as { env?: Record<string, string | undefined> }).env;
  return process.env[name] ?? meta?.[name];
}

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  reply_to_message_id?: number;
}

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

const BOT_TOKEN = getEnv('TELEGRAM_BOT_TOKEN');
const CHAT_ID = getEnv('TELEGRAM_CHAT_ID') || getEnv('TELEGRAM_ADMIN_CHAT_ID');

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

export function getTelegramWebhookSecret(): string | undefined {
  return getEnv('TELEGRAM_WEBHOOK_SECRET');
}

// ─── Bot consultable ───

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string; first_name?: string; username?: string };
    from?: { id: number; first_name?: string; username?: string };
  };
}

export interface TurnoActivo {
  id: number;
  inicio: string;
  fin: string;
  farmacia: {
    id: number;
    nombre: string;
    direccion: string;
    telefono?: string;
    whatsapp?: string;
    sector?: string;
  };
}

/**
 * Consulta los turnos activos ahora (inicio <= ahora < fin estricto)
 * Compartida entre landing, admin y bot.
 */
export async function getTurnosActivos(): Promise<TurnoActivo[]> {
  const ahoraISO = toUtcISO(nowUtc());
  return db
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
        sector: farmacias.sector,
      },
    })
    .from(turnos)
    .innerJoin(farmacias, eq(turnos.farmaciaId, farmacias.id))
    .where(and(
      lte(turnos.inicio, ahoraISO),
      gt(turnos.fin, ahoraISO),
      eq(farmacias.activa, 1)
    ))
    .orderBy(turnos.inicio);
}

async function getFarmaciasActivas() {
  return db
    .select({
      id: farmacias.id,
      nombre: farmacias.nombre,
      direccion: farmacias.direccion,
      telefono: farmacias.telefono,
      whatsapp: farmacias.whatsapp,
      sector: farmacias.sector,
      delivery: farmacias.delivery,
    })
    .from(farmacias)
    .where(eq(farmacias.activa, 1))
    .orderBy(farmacias.nombre);
}

function formatearTurnos(turnos: TurnoActivo[]): string {
  if (turnos.length === 0) {
    return '🚫 No hay farmacia de turno en este momento.\n\nIntenta más tarde o consulta /farmacias para ver las opciones.';
  }

  const lineas = turnos.map((t, i) => {
    const f = t.farmacia;
    const contacto = [
      f.telefono ? `📞 ${f.telefono}` : null,
      f.whatsapp ? `💬 ${f.whatsapp}` : null,
    ].filter(Boolean).join(' · ');
    const sector = f.sector && f.sector !== 'Centro' ? ` (${f.sector})` : '';

    return [
      `🏪 <b>${f.nombre}</b>${sector}`,
      `📍 ${f.direccion}`,
      contacto ? contacto : '',
      `⏰ Hasta: ${formatCaracasDateTime(new Date(t.fin))}`,
    ].filter(Boolean).join('\n');
  });

  return turnos.length === 1
    ? `✅ Farmacia de turno ahora:\n\n${lineas[0]}`
    : `✅ Hay ${turnos.length} farmacias de turno ahora:\n\n${lineas.join('\n\n')}`;
}

function formatearFarmacias(lista: { nombre: string; sector: string | null; telefono: string | null }[]): string {
  if (lista.length === 0) {
    return 'No hay farmacias registradas.';
  }
  const lineas = lista.map((f) => {
    const sector = f.sector && f.sector !== 'Centro' ? ` (${f.sector})` : '';
    const telefono = f.telefono ? ` 📞 ${f.telefono}` : '';
    return `• ${f.nombre}${sector}${telefono}`;
  });
  return `🏪 <b>Farmacias de Puerto Ayacucho (${lista.length}):</b>\n\n${lineas.join('\n')}`;
}

/**
 * Procesa una actualización del bot (mensaje entrante) y responde.
 * Retorna true si respondió algo, false si el update no requiere respuesta.
 */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<boolean> {
  const message = update.message;
  if (!message?.text) return false;

  const chatId = message.chat.id;
  const text = message.text.trim().toLowerCase();
  const replyTo = message.message_id;

  const responder = (respuesta: string) =>
    sendTelegramMessage({
      chat_id: chatId,
      text: respuesta,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_to_message_id: replyTo,
    });

  const siteUrl = getEnv('SITE_URL') || 'https://farmaguardia.example.com';
  const HELP = [
    '🤖 <b>FarmaGuardia Bot</b>',
    '',
    'Consulta qué farmacia está de turno en Puerto Ayacucho.',
    '',
    'Comandos disponibles:',
    '• /turno — farmacias de turno ahora',
    '• /farmacias — catálogo de farmacias activas',
    '• /ayuda — este mensaje',
    '',
    `👥 Reporta datos incorrectos desde la web: ${siteUrl.replace(/\/$/, '')}`,
  ].join('\n');

  const nombre = message.from?.first_name ? `Hola, ${message.from.first_name}! 👋` : 'Hola! 👋';

  try {
    if (text === '/start') {
      await responder(`${nombre}\n\nSoy el bot de FarmaGuardia. Escribe /turno para ver la farmacia de turno ahora o /ayuda para los comandos.`);
      return true;
    }
    if (text === '/ayuda' || text === '/help' || text === '/h') {
      await responder(HELP);
      return true;
    }
    if (text === '/turno') {
      const activos = await getTurnosActivos();
      await responder(formatearTurnos(activos));
      return true;
    }
    if (text === '/farmacias') {
      const lista = await getFarmaciasActivas();
      await responder(formatearFarmacias(lista));
      return true;
    }
  } catch (error) {
    console.error('❌ Error manejando comando de bot:', error);
    await responder('Ocurrió un error procesando tu solicitud. Intenta de nuevo más tarde. 🙏');
    return true;
  }

  return false;
}
