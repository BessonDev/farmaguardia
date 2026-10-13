/**
 * Cálculo del grupo del día para FarmaGuardia.
 * Fuente única: el dashboard y la creación de turnos deben usar esto mismo.
 * El "día" es el día calendario en hora Caracas (UTC-4).
 */

import { utcToCaracas } from './time';

/**
 * Devuelve la fecha de hoy en Caracas como 'YYYY-MM-DD'.
 * El parámetro `now` es inyectable para poder testear la frontera de medianoche.
 */
export function fechaCaracasHoy(now: Date = new Date()): string {
  const caracas = utcToCaracas(now);
  const year = caracas.getUTCFullYear();
  const month = String(caracas.getUTCMonth() + 1).padStart(2, '0');
  const day = String(caracas.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Grupo que corresponde a una fecha (día calendario Caracas).
 * El día de inicio es el grupo 1. El módulo es seguro para fechas
 * anteriores a fechaInicio: nunca devuelve 0 ni valores negativos.
 */
export function grupoParaFecha(params: {
  fechaInicio: string;
  cantidadGrupos: number;
  fecha: string;
}): number {
  const { fechaInicio, cantidadGrupos, fecha } = params;
  const [iY, iM, iD] = fechaInicio.split('-').map(Number);
  const [fY, fM, fD] = fecha.split('-').map(Number);
  const diasDiff = Math.round((Date.UTC(fY, fM - 1, fD) - Date.UTC(iY, iM - 1, iD)) / 86400000);
  return (((diasDiff % cantidadGrupos) + cantidadGrupos) % cantidadGrupos) + 1;
}
