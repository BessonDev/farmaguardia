# FarmaGuardia

Sistema web para consultar qué farmacia está de turno en Puerto Ayacucho, Estado Amazonas (Venezuela). Incluye panel de administración, bot de Telegram, reportes comunitarios y analytics simples.

## Stack

- **Astro 7** (SSR) con adapter `@astrojs/node` (standalone)
- **Tailwind CSS**
- **Drizzle ORM** + **better-sqlite3** (SQLite)
- PWA básica: manifest + Service Worker offline

## Requisitos

- Node.js >= 22.12
- npm

## Instalación

```sh
npm install
cp .env.example .env   # luego completar los valores
```

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | Sí | Contraseña del panel de administración |
| `SITE_URL` | Sí | URL pública del sitio (ej: `https://farmaguardia.tudominio.com`) |
| `TELEGRAM_BOT_TOKEN` | No | Token del bot (reportes + bot consultable) |
| `TELEGRAM_CHAT_ID` | No | Chat/grupo donde llegan los reportes |
| `TELEGRAM_WEBHOOK_SECRET` | No | Secret para validar los updates del webhook del bot |
| `FINGERPRINT_SECRET` | No | Secret HMAC para hashear IPs en reportes (usar valor distinto en prod) |
| `DB_PATH` | No | Ruta del archivo `.db` (default: `./farmaguardia.db`) |
| `PORT` / `HOST` | No | Puerto/host del servidor standalone (default: 8080 / 0.0.0.0) |

## Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Dev server en `localhost:4321` |
| `npm run build` | Build de producción a `./dist/` |
| `npm run preview` | Preview del build |
| `npm run db:generate` | Generar migración Drizzle |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:seed` | Seed de prueba (12 farmacias + turnos) |
| `npm run bot:set-webhook` | Configurar webhook del bot de Telegram |

### Webhook del bot

```sh
TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... SITE_URL=https://farmaguardia.tudominio.com npm run bot:set-webhook
```

## Despliegue

### Docker (Dokploy / VPS)

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

El contenedor aplica las migraciones automáticamente al arrancar. **Importante:** montar un volumen persistente en `/data` porque la base SQLite vive ahí; sin volumen, los datos se pierden en cada redeploy.

### Estructura del proyecto

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
└── utils/                         # time, telegram, fingerprint
```

## Backup de la base

```sh
sqlite3 /ruta/farmaguardia.db ".backup /ruta/backup/farmaguardia-$(date +%F).db"
```

Programar con cron (diario).
