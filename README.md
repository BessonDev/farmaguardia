# FarmaGuardia

Portal web de farmacias de turno en Puerto Ayacucho, Estado Amazonas, Venezuela.

Stack: Astro 5 (SSR) · Node adapter · better-sqlite3 · Drizzle ORM · Tailwind CSS v4.

## Setup local

```bash
npm install
cp .env.example .env
# Generar password hash y editar .env:
node -e "import('@node-rs/argon2').then(a=>a.hash('tu_password',{memoryCost:19456,timeCost:2,outputLen:32,parallelism:1}).then(h=>console.log(h)))"

# Crear DB y cargar datos
npm run db:migrate
npm run db:seed

# Dev
npm run dev
```

## Variables de entorno

Ver `.env.example`. Críticas:
- `ADMIN_PASSWORD_HASH`: argon2 hash del password admin.
- `SESSION_SECRET`: string random para firmar cookies.
- `DATABASE_URL`: ruta al `.db`.
- `TZ=UTC`: el server DEBE correr en UTC. Toda la lógica de fechas asume UTC en DB.

## Estructura

```
src/
├── components/   # Componentes Astro
├── layouts/      # Layouts públicos y admin
├── pages/        # Rutas (incluye /admin/* y /api/*)
├── lib/          # Lógica de negocio (queries, auth, tz)
└── db/           # Schema, cliente, migraciones, seed
```

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor dev en :4321 |
| `npm run build` | Build para producción |
| `npm start` | Levanta el server de producción |
| `npm run db:generate` | Genera migración SQL desde `schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Puebla la DB con datos de prueba |
| `npm test` | Corre los tests |

## Fases de desarrollo

- [x] **Fase 0** — Setup + schema + seed
- [ ] **Fase 1** — Landing pública
- [ ] **Fase 2** — Panel admin
- [ ] **Fase 2.5** — Plantillas de rotación
- [ ] **Fase 3** — Importador CSV
- [ ] **Fase 4** — Reportes + alertas Telegram
- [ ] **Fase 5** — Deploy a Dokploy