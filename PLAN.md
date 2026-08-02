# FarmaGuardia — Plan Unificado

**Proyecto:** FarmaGuardia  
**Ciudad:** Puerto Ayacucho, Estado Amazonas, Venezuela  
**Propósito:** Portal web liviano y accesible para consultar en tiempo real qué farmacia está de turno 24h, con contacto directo y ubicación.

---

## 1. Decisiones Arquitectónicas (Locked)

### Tiempo y Zona Horaria
- **Canónico:** UTC en base de datos, formato ISO 8601 `YYYY-MM-DDTHH:MM:SSZ` (ej. `2026-08-01T12:00:00Z`).
- **Presentación:** America/Caracas (UTC-4 fijo, sin horario de verano desde 2016). Conversión solo en entrada/salida del panel y en la landing.
- **Query de turno actual:** normalizada con `datetime()` para evitar dependencia de formato.
  ```sql
  WHERE datetime(inicio) <= datetime('now') AND datetime(fin) > datetime('now')
  ```
  El `>` estricto en `fin` evita mostrar dos farmacias a las 08:00:00 exactas.
- **Panel:** input `datetime-local` en hora Caracas → al guardar convierte a UTC (sumar 4h).

### Autenticación
- `ADMIN_PASSWORD` en variable de entorno.
- Comparación constant-time: `crypto.timingSafeEqual`.
- Cookie de sesión: `httpOnly`, `SameSite=Lax`, `Secure` en producción.
- **Sin** funcionalidad de cambio de contraseña en el panel (fuera de MVP).

### Stack
- **Framework:** Astro SSR (`output: 'server'`).
- **Estilos:** Tailwind CSS (mobile-first, dark mode automático).
- **Base de Datos:** SQLite + better-sqlite3 + Drizzle ORM (tipado y migraciones).
- **Despliegue:** VPS con Node.js (pm2 o Dokploy).

---

## 2. Schema SQLite

```sql
-- Catálogo de establecimientos
CREATE TABLE farmacias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    sector TEXT DEFAULT 'Centro',
    telefono TEXT,
    whatsapp TEXT,
    latitud REAL,
    longitud REAL,
    imagen_url TEXT,
    delivery INTEGER DEFAULT 0,
    activa INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Asignaciones cronológicas de turno
CREATE TABLE turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmacia_id INTEGER NOT NULL,
    inicio DATETIME NOT NULL,  -- UTC ISO: 2026-08-01T12:00:00Z
    fin DATETIME NOT NULL,     -- UTC ISO
    notas TEXT,
    FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE
);

-- Reportes comunitarios
CREATE TABLE reportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmacia_id INTEGER,
    turno_id INTEGER,
    tipo TEXT NOT NULL,        -- 'cerrada' | 'datos_incorrectos' | 'otro'
    detalle TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Validación de solapamiento:** al crear/editar turno, verificar que no exista otro turno con `inicio < nuevo_fin AND fin > nuevo_inicio` (excluyendo el propio ID si es edición).

---

## 3. Rutas y Arquitectura

```
src/
├── components/
│   ├── CardTurnoActual.astro      # Tarjeta principal en landing
│   ├── MapaBoton.astro            # Enlace directo a Google Maps/Waze
│   ├── ListaProximosTurnos.astro  # Cronograma próximos 7 días
│   ├── ReporteModal.astro         # Modal "¿No estaba abierta? Reportar"
│   └── Header.astro
├── layouts/
│   └── Layout.astro               # SEO, OpenGraph, PWA manifest, theme script
├── pages/
│   ├── index.astro                # Landing pública (SSR)
│   ├── api/
│   │   ├── turno.json.ts          # Endpoint JSON opcional
│   │   └── reportes.ts            # POST reporte → DB + Telegram
│   └── admin/
│       ├── login.astro            # Formulario simple
│       ├── index.astro            # Dashboard
│       ├── farmacias.astro        # CRUD farmacias
│       └── turnos.astro           # CRUD turnos + override
├── db/
│   ├── index.ts                   # Conexión Drizzle + better-sqlite3
│   └── schema.ts                  # Esquema Drizzle
├── actions/
│   ├── auth.ts                    # Login/logout, validación sesión
│   ├── farmacias.ts               # CRUD farmacias (Astro Actions)
│   ├── turnos.ts                  # CRUD turnos + override + validación
│   └── reportes.ts                # Guardar reporte + Telegram
└── utils/
    ├── time.ts                    # Utilidades UTC ↔ Caracas
    └── telegram.ts                # Cliente bot Telegram
```

---

## 4. MVP — Fase 1: "Abierto ahora, ya"

### Landing Pública (`/`)
- **Turno actual:** Card con badge animado "ABIERTO AHORA" (pulse verde), nombre, dirección, botones:
  - Llamar → `href="tel:+58..."`
  - WhatsApp → `href="https://wa.me/58...?text=..."`
  - Cómo llegar → `https://www.google.com/maps/search/?api=1&query={lat},{lon}`
- **Próximos turnos:** Lista 7 días (fecha, farmacia, hora inicio/fin).
- **Fallback sin turno:** Mensaje claro + números de emergencia locales.
- **Modo oscuro:** `prefers-color-scheme` + `localStorage`, sin flash (script inline en `<head>`).
- **Reporte comunitario:** Botón "¿Esta farmacia no estaba abierta?" → modal → POST `/api/reportes` → guarda en DB + envía a Telegram.

### Panel Admin (`/admin/*`)
- **Login:** Formulario contraseña → valida contra `ADMIN_PASSWORD` → cookie sesión 24h.
- **Dashboard:** Resumen turno actual + accesos rápidos.
- **CRUD Farmacias:** Nombre, dirección, sector, coords GPS, teléfono, WhatsApp, imagen, delivery, activa/inactiva.
- **CRUD Turnos:**
  - Selector farmacia + date-picker rango (inicio/fin) en hora Caracas.
  - Validación de solapamiento.
  - **Override "Cambiar turno de hoy":** botón rápido para sustituir farmacia actual por respaldo (crea turno override con prioridad).

### Seed de Prueba
- 12 farmacias de `FARMACIAS.md` (geocodificar las 5 sin coords con aproximación al centro/sector).
- 2 semanas de turnos ficticios rotativos (reemplazable desde el panel).

### Despliegue
- VPS con Node.js, proceso gestionado por pm2 o Dokploy.
- Backup diario del archivo `.db` (cron + `sqlite3 .backup`).

---

## 5. Fases Siguientes

### Fase 2 — Carga Rápida ✅
- [x] Importar CSV/Excel con preview y plantilla descargable.
- [x] Plantillas de rotación (slots configurables → generación masiva).
- [x] Historial paginado con filtros (farmacia, rango fechas, 50/page).
- [x] PWA básica: `manifest.json` + Service Worker offline con aviso "Datos de HH:MM".

### Fase 3 — Comunidad
- Bot de Telegram consultable (`/turno`, `/farmacias`).
- Reportes con confirmación multi-usuario (varios reportan → mayor confianza).
- Mapa OSM embebido en landing (tiles estáticos, sin JS pesado).
- Analytics simples (visitas, reportes, horarios pico).

### Fase 4 — Escala
- Multi-ciudad (mismo schema, agregar `ciudad_id`).
- Notificaciones push (turno próximo, cambios).
- API pública documentada.
- Migración a PostgreSQL si el volumen lo exige.

---

## 6. Fuera de Alcance del MVP
- Mapa interactivo embebido
- Bot de Telegram
- Multi-ciudad

---

## 7. Datos Reales (Fuente: `FARMACIAS.md`)

| Farmacia | Sector | Teléfono | Coords | Notas |
|----------|--------|----------|--------|-------|
| Farma Descuento Ayacucho Plus | Andrés Eloy Blanco | 0416-6857492 | pendiente | Delivery sí |
| Farma Amazonas (Sede Principal) | Av. Perimetral / CDI | 0248-5210171 | pendiente | |
| Farma Amazonas (Sucursal) | Av. Principal 23 de Enero / CC Esmeralda | 0248-5210171 | pendiente | |
| Farmacia Orinoco | Av. Orinoco, Troncal 2 | 0248-5212425 | pendiente | |
| Farmacia Doña Carmen | Av. Orinoco | 0248-5210305 | pendiente | Verificar si = El Carmen |
| Farmacia El Carmen | Av. 23 de Enero, Centro | 0248-5214109 | pendiente | Verificar si = Doña Carmen |
| Farma Abastos Amazonas | CC Alto Parima | — | pendiente | Sin teléfono |
| Farmacia Todo-Farma Amazonas | Sector Aramare | — | pendiente | Sin teléfono |
| Farmacia Aramare C.A. | Av. Orinoco / Banco Caroní | — | pendiente | Sin teléfono |
| Farmacia Autana | Sector Centro | — | pendiente | Sin teléfono |
| Farmacia La Suprema C.A. | Sector Centro | — | pendiente | Sin teléfono |
| Farmacia "La Paz" | Sector Centro | — | pendiente | Sin teléfono |

**Acción previa:** geocodificar direcciones (Nominatim / Google Maps API) y asignar sector coherente antes del seed.

---

## 8. Próximos Pasos Inmediatos

1. Inicializar proyecto Astro SSR + Tailwind + Drizzle + better-sqlite3.
2. Crear esquema Drizzle + migración inicial.
3. Script de seed con 12 farmacias + 2 semanas de turnos prueba.
4. Implementar utilidades `time.ts` (UTC ↔ Caracas, formato ISO).
5. Landing SSR: query turno actual + card + próximos.
6. Modal reporte + endpoint + integración Telegram.
7. Admin login + sesión + CRUD farmacias.
8. CRUD turnos + validación solapamiento + override.
9. Despliegue VPS + backup.

---

*Este documento reemplaza a `INFO.md` e `INFO2.md`. `FARMACIAS.md` se conserva como fuente de datos para el seed.*