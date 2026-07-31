import { sqliteTable, text, integer, real, timestamp } from "drizzle-orm/sqlite-core";

// Tabla: farmacias (Catálogo de establecimientos)
export const farmacias = sqliteTable("farmacias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  sector: text("sector").default('Centro'),
  telefono: text("telefono"),
  whatsapp: text("whatsapp"),
  latitud: real("latitud"),
  longitud: real("longitud"),
  imagenUrl: text("imagen_url"),
  activa: integer("activa").default(1), // 1: Activa, 0: Inactiva
  entrega: integer("entrega").default(0), // 1: Sí, 0: No
  createdAt: timestamp("created_at").defaultNow()
});

// Tabla: turnos (Asignaciones cronológicas)
export const turnos = sqliteTable("turnos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  farmaciaId: integer("farmacia_id").notNull().references(() => farmacias.id),
  inicio: timestamp("inicio").notNull(),
  fin: timestamp("fin").notNull(),
  notas: text("notas")
});

// Tabla: reportes (Reportes de la comunidad sobre farmacias que no están abiertas)
export const reportes = sqliteTable("reportes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  farmaciaId: integer("farmacia_id").references(() => farmacias.id),
  mensaje: text("mensaje").notNull(),
  creadoEn: timestamp("creado_en").defaultNow()
});