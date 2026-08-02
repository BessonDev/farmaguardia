/**
 * Configura el webhook del bot de Telegram.
 *
 * Uso:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... SITE_URL=https://... npm run bot:set-webhook
 *
 * SITE_URL debe apuntar a la raíz pública (sin barra final).
 * Si TELEGRAM_WEBHOOK_SECRET está definido, se envía a Telegram como
 * secret_token y el endpoint /api/telegram/webhook validará el header
 * x-telegram-bot-api-secret-token contra el mismo valor.
 *
 * Resultado: { "ok": true, "result": true, "description": "Webhook was set" }
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = process.env.SITE_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  console.error('❌ Falta TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!siteUrl) {
  console.error('❌ Falta SITE_URL (ej: https://farmaguardia.tudominio.com)');
  process.exit(1);
}

const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/telegram/webhook`;

const body: Record<string, unknown> = {
  url: webhookUrl,
  allowed_updates: ['message'],
};
if (webhookSecret) {
  body.secret_token = webhookSecret;
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const data = await res.json();
if (data.ok) {
  console.log(`✅ Webhook configurado: ${webhookUrl}`);
  if (webhookSecret) {
    console.log('🔐 secret_token habilitado para el webhook');
  }
} else {
  console.error(`❌ Error configurando webhook: ${data.description ?? 'desconocido'}`);
  process.exit(1);
}
