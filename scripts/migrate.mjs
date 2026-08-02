/**
 * Aplica las migraciones Drizzle en producción usando solo dependencias de
 * runtime (drizzle-orm + better-sqlite3). No requiere tsx/drizzle-kit.
 *
 * Uso (entrypoint del contenedor):
 *   node scripts/migrate.mjs
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';

const dbPath = process.env.DB_PATH || resolve('farmaguardia.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: './drizzle' });
sqlite.close();

console.log(`✅ Migraciones aplicadas (${dbPath})`);
