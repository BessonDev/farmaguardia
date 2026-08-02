/**
 * Aplica las migraciones Drizzle en producción usando solo dependencias de
 * runtime (drizzle-orm + better-sqlite3). No requiere tsx/drizzle-kit.
 *
 * Robustez: si la DB ya tiene el schema (ej: creada por `drizzle-kit push`,
 * que no registra en `__drizzle_migrations`), las migraciones que fallem
 * porque sus tablas/columnas/indexes ya existen se marcan como aplicadas
 * sin tocar los datos existentes.
 *
 * Uso (entrypoint del contenedor):
 *   node scripts/migrate.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH || resolve('farmaguardia.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Tabla de seguimiento (mismo DDL que usa drizzle-orm)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at numeric
  )
`);

const journalPath = 'drizzle/meta/_journal.json';
if (!fs.existsSync(journalPath)) {
  throw new Error(`Can't find meta/_journal.json file`);
}
const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));

const appliedHashes = new Set(
  sqlite.prepare('SELECT hash FROM __drizzle_migrations').all().map((r) => r.hash),
);

// Errores que indican "este paso ya estaba aplicado" (DB creada por push previo)
function isAlreadyAppliedError(error) {
  const msg = String(error?.message ?? error);
  return /already exists|duplicate column name|has no column named/i.test(msg);
}

const appliedAny = sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)');

for (const entry of journal.entries) {
  const tag = entry.tag;
  const migrationPath = `drizzle/${tag}.sql`;
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`No file ${migrationPath} found in drizzle folder`);
  }

  const query = fs.readFileSync(migrationPath, 'utf-8');
  const hash = crypto.createHash('sha256').update(query).digest('hex');
  if (appliedHashes.has(hash)) continue;

  const statements = query
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    sqlite.exec('BEGIN');
    for (const stmt of statements) {
      try {
        sqlite.exec(stmt);
      } catch (e) {
        if (!isAlreadyAppliedError(e)) throw e;
        console.warn(`   ↪ Ya existía, se omite: ${stmt.slice(0, 70)}...`);
      }
    }
    appliedAny.run(hash, entry.when);
    sqlite.exec('COMMIT');
    console.log(`✅ ${tag} aplicada`);
  } catch (e) {
    sqlite.exec('ROLLBACK');
    throw e;
  }
}

sqlite.close();
console.log(`✅ Migraciones aplicadas (${dbPath})`);
