const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_PATH || 'farmaguardia.db');

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmacia_id INTEGER NOT NULL,
    inicio DATETIME NOT NULL,
    fin DATETIME NOT NULL,
    notas TEXT,
    FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE
  );
`);

// Get today's date at 8:00 AM Venezuela time (UTC-4)
const now = new Date();
const venezuelaOffset = -4 * 60; // -4 hours in minutes
const venezuelaTime = new Date(now.getTime() + venezuelaOffset * 60000);

// Set to 8:00 AM today
let startOfDay = new Date(venezuelaTime);
startOfDay.setHours(8, 0, 0, 0);

// If it's already past 8:00 AM, we might want to start from tomorrow for testing
// But for simplicity, let's set a shift from 8:00 today to 8:00 tomorrow
const startTime = new Date(startOfDay);
const endTime = new Date(startOfDay);
endTime.setDate(endTime.getDate() + 1); // next day 8:00 AM

// Get all farmacias to assign turns
const farmacias = db.prepare('SELECT id FROM farmacias').all();

if (farmacias.length === 0) {
  console.error('No farmacias found. Please run seed.js first.');
  process.exit(1);
}

// Clear existing turnos (optional)
db.prepare('DELETE FROM turnos').run();

// Assign shifts in round-robin fashion for the next few days
const insert = db.prepare(`
  INSERT INTO turnos (farmacia_id, inicio, fin, notas)
  VALUES (@farmacia_id, @inicio, @fin, @notas)
`);

let currentStart = new Date(startTime);
let currentEnd = new Date(endTime);

// We'll create shifts for the next 3 days
for (let day = 0; day < 3; day++) {
  for (let i = 0; i < farmacias.length; i++) {
    const farmacia = farmacias[i];
    
    // Alternate between morning and evening shifts? For simplicity, 24-hour shifts
    insert.run({
      farmacia_id: farmacia.id,
      inicio: currentStart.toISOString(),
      fin: currentEnd.toISOString(),
      notas: `Turno de 24 horas - Día ${day + 1}`
    });
    
    // Move to next period (next day)
    currentStart = new Date(currentEnd);
    currentEnd = new Date(currentEnd);
    currentEnd.setDate(currentEnd.getDate() + 1);
  }
}

console.log(`Seeded turnos for the next 3 days`);