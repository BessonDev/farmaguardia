import { db } from '../src/db/index';
import { farmacias, turnos } from '../src/db/schema';
import { sql } from 'drizzle-orm';

const PHARMACY_DATA = [
  { nombre: 'Farma Descuento Ayacucho Plus', direccion: 'Urbanización Andrés Eloy Blanco, a 100 metros del paseo, Puerto Ayacucho Estado Amazonas', telefono: '0416-6857492', whatsapp: '0416-6857492', sector: 'Andrés Eloy Blanco', delivery: true, regente: false, latitud: 5.6667, longitud: -67.6333 },
  { nombre: 'Farma Amazonas (Sede Principal)', direccion: 'Av. Perimetral, al lado del Centro de Diagnóstico Integral Dr. Gilberto Rodríguez Ochoa, Puerto Ayacucho Estado Amazonas', telefono: '0248-5210171', whatsapp: '0248-5210171', sector: 'Perimetral / CDI', delivery: false, regente: false, latitud: 5.6700, longitud: -67.6300 },
  { nombre: 'Farma Amazonas (Sucursal)', direccion: 'Av. Principal 23 de Enero, al lado del Centro Comercial Esmeralda, Puerto Ayacucho Estado Amazonas', telefono: '0248-5210171', whatsapp: '0248-5210171', sector: '23 de Enero / CC Esmeralda', delivery: false, regente: false, latitud: 5.6720, longitud: -67.6350 },
  { nombre: 'Farmacia Orinoco', direccion: 'Avenida Orinoco, Troncal 2 Puerto Ayacucho Estado Amazonas', telefono: '0248-5212425', whatsapp: '0248-5212425', sector: 'Av. Orinoco / Troncal 2', delivery: false, regente: false, latitud: 5.6680, longitud: -67.6380 },
  { nombre: 'Farmacia Doña Carmen', direccion: 'Avenida Orinoco, Puerto Ayacucho Estado Amazonas', telefono: '0248-5210305', whatsapp: '0248-5210305', sector: 'Av. Orinoco', delivery: false, regente: false, latitud: 5.6670, longitud: -67.6360 },
  { nombre: 'Farmacia El Carmen', direccion: 'Avenida 23 de Enero, Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '0248-5214109', whatsapp: '0248-5214109', sector: 'Centro / 23 de Enero', delivery: false, regente: false, latitud: 5.6660, longitud: -67.6340 },
  { nombre: 'Farma Abastos Amazonas', direccion: 'Planta Baja, Centro Comercial Alto Parima, Local S/N, Calle Principal, Puerto Ayacucho Estado Amazonas', telefono: '', whatsapp: '', sector: 'Centro / CC Alto Parima', delivery: false, regente: false, latitud: 5.6650, longitud: -67.6320 },
  { nombre: 'Farmacia Todo-Farma Amazonas, C.A.', direccion: 'Sector Aramare, Puerto Ayacucho Estado Amazonas', telefono: '', whatsapp: '', sector: 'Aramare', delivery: false, regente: false, latitud: 5.6600, longitud: -67.6400 },
  { nombre: 'Farmacia Aramare C.A.', direccion: 'Avenida Orinoco, al lado del Banco Caroní, Puerto Ayacucho Estado Amazonas', telefono: '', whatsapp: '', sector: 'Av. Orinoco / Banco Caroní', delivery: false, regente: false, latitud: 5.6690, longitud: -67.6370 },
  { nombre: 'Farmacia Autana', direccion: 'Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '', whatsapp: '', sector: 'Centro', delivery: false, regente: false, latitud: 5.6660, longitud: -67.6330 },
  { nombre: 'Farmacia La Suprema, C.A.', direccion: 'Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '', whatsapp: '', sector: 'Centro', delivery: false, regente: false, latitud: 5.6655, longitud: -67.6325 },
  { nombre: 'Farmacia "La Paz"', direccion: 'Sector Centro, Puerto Ayacucho Estado Amazonas', telefono: '', whatsapp: '', sector: 'Centro', delivery: false, regente: false, latitud: 5.6670, longitud: -67.6345 },
];

function toUTCISO(date: Date): string {
  return date.toISOString();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

async function seed() {
  console.log('🌱 Iniciando seed de FarmaGuardia...');

  // Limpiar tablas
  console.log('🧹 Limpiando tablas existentes...');
  await db.delete(turnos);
  await db.delete(farmacias);

  // Insertar farmacias
  console.log('🏥 Insertando farmacias...');
  const insertedFarmacias = await db.insert(farmacias).values(
    PHARMACY_DATA.map(p => ({
      ...p,
      delivery: p.delivery ? 1 : 0,
      regente: p.regente ? 1 : 0,
      activa: 1,
    }))
  ).returning({ id: farmacias.id, nombre: farmacias.nombre });

  console.log(`✅ ${insertedFarmacias.length} farmacias insertadas`);

  // Generar turnos de prueba: 14 días, rotación simple
  console.log('📅 Generando turnos de prueba (14 días)...');
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  const turnosData = [];
  for (let day = 0; day < 14; day++) {
    const farmacia = insertedFarmacias[day % insertedFarmacias.length];
    const inicioLocal = setTime(addDays(startDate, day), 12); // 08:00 Caracas = 12:00 UTC
    const finLocal = setTime(addDays(startDate, day + 1), 12); // 08:00 Caracas next day = 12:00 UTC

    turnosData.push({
      farmaciaId: farmacia.id,
      inicio: toUTCISO(inicioLocal),
      fin: toUTCISO(finLocal),
      notas: `Turno de prueba día ${day + 1}`,
    });
  }

  await db.insert(turnos).values(turnosData);
  console.log(`✅ ${turnosData.length} turnos de prueba generados`);

  // Verificar
  const countFarmacias = await db.select({ count: sql`count(*)` }).from(farmacias);
  const countTurnos = await db.select({ count: sql`count(*)` }).from(turnos);
  console.log(`\n📊 Resumen:`);
  console.log(`   Farmacias: ${Number(countFarmacias[0].count)}`);
  console.log(`   Turnos: ${Number(countTurnos[0].count)}`);

  console.log('\n🎉 Seed completado exitosamente');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});