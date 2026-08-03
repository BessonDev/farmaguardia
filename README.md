<p align="center">
  <img src="public/favicon.svg" alt="FarmaGuardia" width="110" height="110">
</p>

<h1 align="center">💊 FarmaGuardia</h1>

<p align="center">
  ¿Qué farmacia está de turno hoy en Puerto Ayacucho? <b>Lo sabes en segundos.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Astro-7.1.6-FF5D01?logo=astro&logoColor=white" alt="Astro">
  <img src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/Drizzle-ORM-7C3AED?logo=drizzle&logoColor=white" alt="Drizzle">
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Node-%3E%3D22-5FA04E?logo=nodedotjs&logoColor=white" alt="Node">
  <img src="https://img.shields.io/badge/PWA-Offline%20ready-4285F4" alt="PWA">
  <img src="https://img.shields.io/badge/License-MIT-4BA84C" alt="License">
</p>

---

## 🧐 ¿Qué es?

**FarmaGuardia** es un sistema web para la comunidad de **Puerto Ayacucho, Estado Amazonas (Venezuela)** que resuelve una necesidad real: saber **qué farmacia está de turno ahora mismo**, sin llamar a todas.

- 🌐 **Landing pública**: turno activo, mapa OSM con la farmacia, teléfono y WhatsApp.
- 🤖 **Bot de Telegram**: consulta `/turno` y `/farmacias` desde el chat del bot, con webhook HTTPS + secret token.
- 📢 **Reportes comunitarios**: si la farmacia está cerrada o los datos son incorrectos, cualquiera lo reporta y otros lo confirman (dedupe por huella local + IP).
- 🛠️ **Panel admin**: CRUD de farmacias y turnos, generador de rotaciones (secuencial/simultáneo), override de emergencia, importación CSV/Excel, historial paginado y analytics.
- 📱 **PWA**: instalable y con modo offline (Service Worker + manifest) y aviso "Datos de HH:MM".

---

## ✨ Características

| | |
|---|---|
| 🗓️ **Turno en vivo** | Landing SSR que muestra el turno vigente al instante |
| 🗺️ **Mapa OpenStreetMap** | Ubicación exacta de la farmacia de turno (iframe por card) |
| 🤖 **Bot Telegram** | `/turno`, `/farmacias`, `/ayuda` con webhook + secret token |
| 📥 **Import CSV/Excel** | Carga masiva con plantillas descargables, vista previa antes de importar |
| 🔁 **Rotación automática** | Generación masiva de turnos secuencial o simultáneo con validación de solapamientos |
| ⚡ **Override de emergencia** | Sustituir la farmacia de turno al instante desde el panel |
| 🚨 **Reportes multi-usuario** | Reportar y confirmar con dedupe por huella + IP |
| 📊 **Analytics** | Visitas, reportes y su evolución en el panel |
| 📱 **PWA offline** | Service Worker con aviso de datos cacheados |
| 🔒 **Auth simple** | Sesión con cookie httpOnly + SameSite=Lax + Secure (prod) |
| 📦 **Docker listo** | Multi-stage, migraciones automáticas al arrancar |
| 🕐 **Zona Caracas (UTC-4)** | Manejo de fechas correcto en la rotación |

---

## 🚀 Inicio rápido

```sh
# 1. Instalar dependencias
npm install

# 2. Crear tu .env a partir del ejemplo
cp .env.example .env

# 3. Cargar datos de prueba
npm run db:migrate && npm run db:seed

# 4. Levantar en desarrollo
npm run dev          # → http://localhost:4321
```

El admin vive en `http://localhost:4321/admin` con la contraseña de `ADMIN_PASSWORD`.

---

## 🔑 Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ Sí | Contraseña del panel de administración |
| `SITE_URL` | ✅ Sí | URL pública del sitio (ej: `https://farmaguardia.tudominio.com`) |
| `TELEGRAM_BOT_TOKEN` | ⬜ No | Token del bot (reportes + bot consultable) |
| `TELEGRAM_CHAT_ID` | ⬜ No | Chat/grupo donde llegan los reportes y el test del bot |
| `TELEGRAM_WEBHOOK_SECRET` | ⬜ No | Secret para validar updates del webhook del bot |
| `FINGERPRINT_SECRET` | ⬜ No | Secret HMAC para hashear IPs en reportes (distinto en prod) |
| `DB_PATH` | ⬜ No | Ruta del archivo `.db` (default: `./farmaguardia.db`) |
| `PORT` / `HOST` | ⬜ No | Puerto/host del server standalone (default: `8080` / `0.0.0.0`) |

> ⚠️ **Env vars y build**: Astro hornea `import.meta.env` en build time. Para que el deploy lea los valores correctos en runtime, el código prioriza `process.env` (funciones `getAdminPassword()` y `getEnv()`). En Dokploy las variables deben estar en **Environment** (runtime), no solo en la fase de build.

### Bot de Telegram (opcional)

El bot responde mensajes entrantes vía webhook. Configurá el webhook apuntando a tu dominio:

```sh
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... SITE_URL=https://farmaguardia.tudominio.com npm run bot:set-webhook
```

- El webhook apunta a `POST {SITE_URL}/api/telegram/webhook`. Requiere HTTPS público.
- **El `secret_token` debe coincidir en DOS lados**: la env `TELEGRAM_WEBHOOK_SECRET` (que valida el endpoint) y el campo `secret_token` del `setWebhook` (lo que Telegram manda en el header `x-telegram-bot-api-secret-token`).
- Si configurás el secret pero no lo pasás en el `setWebhook`, el bot devuelve `401 Unauthorized` y no responde.
- Comandos: `/turno`, `/farmacias`, `/ayuda`, `/start`.

Verificar el estado del webhook:

```sh
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Debe mostrar la `url` configurada y `pending_update_count: 0`.

---

## 📦 Despliegue

### Docker (Dokploy / VPS) — recomendado

```sh
docker build -t farmaguardia .
docker run -d \
  -p 8080:8080 \
  -e ADMIN_PASSWORD=... \
  -e SITE_URL=https://farmaguardia.tudominio.com \
  -e DB_PATH=/data/farmaguardia.db \
  -v farmaguardia-data:/data \
  farmaguardia
```

- ✅ **Migraciones automáticas** al arrancar.
- ⚠️ **Volumen `/data` obligatorio**: la base SQLite vive ahí; sin volumen, los datos se pierden en cada redeploy.
- 🔒 Para producción usa **HTTPS** (Dokploy genera certificados Let's Encrypt).

### Panel de administración

`/admin` da acceso a:

- 🏥 **Farmacias**: crear, editar, activar/desactivar, eliminar.
- 🗓️ **Turnos**: crear, editar, eliminar y **generar rotaciones** (secuencial o simultáneo) con validación de solapamientos.
- ⚡ **Override de emergencia**: sustituir la farmacia de turno actual por un respaldo al instante.
- 📥 **Importar CSV/Excel**: carga masiva de farmacias o cronogramas con plantilla descargable, vista previa en el modal, botón para limpiar la selección y opción de sobrescribir.
- 📢 **Feedback en modales**: los reportes de importación y acciones se muestran en un modal de confirmación/error en vez de alert del navegador.
- 🕘 **Historial**: turnos pasados y futuros paginado con filtros.
- 📊 **Analytics**: visitas y reportes del día/mes.
- 🤖 **Test de Telegram**: botón para enviar un mensaje de prueba al chat del admin.

---

## 🗂️ Estructura del proyecto

```
src/
├── pages/
│   ├── index.astro                # Landing pública (SSR)
│   ├── api/                       # Endpoints (turno.json, reportes, visita, telegram/webhook)
│   └── admin/                     # Panel admin (login, dashboard, farmacias, turnos, rotacion, historial)
├── components/                    # Cards, sidebar, modales, listas
├── layouts/                       # Layout principal + modal de reporte
├── actions/                       # Astro Actions (auth, CRUDs, rotación, import, test Telegram)
├── db/                            # Conexión + schema Drizzle
├── utils/                         # time, telegram, csv, fingerprint
└── middleware.ts                  # Auth + sesión + actions
```

---

## 🛠️ Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Dev server en `localhost:4321` |
| `npm run build` | Build de producción a `./dist/` |
| `npm run preview` | Preview del build |
| `npm run db:generate` | Generar migración Drizzle |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:seed` | Seed de prueba (12 farmacias + turnos) |
| `npm run db:studio` | Explorar la base con Drizzle Studio |
| `npm run bot:set-webhook` | Configurar webhook del bot de Telegram |

---

## 🐛 Solución de problemas

### Login no hace nada / errores sin mensaje
Las Astro Actions que devuelven `{ error }` como data no muestran nada en la UI. Siempre lanzar `throw new ActionError({ code, message })` para que `result?.error` funcione.

### `ADMIN_PASSWORD` horneada en build / login rechazado en prod
Si Dokploy no inyecta las env vars en la fase de build, `import.meta.env.ADMIN_PASSWORD` queda como `undefined` en el bundle. El código prioriza `process.env` en runtime: verificá que la variable esté en **Environment** (runtime) y no solo como build arg.

### Webhook de Telegram devuelve `401 Unauthorized`
El `secret_token` está configurado en el endpoint pero no en el `setWebhook` (o viceversa). Ambos deben coincidir. Re-ejecutá `npm run bot:set-webhook` con el mismo `TELEGRAM_WEBHOOK_SECRET`.

### Canonical / OpenGraph apuntan a `localhost`
`astro.config.mjs` usa `site: process.env.SITE_URL || 'http://localhost:4321'`. Si el build corre sin `SITE_URL`, los meta `canonical`/`og:url` quedan con `localhost`. Asegurate de que `SITE_URL` esté disponible **durante el build** (env de build), no solo en runtime.

### Favicon/PWA viejo en el teléfono
El Service Worker cachea los assets. Si seguís viendo el favicon viejo de Astro tras un deploy, hacé hard refresh (Ctrl+Shift+R) o reinstalá la PWA (quitar de apps y volver a instalar).

### Cambios de env no se reflejan
En dev, reiniciá el server (`astro dev stop` + `astro dev --background`) para recargar `.env`. En prod, la env debe estar en Dokploy y requiere redeploy.

---

## 🗄️ Backup de la base

```sh
sqlite3 /ruta/farmaguardia.db ".backup /ruta/backup/farmaguardia-$(date +%F).db"
```

Programa una tarea cron diaria para automatizarlo.

---

## ❤️ Hecho para la comunidad

Construido con **Astro 7**, **Drizzle ORM** y **SQLite**, pensado para correr simple en un VPS. Si querés contribuir o reportar un problema, abrí un issue. 🚀
