# 🏥 FarmaGuardia

**Portal web de farmacias de turno** — Puerto Ayacucho, Estado Amazonas, Venezuela.

Aplicación SSR moderna que muestra qué farmacia está de turno en tiempo real, con panel admin completo para gestión de turnos, plantillas de rotación, overrides de emergencia e importación por CSV/Excel.

---

## ✨ Funcionalidades

| | |
|---|---|
| ✅ | **Landing pública** con badge animado, mapa OSM embebido, próximos turnos en calendario |
| ✅ | **Panel admin** con dashboard, CRUD de farmacias/turnos, historial paginado |
| ✅ | **ChartBars** CSS-only — turnos por farmacia en últimos 30 días, cero dependencias |
| ✅ | **Importación CSV/Excel** con preview y validación antes de insertar |
| ✅ | **Plantillas de rotación** con slots configurables para generar turnos masivamente |
| ✅ | **Overrides de emergencia** con vigencia por rango de fechas |
| ✅ | **Autenticación segura** — argon2id, cookie firmada HMAC-SHA256, CSRF, rate limit |
| ✅ | **Cambio de contraseña** desde el propio panel admin |
| ✅ | **Notificaciones Telegram** cuando alguien reporta una farmacia |
| ✅ | **Modo oscuro/claro** con persistencia en localStorage y sin flash |
| ✅ | **PWA** — manifest.json + service worker offline básico |
| ✅ | **Responsive** — sidebar con hamburguesa, animaciones adaptativas |
| ✅ | **Zona horaria** — todo en UTC, conversión a America/Caracas solo en presentación |
| ✅ | **Rate limiting** por IP en login (5/15min) y reportes públicos (3/hora) |

---

## 🧰 Stack

| Capa | Tecnología |
|---|---|
| **Framework** | [Astro 5](https://astro.build) — SSR con [Node adapter (standalone)](https://docs.astro.build/en/guides/integrations-guide/node/) |
| **Estilos** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Base de datos** | [SQLite](https://sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) |
| **Autenticación** | [@node-rs/argon2](https://github.com/napi-rs/node-rs/tree/master/packages/argon2) + cookie firmada |
| **CSV** | [csv-parse](https://adaltas.github.io/csv/parse/) |
| **Excel** | [SheetJS (xlsx)](https://sheetjs.com) |
| **Tests** | [Vitest](https://vitest.dev) |

---

## 🚀 Inicio rápido

```bash
# 1. Clonar e instalar
npm install

# 2. Variables de entorno
cp .env.example .env
# Editar SESSION_SECRET con un string aleatorio

# 3. Inicializar base de datos
npm run db:migrate
npm run db:seed

# 4. Dev server
npm run dev
```

El seed crea un usuario admin por defecto: `admin` / `admin`.

> **⚠️ Importante:** Cambiá la contraseña ni bien entres desde _Admin → Cambiar contraseña_.

---

## 🔐 Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | ✅ | Ruta al archivo `.db` (ej: `file:local.db`) |
| `SESSION_SECRET` | ✅ | String aleatorio para firmar cookies de sesión |
| `TZ=UTC` | ✅ | El servidor DEBE correr en UTC |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token del bot para notificaciones de reportes |
| `TELEGRAM_CHAT_ID` | ❌ | Chat ID donde recibir las notificaciones |
| `HOST` | ❌ | Host para producción (default: `0.0.0.0`) |
| `PORT` | ❌ | Puerto para producción (default: `4321`) |

---

## 📋 Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor dev en `localhost:4321` |
| `npm run build` | Build de producción en `dist/` |
| `npm run start` | Iniciar server de producción |
| `npm test` | Ejecutar tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generar migración desde schema |
| `npm run db:migrate` | Aplicar migraciones pendientes |
| `npm run db:seed` | Poblar DB con datos iniciales |

---

## 📁 Estructura del proyecto

```
src/
├── components/        # Componentes reutilizables (CardFarmacia, ChartBars, ThemeToggle...)
├── layouts/           # Layout público (Layout.astro) y admin (LayoutAdmin.astro)
├── pages/             # Rutas SSR
│   ├── index.astro    # Landing pública
│   └── admin/         # Panel de administración
│       ├── index.astro
│       ├── login.astro / logout.astro
│       ├── cambiar-password.astro
│       ├── farmacias/
│       ├── turnos/
│       ├── plantillas/
│       ├── overrides/
│       ├── reportes/
│       └── api/       # Endpoints POST
├── lib/               # Lógica de negocio
│   ├── auth.ts        # Argon2, sesión, CSRF
│   ├── tz.ts          # Zona horaria America/Caracas
│   ├── turno-actual.ts
│   ├── rate-limit.ts
│   ├── audit.ts
│   └── notificar.ts   # Telegram
├── db/
│   ├── client.ts      # Conexión + schema export
│   ├── schema.ts      # 9 tablas (Drizzle)
│   ├── seed.ts        # 12 farmacias reales + admin
│   └── migrations/    # Migraciones SQL
├── middleware.ts       # Protección de rutas /admin/*
├── styles/
│   └── global.css     # Tailwind v4 + Inter + animaciones
└── env.d.ts
```

---

## 🌐 API endpoints públicos

| Ruta | Método | Descripción | Rate limit |
|---|---|---|---|
| `/` | GET | Landing pública con farmacia activa | — |
| `/admin/api/reportar.ts` | POST | Reportar farmacia cerrada | 3/hora por IP |

---

## 🧪 Tests

```bash
npm test        # Todos los tests
npm run vitest  # Watch mode
```

---

## 📄 Licencia

MIT
