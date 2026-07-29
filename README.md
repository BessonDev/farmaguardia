# 🏥 FarmaGuardia

**Portal web de farmacias de turno** — Puerto Ayacucho, Estado Amazonas, Venezuela.

SSR moderno que muestra qué farmacia está de turno en tiempo real, con panel admin completo para gestión de turnos, plantillas de rotación, overrides de emergencia, importación CSV/Excel y notificaciones Telegram.

---

## ✨ Funcionalidades

| | |
|---|---|
| 🌐 **Landing pública** | Badge animado "Abierto", mapa OSM embebido, próximos turnos, fallback sin turno, modal de reporte |
| 📊 **Dashboard admin** | Stats rápidas, turno activo, gráfico **ChartBars** (CSS-only, 0 deps) — turnos por farmacia últimos 30 días |
| 🏪 **CRUD Farmacias** | Nombre, dirección, sector, coords GPS, teléfono, WhatsApp, imagen, activo/inactivo |
| 📅 **CRUD Turnos** | Crear/editar/borrar, validación de solapamiento, enlace a Importar / Historial |
| 📥 **Importar CSV/Excel** | Upload → parse → preview → batch insert. Plantilla descargable |
| 📋 **Historial paginado** | Filtros por farmacia + rango fechas, 50/page, JOIN override |
| 🔁 **Plantillas de rotación** | Slots configurables para generar turnos masivos |
| ⚠️ **Overrides de emergencia** | Vigencia por rango de fechas, badge en landing y admin |
| 🔐 **Auth segura** | argon2id + cookie HMAC-SHA256 + CSRF + rate limit IP (5/15min) |
| 🔑 **Cambio de contraseña** | UI en `/admin/cambiar-password` |
| 🤖 **Telegram Bot** | Config page en admin con estado, guía y botón de prueba |
| 🌓 **Modo oscuro/claro** | System preference + localStorage, sin flash |
| 📱 **PWA** | manifest.json + service worker offline básico |
| 🕐 **Zona horaria** | Todo en UTC, conversión a America/Caracas solo en presentación |
| 🚦 **Rate limiting** | Login 5/15min, reportes públicos 3/hora |
| 📱 **Responsive** | Tablas con scroll horizontal, toolbar apilable, sidebar fluida sin overlap |

---

## 🧰 Stack

| Capa | Tecnología |
|---|---|
| **Framework** | [Astro 5](https://astro.build) SSR + [Node adapter standalone](https://docs.astro.build/en/guides/integrations-guide/node/) |
| **Estilos** | [Tailwind CSS v4](https://tailwindcss.com) |
| **BD** | [SQLite](https://sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) |
| **Auth** | [@node-rs/argon2](https://github.com/napi-rs/node-rs/tree/master/packages/argon2) |
| **CSV/Excel** | [csv-parse](https://adaltas.github.io/csv/parse/) + [SheetJS](https://sheetjs.com) |
| **Tests** | [Vitest](https://vitest.dev) |

---

## 🚀 Inicio rápido

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Seed: `admin` / `admin`. **Cambiá la contraseña ni bien entres.**

---

## 🔐 Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | Ruta al `.db` (ej: `file:local.db`) |
| `SESSION_SECRET` | ✅ | String aleatorio para cookies |
| `TZ=UTC` | ✅ | Server DEBE correr en UTC |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token del bot de Telegram |
| `TELEGRAM_CHAT_ID` | ❌ | Chat ID para notificaciones |
| `HOST` | ❌ | Host producción (default: `0.0.0.0`) |
| `PORT` | ❌ | Puerto producción (default: `4321`) |

---

## 📋 Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server en `:4321` |
| `npm run build` | Build producción |
| `npm start` | Iniciar server producción |
| `npm test` | Tests (Vitest) |
| `npm run db:generate` | Generar migración |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:seed` | Poblar DB |

---

## 📁 Estructura

```
src/
├── components/        # CardFarmacia, ChartBars, ThemeToggle, etc.
├── layouts/           # Layout público + LayoutAdmin
├── pages/
│   ├── index.astro    # Landing
│   └── admin/
│       ├── index.astro, login.ts, logout.ts
│       ├── cambiar-password.astro
│       ├── telegram.astro
│       ├── farmacias/, turnos/, plantillas/, overrides/
│       └── api/       # Endpoints POST
├── lib/
│   ├── auth.ts, tz.ts, turno-actual.ts
│   ├── rate-limit.ts, audit.ts, notificar.ts
├── db/
│   ├── client.ts, schema.ts (9 tablas), seed.ts
│   └── migrations/
├── middleware.ts
└── styles/global.css
```

---

## 🗄️ Esquema de BD (9 tablas)

| Tabla | Propósito |
|---|---|
| `usuarios` | Admin (username, password_hash argon2id) |
| `farmacias` | 12 reales con GPS + tel. E.164 |
| `turnos` | Turnos rotativos (inicio/fin UTC) |
| `anuncios_turno` | Overrides con vigencia |
| `plantillas` | Plantillas de rotación |
| `plantilla_slots` | Slots: cada cuántos días, farmacia |
| `reportes` | Reportes públicos |
| `admin_log` | Auditoría de acciones |
| `login_attempts` | Rate limit login |

---

## 🌐 API endpoints públicos

| Ruta | Método | Descripción | Rate limit |
|---|---|---|---|
| `/` | GET | Landing pública | — |
| `/api/reportar` | POST | Reportar farmacia cerrada | 3/hora/IP |

---

## 🧪 Tests

```bash
npm test
```

18 tests: 7 turno-actual + 11 auth.

---

## 🐳 Deploy (Dokploy)

1. Push a GitHub
2. Dokploy → New Project → Docker Compose → apunta al repo
3. Variables de entorno en UI de Dokploy
4. Dominio `farmaguardia.com` + Let's Encrypt SSL

---

## 📄 Licencia

MIT — Libre para usar, modificar y distribuir.
