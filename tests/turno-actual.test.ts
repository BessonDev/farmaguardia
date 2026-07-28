import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEST_DB = join(tmpdir(), `farmaguardia-test-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = TEST_DB;
process.env.TZ = 'UTC';

mkdirSync(join(TEST_DB, '..'), { recursive: true });

// Importamos DESPUÉS de setear env vars para que el client.ts use TEST_DB
const { db, schema } = await import('../src/db/client');
const { getTurnoActivo, getProximosTurnos } = await import('../src/lib/turno-actual');
const { turnoCaracas } = await import('../src/lib/tz');

// Antes de cualquier test, corremos la migración contra la DB de test.
beforeAll(async () => {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');

  const sqlite = new Database(TEST_DB);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const testDb = drizzle(sqlite);
  migrate(testDb, { migrationsFolder: './drizzle' });
  sqlite.close();
});

beforeEach(() => {
  db.delete(schema.anunciosTurno).run();
  db.delete(schema.turnos).run();
  db.delete(schema.farmacias).run();
});

function crearFarmacia(nombre: string) {
  return db
    .insert(schema.farmacias)
    .values({
      nombre,
      direccion: `Dirección de ${nombre}`,
      sector: 'Centro',
      telefono: '+584140000000',
      whatsapp: '+584140000000',
      activa: 1,
    })
    .returning()
    .get();
}

describe('getTurnoActivo', () => {
  it('devuelve null cuando no hay turnos cargados', async () => {
    crearFarmacia('Farmacia A');
    const turno = await getTurnoActivo(new Date('2026-07-28T15:00:00Z'));
    expect(turno).toBeNull();
  });

  it('devuelve el turno cuyo rango contiene la hora consultada', async () => {
    const f = crearFarmacia('Farmacia A');
    const { inicioUtc, finUtc } = turnoCaracas('2026-07-28', '08:00');
    db.insert(schema.turnos).values({ farmaciaId: f.id, inicioUtc, finUtc }).run();

    const turno = await getTurnoActivo(new Date('2026-07-28T15:00:00Z'));
    expect(turno).not.toBeNull();
    expect(turno!.farmacia.nombre).toBe('Farmacia A');
    expect(turno!.enOverride).toBe(false);
  });

  it('maneja correctamente el cruce de medianoche (turno de 24h)', async () => {
    const f = crearFarmacia('Farmacia Nocturna');
    const { inicioUtc, finUtc } = turnoCaracas('2026-07-28', '08:00');
    db.insert(schema.turnos).values({ farmaciaId: f.id, inicioUtc, finUtc }).run();

    // A las 02:00 VE del 29 (= 06:00 UTC del 29), todavía es el turno del 28
    const turno = await getTurnoActivo(new Date('2026-07-29T06:00:00Z'));
    expect(turno).not.toBeNull();
    expect(turno!.farmacia.nombre).toBe('Farmacia Nocturna');

    // A las 09:00 VE del 29 (= 13:00 UTC del 29), ya no es ese turno
    const turnoDespues = await getTurnoActivo(new Date('2026-07-29T13:00:00Z'));
    expect(turnoDespues).toBeNull();
  });

  it('ignora farmacias inactivas', async () => {
    const f = crearFarmacia('Farmacia Cerrada');
    db.update(schema.farmacias).set({ activa: 0 }).where(eq(schema.farmacias.id, f.id)).run();

    const { inicioUtc, finUtc } = turnoCaracas('2026-07-28', '08:00');
    db.insert(schema.turnos).values({ farmaciaId: f.id, inicioUtc, finUtc }).run();

    const turno = await getTurnoActivo(new Date('2026-07-28T15:00:00Z'));
    expect(turno).toBeNull();
  });

  it('el override vigente gana sobre el turno normal', async () => {
    const original = crearFarmacia('Farmacia Original');
    const sustituta = crearFarmacia('Farmacia Sustituta');

    const { inicioUtc, finUtc } = turnoCaracas('2026-07-28', '08:00');
    const turno = db
      .insert(schema.turnos)
      .values({ farmaciaId: original.id, inicioUtc, finUtc })
      .returning()
      .get();

    db.insert(schema.anunciosTurno)
      .values({
        turnoId: turno.id,
        farmaciaSustitutaId: sustituta.id,
        motivo: 'Cerró por inventario',
        vigenteDesdeUtc: '2026-07-28T16:00:00.000Z',
        vigenteHastaUtc: '2026-07-29T12:00:00.000Z',
      })
      .run();

    // Antes del override (14:00 UTC = 10:00 VE) → farmacia original
    const antes = await getTurnoActivo(new Date('2026-07-28T14:00:00Z'));
    expect(antes).not.toBeNull();
    expect(antes!.farmacia.nombre).toBe('Farmacia Original');
    expect(antes!.enOverride).toBe(false);

    // Durante el override (20:00 UTC = 16:00 VE) → sustituta
    const durante = await getTurnoActivo(new Date('2026-07-28T20:00:00Z'));
    expect(durante!.farmacia.nombre).toBe('Farmacia Sustituta');
    expect(durante!.enOverride).toBe(true);
    expect(durante!.motivoOverride).toBe('Cerró por inventario');
  });

  it('dos turnos contiguos: solo uno está activo a la vez', async () => {
    const f1 = crearFarmacia('Farmacia Día 1');
    const f2 = crearFarmacia('Farmacia Día 2');

    const t1 = turnoCaracas('2026-07-28', '08:00');
    const t2 = turnoCaracas('2026-07-29', '08:00');
    db.insert(schema.turnos).values([
      { farmaciaId: f1.id, ...t1 },
      { farmaciaId: f2.id, ...t2 },
    ]).run();

    const m1 = await getTurnoActivo(new Date('2026-07-28T15:00:00Z'));
    const m2 = await getTurnoActivo(new Date('2026-07-29T15:00:00Z'));

    expect(m1!.farmacia.nombre).toBe('Farmacia Día 1');
    expect(m2!.farmacia.nombre).toBe('Farmacia Día 2');
  });
});

describe('getProximosTurnos', () => {
  it('devuelve los próximos N turnos ordenados', async () => {
    const f1 = crearFarmacia('A');
    const f2 = crearFarmacia('B');
    const f3 = crearFarmacia('C');

    db.insert(schema.turnos).values([
      { farmaciaId: f1.id, ...turnoCaracas('2026-07-28', '08:00') },
      { farmaciaId: f2.id, ...turnoCaracas('2026-07-29', '08:00') },
      { farmaciaId: f3.id, ...turnoCaracas('2026-07-30', '08:00') },
    ]).run();

    const proximos = await getProximosTurnos(new Date('2026-07-28T00:00:00Z'), 3);
    expect(proximos).toHaveLength(3);
    expect(proximos[0].farmacia.nombre).toBe('A');
    expect(proximos[1].farmacia.nombre).toBe('B');
    expect(proximos[2].farmacia.nombre).toBe('C');
  });
});

afterAll(async () => {
  const { closeDb } = await import('../src/db/client');
  closeDb();
  rmSync(TEST_DB, { force: true });
  rmSync(`${TEST_DB}-journal`, { force: true });
  rmSync(`${TEST_DB}-wal`, { force: true });
  rmSync(`${TEST_DB}-shm`, { force: true });
});