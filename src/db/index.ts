import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { farmacias, turnos } from './schema';

// Create SQLite database
const sqlite = new Database('farmaguardia.db');
export const db = drizzle(sqlite, {
  schema: {
    farmacias,
    turnos
  }
});