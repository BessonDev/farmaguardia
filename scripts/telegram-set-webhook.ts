/**
 * Configura el webhook del bot de Telegram.
 *
 * Uso:
 *   TELEGRAM_BOT_TOKEN=... SITE_URL=https://... npm run bot:set-webhook
 *
 * SITE_URL debe apuntar a la raíz pública (sin barra final).
 * Resultado: { "ok": true, "result": true, "description": "Webhook was set" }
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = process.env.SITE_URL;

if (!token) {
  console.error('❌ Falta TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!siteUrl) {
  console.error('❌ Falta SITE_URL (ej: https://farmaguardia.vercel.app)');
  process.exit(1);
}

const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/telegram/webhook`;

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: webhookUrl,
    allowed_updates: ['message'],
  }),
});

const data = await res.json();
if (data.ok) {
  console.log(`✅ Webhook configurado: ${webhookUrl}`);
} else {
  console.error(`❌ Error configurando webhook: ${data.description ?? 'desconocido'}`);
  process.exit(1);
}
