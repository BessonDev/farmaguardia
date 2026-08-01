import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const farmacias = sqliteTable('farmacias', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  direccion: text('direccion').notNull(),
  sector: text('sector').default('Centro'),
  telefono: text('telefono'),
  whatsapp: text('whatsapp'),
  latitud: real('latitud'),
  longitud: real('longitud'),
  imagenUrl: text('imagen_url'),
  delivery: integer('delivery', { mode: 'boolean' }).default(false),
  activa: integer('activa', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const turnos = sqliteTable('turnos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  farmaciaId: integer('farmacia_id').notNull().references(() => farmacias.id, { onDelete: 'cascade' }),
  inicio: text('inicio').notNull(), // UTC ISO: 2026-08-01T12:00:00Z
  fin: text('fin').notNull(),       // UTC ISO
  notas: text('notas'),
});

export const reportes = sqliteTable('reportes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  farmaciaId: integer('farmacia_id').references(() => farmacias.id, { onDelete: 'set null' }),
  turnoId: integer('turno_id').references(() => turnos.id, { onDelete: 'set null' }),
  tipo: text('tipo').notNull(), // 'cerrada' | 'datos_incorrectos' | 'otro'
  detalle: text('detalle'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export type Farmacia = typeof farmacias.$inferSelect;
export type NewFarmacia = typeof farmacias.$inferInsert;
export type Turno = typeof turnos.$inferSelect;
export type NewTurno = typeof turnos.$inferInsert;
export type Reporte = typeof reportes.$inferSelect;
export type NewReporte = typeof reportes.$inferInsert;