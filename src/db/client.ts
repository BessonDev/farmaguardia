import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_URL ?? './data/farmaguardia.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

export const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };

/** Cierra la conexión a la DB. Útil para tests. */
export function closeDb() {
  sqlite.close();
}