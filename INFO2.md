# 📄 Especificación Técnica: Portal de Farmacias de Turno

## 📌 1. Visión General del Proyecto
**Nombre del Proyecto:** FarmaGuardia
**Ubicación Objetivo:** Puerto Ayacucho, Estado Amazonas, Venezuela  
**Propósito:** Desarrollo de una plataforma web liviana, accesible y de alto impacto social que permita a la comunidad consultar en tiempo real cuál farmacia se encuentra de turno las 24 horas, facilitando contacto directo y ubicación geográfica.

---

## 🛠️ 2. Stack Tecnológico

- **Framework Web:** [Astro JS](https://astro.build/) (Configurado en modo Híbrido / SSR `output: 'server'`).
- **Base de Datos:** SQLite en VPS.
- **Estilos:** Tailwind CSS (Diseño Mobile-First, ligero y adaptativo).
- **Despliegue Recomendado:** Node.js en VPS.

---

## 🗄️ 3. Modelo de Base de Datos (Schema)

El esquema de SQLite consta de dos tablas principales

```sql
-- Tabla: farmacias (Catálogo de establecimientos)
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
    delivery BOOLEAN DEFAULT 0, -- 1: Sí, 0: No
    activa INTEGER DEFAULT 1, -- 1: Activa, 0: Inactiva
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: turnos (Asignaciones cronológicas)
CREATE TABLE turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmacia_id INTEGER NOT NULL,
    inicio DATETIME NOT NULL, -- Formato ISO8601 UTC / Local
    fin DATETIME NOT NULL,
    notas TEXT,
    FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE
);
📐 4. Arquitectura de Navegación y Rutas
Plaintext
src/
├── components/
│   ├── CardTurnoActual.astro     # Tarjeta principal en home
│   ├── MapaBoton.astro           # Directo a Google Maps / Waze
│   ├── ListaProximosTurnos.astro # Cronograma de la semana
│   └── Header.astro
├── layouts/
│   └── Layout.astro              # Meta tags SEO, OpenGraph y PWA básica
├── pages/
│   ├── index.astro               # Landing Page pública (SSR)
│   ├── api/
│   │   └── turnos.ts             # Endpoint opcional para consultar datos en JSON
│   └── admin/
│       ├── index.astro           # Dashboard principal
│       ├── login.astro           # Autenticación simple de admin
│       ├── farmacias.astro       # CRUD de farmacias
│       └── turnos.astro          # Carga de cronograma de turnos
└── db/
    ├── index.ts                  # Conexión DB
    └── schema.ts                 # Esquema Drizzle
⚙️ 5. Requerimientos Funcionales
5.1 Landing Page Pública (/)
Detección Dinámica de Turno:

La página debe evaluar la fecha y hora actual del servidor (NOW()).

Debe hacer un JOIN entre turnos y farmacias donde inicio <= NOW() y fin >= NOW().

Si un turno cruza la medianoche (ej. 8:00 AM de hoy a 8:00 AM de mañana), debe calcularse de manera transparente sin fallos de zona horaria.

Acciones Rápidas (CTA):

Botón de Llamar: Enlace HTML nativo href="tel:+58X...".

Botón WhatsApp: Enlace href="https://wa.me/58X..." con mensaje predeterminado.

Botón Ubicación: URL dinámica a Google Maps: https://www.google.com/maps/search/?api=1&query={latitud},{longitud}.

Fallback / Sin Turno:

Si no hay turno registrado para el bloque horario actual, mostrar un mensaje claro con números de emergencia locales.

Sección "Próximos Turnos":

Mostrar un listado de las farmacias asignadas para los siguientes 3 a 7 días.

5.2 Panel de Administración (/admin)
Autenticación:

Control de acceso por sesión vía Cookie HTTP-Only comparando contraseñas con variable de entorno ADMIN_PASSWORD.

Gestor de Farmacias:

Formulario de creación/edición de datos de la farmacia (Nombre, Dirección, Coordenadas, Contacto).

Gestor de Turnos:

Selector de farmacia + selector de rango de fecha/hora de inicio y fin.

Botón de sustitución rápida (Override) para cambiar la farmacia de turno en caso de emergencias imprevistas.

🎨 6. Especificaciones de UI/UX (Diseño)
Enfoque Mobile-First: El 90%+ del tráfico provendrá de dispositivos móviles.

Modo Oscuro Predeterminado o Automático: Facilita la consulta durante la noche/madrugada sin fatiga visual.

Badge / Indicador de Estado: Un elemento visual destacado tipo "ABIERTO AHORA" con luz verde animada (animate-pulse).

Velocidad Extrema: Sin librerías pesadas en el cliente. La renderización inicial debe ocurrir en menos de 1 segundo en conexiones 3G.

📝 7. Lógica de Consulta Principal (Ejemplo Astro SSR)
TypeScript
// src/pages/index.astro (Fragmento de servidor)
import { db } from '../db';
import { farmacias, turnos } from '../db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';

const ahora = new Date().toISOString();

const turnoActual = await db
  .select({
    nombre: farmacias.nombre,
    direccion: farmacias.direccion,
    telefono: farmacias.telefono,
    whatsapp: farmacias.whatsapp,
    latitud: farmacias.latitud,
    longitud: farmacias.longitud,
    finTurno: turnos.fin
  })
  .from(turnos)
  .innerJoin(farmacias, eq(turnos.farmacia_id, farmacias.id))
  .where(and(lte(turnos.inicio, ahora), gte(turnos.fin, ahora)))
  .get();