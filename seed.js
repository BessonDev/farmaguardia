const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_PATH || 'farmaguardia.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS farmacias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT NOT NULL,
    sector TEXT DEFAULT 'Centro',
    telefono TEXT,
    whatsapp TEXT,
    latitud REAL,
    longitud REAL,
    imagen_url TEXT,
    activa INTEGER DEFAULT 1,
    entrega INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reportes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmacia_id INTEGER NOT NULL,
    mensaje TEXT NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmacia_id) REFERENCES farmacias(id) ON DELETE CASCADE
  );
`);

// Clear existing data (optional)
db.prepare('DELETE FROM farmacias').run();
db.prepare('DELETE FROM reportes').run();

const farmaciasData = [
  { nombre: 'Farma Descuento Ayacucho Plus', direccion: 'Urbanización Andrés Eloy Blanco, a 100 metros del paseo, Puerto Ayacucho Estado Amazonas', telefono: '0416-6857492', entrega: 1 },
  { nombre: 'Farma Amazonas (Sede Principal)', direccion: 'Av. Perimetral, al lado del Centro de Diagnóstico Integral Dr. Gilberto Rodríguez Ochoa, Puerto Ayacucho Estado Amazonas (C.D.I)', telefono: '0248-5210171', entrega: 1 },
  { nombre: 'Farma Amazonas (Sucursal)', direccion: 'Av. Principal 23 de Enero, al lado del Centro Comercial Esmeralda, Puerto Ayacucho Estado Amazonas', telefono: '0248-5210171', entrega: 0 },
  { nombre: 'Farmacia Orinoco', direccion: 'Avenida Orinoco, Troncal 2 Puerto Ayacucho Estado Amazonas', telefono: '0248-5212425', entrega: 1 },
  { nombre: 'Farmacia Doña Carmen', direccion: 'Avenida Orinoco, Puerto Ayacucho Estado Amazonas', telefono: '0248-5210305', entrega: 0 },
  { nombre: 'Farmacia El Carmen', direccion: 'Avenida 23 de Enero, Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '0248-5214109', entrega: 1 },
  { nombre: 'Farma Abastos Amazonas', direccion: 'Planta Baja, Centro Comercial Alto Parima, Local S/N, Calle Principal, Puerto Ayacucho Estado Amazonas', telefono: '', entrega: 0 },
  { nombre: 'Farmacia Todo-Farma Amazonas, C.A.', direccion: 'Sector Aramare, Puerto Ayacucho Estado Amazonas', telefono: '', entrega: 1 },
  { nombre: 'Farmacia Aramare C.A.', direccion: 'Avenida Orinoco, al lado del Banco Caroní, Puerto Ayacucho Estado Amazonas', telefono: '', entrega: 0 },
  { nombre: 'Farmacia Autana', direccion: 'Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '', entrega: 1 },
  { nombre: 'Farmacia La Suprema, C.A.', direccion: 'Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '', entrega: 0 },
  { nombre: 'Farmacia La Paz', direccion: 'Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '', entrega: 1 }
];

const insert = db.prepare(`
  INSERT INTO farmacias (nombre, direccion, telefono, entrega)
  VALUES (@nombre, @direccion, @telefono, @entrega)
`);

for (const farmacia of farmaciasData) {
  insert.run(farmacia);
}

console.log(`Seeded ${farmaciasData.length} farmacias`);