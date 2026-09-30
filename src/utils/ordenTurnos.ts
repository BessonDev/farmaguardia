import { utcToCaracas } from './time';

/**
 * Rota una lista de forma determinista según el día calendario de Caracas.
 *
 * El objetivo es que ninguna farmacia quede fijada permanentemente en la
 * primera posición: cada día el orden avanza una posición, de modo que con N
 * farmacias en N días cada una ocupa cada posición exactamente una vez.
 *
 * @param items Lista ya ordenada de forma estable (ej. alfabética por nombre).
 * @param fecha Fecha de referencia. Se convierte a Caracas antes de tomar el
 *              día para que la rotación cambie a medianoche local (UTC-4) y no
 *              a las 20:00.
 * @returns Una nueva lista rotada. No muta la entrada.
 */
export function rotarPorDia<T>(items: T[], fecha: Date): T[] {
  const n = items.length;
  if (n <= 1) return items;

  const dia = Math.floor(utcToCaracas(fecha).getTime() / 86_400_000);
  const offset = ((dia % n) + n) % n;

  return [...items.slice(offset), ...items.slice(0, offset)];
}
