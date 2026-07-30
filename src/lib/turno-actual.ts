import { eq, and, lte, gte } from 'drizzle-orm';
import { db } from '../db/client';
import { farmacias, turnos, anunciosTurno } from '../db/schema';

export interface Farmacia {
  id: number;
  nombre: string;
  direccion: string;
  sector: string | null;
  telefono: string | null;
  whatsapp: string | null;
  latitud: number | null;
  longitud: number | null;
  imagenUrl: string | null;
  delivery: number | null;
}

export interface TurnoActivo {
  farmacia: Farmacia;
  finUtc: string;
  enOverride: boolean;
  motivoOverride?: string;
  turnoId: number;
}

/**
 * Resuelve cuál es la farmacia de turno en el instante `ahora` (UTC).
 *
 * Prioridad:
 * 1. Override vigente (anuncio de emergencia) — siempre gana.
 * 2. Turno normal cuyo rango [inicio_utc, fin_utc] contiene `ahora`.
 * 3. null si no hay nada.
 *
 * El server corre en UTC. La conversión a hora de VE es solo en presentación.
 */
export async function getTurnoActivo(ahoraUtc: Date = new Date()): Promise<TurnoActivo | null> {
  const ahoraIso = ahoraUtc.toISOString();

  const override = db
    .select({
      turnoId: turnos.id,
      finOriginal: turnos.finUtc,
      farmacia: farmacias,
      motivo: anunciosTurno.motivo,
    })
    .from(anunciosTurno)
    .innerJoin(turnos, eq(anunciosTurno.turnoId, turnos.id))
    .innerJoin(farmacias, eq(anunciosTurno.farmaciaSustitutaId, farmacias.id))
    .where(
      and(
        lte(anunciosTurno.vigenteDesdeUtc, ahoraIso),
        gte(anunciosTurno.vigenteHastaUtc, ahoraIso),
      ),
    )
    .get();

  if (override) {
    return {
      farmacia: override.farmacia,
      finUtc: override.finOriginal,
      enOverride: true,
      motivoOverride: override.motivo ?? undefined,
      turnoId: override.turnoId,
    };
  }

  const turno = db
    .select({
      turnoId: turnos.id,
      finUtc: turnos.finUtc,
      farmacia: farmacias,
    })
    .from(turnos)
    .innerJoin(farmacias, eq(turnos.farmaciaId, farmacias.id))
    .where(
      and(
        lte(turnos.inicioUtc, ahoraIso),
        gte(turnos.finUtc, ahoraIso),
        eq(farmacias.activa, 1),
      ),
    )
    .get();

  if (turno) {
    return {
      farmacia: turno.farmacia,
      finUtc: turno.finUtc,
      enOverride: false,
      turnoId: turno.turnoId,
    };
  }

  return null;
}

/**
 * Devuelve los próximos N turnos a partir de `ahora`, ordenados cronológicamente.
 * Excluye el turno activo actual.
 */
export async function getProximosTurnos(
  ahoraUtc: Date = new Date(),
  cantidad = 7,
): Promise<Array<{ farmacia: Farmacia; inicioUtc: string; finUtc: string; turnoId: number }>> {
  const ahoraIso = ahoraUtc.toISOString();
  const rows = db
    .select({
      turnoId: turnos.id,
      inicioUtc: turnos.inicioUtc,
      finUtc: turnos.finUtc,
      farmacia: farmacias,
    })
    .from(turnos)
    .innerJoin(farmacias, eq(turnos.farmaciaId, farmacias.id))
    .where(and(gte(turnos.inicioUtc, ahoraIso), eq(farmacias.activa, 1)))
    .orderBy(turnos.inicioUtc)
    .limit(cantidad)
    .all();

  return rows;
}