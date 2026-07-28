import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, addHours, addDays, parseISO } from 'date-fns';

export const TZ_CARACAS = 'America/Caracas';
export const UTC_OFFSET_CARACAS = '-04:00';

/**
 * Convierte un instante UTC a su representación en hora de Caracas.
 * El server corre en UTC, pero la UI muestra hora local VE.
 */
export function utcToCaracas(utcIso: string | Date): Date {
  return toZonedTime(utcIso, TZ_CARACAS);
}

/**
 * Convierte una fecha/hora local de Caracas a UTC para guardar en DB.
 * Ej: turno a las "08:00 AM del 2026-07-28 en Puerto Ayacucho" → UTC.
 */
export function caracasToUtc(localIso: string): string {
  return fromZonedTime(localIso, TZ_CARACAS).toISOString();
}

/**
 * Formatea un instante UTC como "8:00 AM" en hora VE.
 * Para mostrar al usuario.
 */
export function formatHoraCaracas(utcIso: string | Date): string {
  return formatInTimeZone(utcIso, TZ_CARACAS, 'h:mm a');
}

/**
 * Formatea un instante UTC como "martes 28 de julio" en hora VE.
 */
export function formatFechaCortaCaracas(utcIso: string | Date): string {
  return formatInTimeZone(utcIso, TZ_CARACAS, "EEEE d 'de' MMMM");
}

/**
 * Formatea un instante UTC como "lun 28 jul" en hora VE (compacto).
 */
export function formatFechaMiniCaracas(utcIso: string | Date): string {
  return formatInTimeZone(utcIso, TZ_CARACAS, 'EEE d MMM');
}

/**
 * Construye un turno de 24h en UTC partiendo de fecha+hora local VE.
 * Ej: turnoCaracas('2026-07-28', '08:00') → UTC desde 12:00 del 28 hasta 12:00 del 29.
 */
export function turnoCaracas(
  fechaLocal: string,
  horaInicioLocal: string,
  horaFinLocalSiguienteDia = horaInicioLocal,
): { inicioUtc: string; finUtc: string } {
  const inicioUtc = caracasToUtc(`${fechaLocal}T${horaInicioLocal}:00`);
  const finLocal = `${agregarDia(fechaLocal)}T${horaFinLocalSiguienteDia}:00`;
  const finUtc = caracasToUtc(finLocal);
  return { inicioUtc, finUtc };
}

function agregarDia(fecha: string): string {
  const d = parseISO(fecha);
  return format(addDays(d, 1), 'yyyy-MM-dd');
}

export function agregarHorasUtc(utcIso: string, horas: number): string {
  return addHours(parseISO(utcIso), horas).toISOString();
}