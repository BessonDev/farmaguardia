import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Since we are using better-sqlite3, we use sqliteTable
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
  createdAt: timestamp("created_at").defaultNow()
});

export const turnos = sqliteTable("turnos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  farmaciaId: integer("farmacia_id").notNull().references(() => farmacias.id),
  inicio: timestamp("inicio").notNull(),
  fin: timestamp("fin").notNull(),
  notas: text("notas")
});