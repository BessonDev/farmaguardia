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

- 🌐 **Landing pública**: turno activo, mapa con la farmacia, teléfono y WhatsApp.
- 🔔 **Bot de Telegram**: consulta el turno desde el chat del bot.
- 📢 **Reportes comunitarios**: si la farmacia está cerrada o los datos son incorrectos, cualquiera lo reporta (con deduplicación por huella).
- 🛠️ **Panel admin**: CRUD de farmacias y turnos, generador de rotaciones automático, importación CSV y analytics de visitas/reportes.
- 📱 **PWA**: instalable y con modo offline (Service Worker + manifest).

---

## ✨ Características

| | |
|---|---|
| 🗓️ **Turno en vivo** | Landing SSR que muestra el turno vigente al instante |
| 🗺️ **Mapa OpenStreetMap** | Ubicación exacta de la farmacia de turno |
| 🤖 **Bot Telegram** | `/turno` desde cualquier chat |
| 📊 **Analytics** | Visitas, reportes y su evolución en el panel |
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
| `TELEGRAM_CHAT_ID` | ⬜ No | Chat/grupo donde llegan los reportes |
| `TELEGRAM_WEBHOOK_SECRET` | ⬜ No | Secret para validar updates del webhook del bot |
| `FINGERPRINT_SECRET` | ⬜ No | Secret HMAC para hashear IPs en reportes (distinto en prod) |
| `DB_PATH` | ⬜ No | Ruta del archivo `.db` (default: `./farmaguardia.db`) |
| `PORT` / `HOST` | ⬜ No | Puerto/host del server standalone (default: `8080` / `0.0.0.0`) |

### Bot de Telegram (opcional)

```sh
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... SITE_URL=https://farmaguardia.tudominio.com npm run bot:set-webhook
```

> El webhook del bot apunta a `POST {SITE_URL}/api/telegram/webhook`. Requiere HTTPS público (ej: con Dokploy/Let's Encrypt).

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
- 📥 **Importar CSV**: carga masiva con plantilla descargable y opción de sobrescribir.
- 📊 **Analytics**: visitas y reportes del día/mes.

---

## 🗂️ Estructura del proyecto

```
src/
├── pages/
│   ├── index.astro                # Landing pública (SSR)
│   ├── api/                       # Endpoints (turno.json, reportes, visita, webhook)
│   └── admin/                     # Panel admin (login, dashboard, CRUDs)
├── components/                    # Cards, sidebar, listas
├── layouts/                       # Layout principal + modal de reporte
├── actions/                       # Astro Actions (auth, CRUDs, rotación, import)
├── db/                            # Conexión + schema Drizzle
├── utils/                         # time, telegram, fingerprint
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

## 🗄️ Backup de la base

```sh
sqlite3 /ruta/farmaguardia.db ".backup /ruta/backup/farmaguardia-$(date +%F).db"
```

Programa una tarea cron diaria para automatizarlo.

---

## ❤️ Hecho para la comunidad

Construido con **Astro 7**, **Drizzle ORM** y **SQLite**, pensado para correr simple en un VPS. Si querés contribuir o reportar un problema, abrí un issue. 🚀
