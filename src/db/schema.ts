import { sqliteTable, text, integer, real, timestamp } from "drizzle-orm/sqlite-core";

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
  entrega: integer("entrega").default(0), // 0: No, 1: Sí
  createdAt: timestamp("created_at").defaultNow()
});

export const turnos = sqliteTable("turnos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  farmaciaId: integer("farmacia_id").notNull().references(() => farmacias.id),
  inicio: timestamp("inicio").notNull(),
  fin: timestamp("fin").notNull(),
  notas: text("notas")
});

export const reportes = sqliteTable("reportes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  farmaciaId: integer("farmacia_id").notNull().references(() => farmacias.id),
  turnoId: integer("turno_id").references(() => turnos.id),
  timestamp: timestamp("timestamp").defaultNow(),
  mensaje: text("mensaje"),
  ipAddress: text("ip_address")
});