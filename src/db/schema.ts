import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';
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
  activa: integer('activa').notNull().default(1),
  delivery: integer('delivery').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const turnos = sqliteTable(
  'turnos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    farmaciaId: integer('farmacia_id')
      .notNull()
      .references(() => farmacias.id, { onDelete: 'cascade' }),
    inicioUtc: text('inicio_utc').notNull(),
    finUtc: text('fin_utc').notNull(),
    notas: text('notas'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_turnos_rango').on(table.inicioUtc, table.finUtc),
    index('idx_turnos_farmacia').on(table.farmaciaId),
  ],
);

export const anunciosTurno = sqliteTable(
  'anuncios_turno',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    turnoId: integer('turno_id')
      .notNull()
      .references(() => turnos.id, { onDelete: 'cascade' }),
    farmaciaSustitutaId: integer('farmacia_sustituta_id')
      .notNull()
      .references(() => farmacias.id),
    motivo: text('motivo'),
    vigenteDesdeUtc: text('vigente_desde_utc').notNull(),
    vigenteHastaUtc: text('vigente_hasta_utc').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_anuncios_vigencia').on(table.vigenteDesdeUtc, table.vigenteHastaUtc),
  ],
);

export const reportes = sqliteTable(
  'reportes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    turnoId: integer('turno_id').references(() => turnos.id, { onDelete: 'set null' }),
    motivo: text('motivo').notNull(),
    contacto: text('contacto'),
    ipHash: text('ip_hash'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_reportes_fecha').on(table.createdAt),
  ],
);

export const adminLog = sqliteTable('admin_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accion: text('accion').notNull(),
  payload: text('payload'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ip: text('ip').notNull(),
    exitoso: integer('exitoso').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_login_attempts_ip_fecha').on(table.ip, table.createdAt),
  ],
);

export const plantillas = sqliteTable('plantillas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const plantillaSlots = sqliteTable(
  'plantilla_slots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    plantillaId: integer('plantilla_id')
      .notNull()
      .references(() => plantillas.id, { onDelete: 'cascade' }),
    posicion: integer('posicion').notNull(),
    farmaciaId: integer('farmacia_id')
      .notNull()
      .references(() => farmacias.id),
  },
  (table) => [
    index('idx_slots_plantilla').on(table.plantillaId, table.posicion),
  ],
);

export const usuarios = sqliteTable(
  'usuarios',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_usuarios_username').on(table.username),
  ],
);

export type Farmacia = typeof farmacias.$inferSelect;
export type NuevoTurno = typeof turnos.$inferInsert;
export type Turno = typeof turnos.$inferSelect;
export type Plantilla = typeof plantillas.$inferSelect;
export type PlantillaSlot = typeof plantillaSlots.$inferSelect;