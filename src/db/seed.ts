import { db, schema } from './client';
import { turnoCaracas } from '../lib/tz';

type FarmaciaSeed = {
  nombre: string;
  direccion: string;
  sector: string;
  telefono: string | null;
  whatsapp: string | null;
};

const FARMACIAS: FarmaciaSeed[] = [
  {
    nombre: 'Farma Descuento Ayacucho Plus',
    direccion: 'Urb. Andrés Eloy Blanco, a 100m del paseo, Puerto Ayacucho, Amazonas',
    sector: 'Andrés Eloy Blanco',
    telefono: '+584166857492',
    whatsapp: '+584166857492',
  },
  {
    nombre: 'Farma Amazonas (Sede Principal)',
    direccion: 'Av. Perimetral, al lado del CDI Dr. Gilberto Rodríguez Ochoa, Puerto Ayacucho',
    sector: 'Perimetral',
    telefono: '+582485210171',
    whatsapp: '+582485210171',
  },
  {
    nombre: 'Farma Amazonas (Sucursal)',
    direccion: 'Av. Principal 23 de Enero, al lado del C.C. Esmeralda, Puerto Ayacucho',
    sector: 'Centro',
    telefono: '+582485210171',
    whatsapp: '+582485210171',
  },
  {
    nombre: 'Farmacia Orinoco',
    direccion: 'Av. Orinoco, Troncal 2, Puerto Ayacucho',
    sector: 'Orinoco',
    telefono: '+582485212425',
    whatsapp: '+582485212425',
  },
  {
    nombre: 'Farmacia Doña Carmen',
    direccion: 'Av. Orinoco, Puerto Ayacucho',
    sector: 'Orinoco',
    telefono: '+582485210305',
    whatsapp: '+582485210305',
  },
  {
    nombre: 'Farmacia El Carmen',
    direccion: 'Av. 23 de Enero, Sector Centro, Puerto Ayacucho',
    sector: 'Centro',
    telefono: '+582485214109',
    whatsapp: '+582485214109',
  },
  {
    nombre: 'Farma Abastos Amazonas',
    direccion: 'PB C.C. Alto Parima, Calle Principal, Puerto Ayacucho',
    sector: 'Centro',
    telefono: null,
    whatsapp: null,
  },
  {
    nombre: 'Farmacia Todo-Farma Amazonas, C.A.',
    direccion: 'Sector Aramare, Puerto Ayacucho',
    sector: 'Aramare',
    telefono: null,
    whatsapp: null,
  },
  {
    nombre: 'Farmacia Aramare C.A.',
    direccion: 'Av. Orinoco, al lado del Banco Caroní, Puerto Ayacucho',
    sector: 'Orinoco',
    telefono: null,
    whatsapp: null,
  },
  {
    nombre: 'Farmacia Autana',
    direccion: 'Sector Centro, Puerto Ayacucho',
    sector: 'Centro',
    telefono: null,
    whatsapp: null,
  },
  {
    nombre: 'Farmacia La Suprema, C.A.',
    direccion: 'Sector Centro, Puerto Ayacucho',
    sector: 'Centro',
    telefono: null,
    whatsapp: null,
  },
  {
    nombre: 'Farmacia "La Paz"',
    direccion: 'Sector Centro, Puerto Ayacucho',
    sector: 'Centro',
    telefono: null,
    whatsapp: null,
  },
];

async function seed() {
  console.log('[seed] Limpiando tablas…');
  db.delete(schema.turnos).run();
  db.delete(schema.farmacias).run();

  console.log('[seed] Insertando farmacias…');
  const farmaciasInsertadas = db
    .insert(schema.farmacias)
    .values(
      FARMACIAS.map((f) => ({
        nombre: f.nombre,
        direccion: f.direccion,
        sector: f.sector,
        telefono: f.telefono,
        whatsapp: f.whatsapp,
        activa: 1,
      })),
    )
    .returning()
    .all();

  console.log(`[seed] ${farmaciasInsertadas.length} farmacias insertadas.`);

  console.log('[seed] Generando 30 días de turnos rotativos…');

  // Rotación: cada día una farmacia distinta, saltando las que no tienen teléfono
  // para priorizar las que pueden ser contactadas.
  const rotacion = farmaciasInsertadas.filter((f) => f.telefono !== null);

  const hoy = new Date();
  const fechaBase = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));

  const turnosAInsertar: Array<typeof schema.turnos.$inferInsert> = [];
  for (let i = 0; i < 30; i++) {
    const fecha = new Date(fechaBase);
    fecha.setUTCDate(fecha.getUTCDate() + i);

    const farmacia = rotacion[i % rotacion.length];
    const fechaLocal = formatFechaLocal(fecha);
    const { inicioUtc, finUtc } = turnoCaracas(fechaLocal, '08:00');

    turnosAInsertar.push({
      farmaciaId: farmacia.id,
      inicioUtc,
      finUtc,
      notas: i === 0 ? 'Turno generado por seed' : null,
    });
  }

  db.insert(schema.turnos).values(turnosAInsertar).run();
  console.log(`[seed] ${turnosAInsertar.length} turnos insertados.`);

  // Verificación: mostrar el turno de hoy
  const { getTurnoActivo } = await import('../lib/turno-actual');
  const activo = await getTurnoActivo();
  if (activo) {
    console.log(`[seed] Turno activo ahora: ${activo.farmacia.nombre}`);
    console.log(`[seed] Finaliza (UTC): ${activo.finUtc}`);
  } else {
    console.warn('[seed] No se encontró turno activo (esto no debería pasar).');
  }

  console.log('[seed] Listo.');
  process.exit(0);
}

function formatFechaLocal(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});