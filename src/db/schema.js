import { pgTable, text, integer, real, timestamp, boolean } from 'drizzle-orm/pg-core';

// Tabla: farmacias (Catálogo de establecimientos)
export const farmacias = pgTable('farmacias', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  nombre: text('nombre').notNull(),
  direccion: text('direccion').notNull(),
  sector: text('sector').default('Centro'),
  telefono: text('telefono'),
  whatsapp: text('whatsapp'),
  latitud: real('latitud'),
  longitud: real('longitud'),
  imagenUrl: text('imagen_url'),
  activa: integer('activa').default(1), // 1: Activa, 0: Inactiva
  delivery: boolean('delivery').default(false), // Nuevo campo para delivery
  createdAt: timestamp('created_at').defaultNow()
});

// Tabla: turnos (Asignaciones cronológicas)
export const turnos = pgTable('turnos', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  farmaciaId: integer('farmacia_id').notNull().references(() => farmacias.id),
  inicio: timestamp('inicio').notNull(),
  fin: timestamp('fin').notNull(),
  notas: text('notas')
});