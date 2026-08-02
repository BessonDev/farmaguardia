/**
 * Utilidades de tiempo para FarmaGuardia
 * Zona horaria: America/Caracas (UTC-4 fijo, sin DST desde 2016)
 */

const CARACAS_OFFSET_HOURS = -4;

/**
 * Convierte una fecha UTC a hora local de Caracas (UTC-4)
 */
export function utcToCaracas(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() + CARACAS_OFFSET_HOURS);
  return result;
}

/**
 * Convierte una fecha local de Caracas a UTC
 */
export function caracasToUtc(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() - CARACAS_OFFSET_HOURS);
  return result;
}

/**
 * Obtiene la hora actual en UTC
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Obtiene la hora actual en Caracas
 */
export function nowCaracas(): Date {
  return utcToCaracas(nowUtc());
}

/**
 * Formatea una fecha UTC como string ISO UTC (YYYY-MM-DDTHH:MM:SSZ)
 * Para almacenar en la base de datos
 */
export function toUtcISO(date: Date): string {
  return date.toISOString();
}

/**
 * Parsea un string ISO UTC a Date
 */
export function parseUtcISO(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Formatea una fecha para mostrar en la UI (hora Caracas, formato 12h)
 * Ej: "01/08/2026 08:00 AM"
 */
export function formatCaracasDateTime(date: Date): string {
  const caracasDate = utcToCaracas(date);
  return caracasDate
    .toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC', // ya está convertido
    })
    .replace('a. m.', 'AM')
    .replace('p. m.', 'PM');
}

/**
 * Formatea solo la hora para mostrar (hora Caracas, formato 12h)
 * Ej: "08:00 AM"
 */
export function formatCaracasTime(date: Date): string {
  const caracasDate = utcToCaracas(date);
  return caracasDate
    .toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    })
    .replace('a. m.', 'AM')
    .replace('p. m.', 'PM');
}

/**
 * Formatea solo la fecha para mostrar (hora Caracas)
 * Ej: "01/08/2026"
 */
export function formatCaracasDate(date: Date): string {
  const caracasDate = utcToCaracas(date);
  return caracasDate.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Formatea la fecha completa en español (hora Caracas)
 * Ej: "sábado, 1 de agosto de 2026" (los "de" en minúscula)
 */
export function formatCaracasFullDate(date: Date): string {
  const caracasDate = utcToCaracas(date);
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dias[caracasDate.getUTCDay()]}, ${caracasDate.getUTCDate()} de ${meses[caracasDate.getUTCMonth()]} de ${caracasDate.getUTCFullYear()}`;
}

/**
 * Crea una fecha UTC a partir de componentes de hora local Caracas
 * Útil para el panel admin: el usuario elige "2026-08-01 08:00" en Caracas
 * y esto lo convierte a UTC para guardar
 */
export function createUtcFromCaracas(
  year: number,
  month: number, // 1-12
  day: number,
  hours: number,
  minutes: number = 0
): Date {
  // Crear fecha en UTC con la hora de Caracas, luego ajustar
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  return caracasToUtc(date);
}

/**
 * Parsea un string datetime-local (YYYY-MM-DDTHH:MM) como hora Caracas
 * y lo convierte a UTC ISO string para guardar
 */
export function parseCaracasDateTimeLocal(localString: string): string {
  // localString: "2026-08-01T08:00"
  const [datePart, timePart] = localString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const utcDate = createUtcFromCaracas(year, month, day, hours, minutes);
  return toUtcISO(utcDate);
}

/**
 * Convierte UTC ISO string a formato datetime-local para inputs HTML
 * (para que el panel admin muestre la hora en Caracas)
 */
export function toCaracasDateTimeLocal(utcISOString: string): string {
  const date = parseUtcISO(utcISOString);
  const caracasDate = utcToCaracas(date);
  // Formato YYYY-MM-DDTHH:MM
  const year = caracasDate.getUTCFullYear();
  const month = String(caracasDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(caracasDate.getUTCDate()).padStart(2, '0');
  const hours = String(caracasDate.getUTCHours()).padStart(2, '0');
  const minutes = String(caracasDate.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Verifica si una fecha UTC está en el pasado (comparando con ahora UTC)
 */
export function isPast(utcISOString: string): boolean {
  return parseUtcISO(utcISOString) < nowUtc();
}

/**
 * Verifica si una fecha UTC está en el futuro
 */
export function isFuture(utcISOString: string): boolean {
  return parseUtcISO(utcISOString) > nowUtc();
}

/**
 * Obtiene el rango de la semana actual (lunes a domingo) en UTC
 * Retorna { inicioSemana, finSemana } como strings ISO UTC
 */
export function getCurrentWeekRange(): { inicioSemana: string; finSemana: string } {
  const now = nowUtc();
  const dayOfWeek = now.getUTCDay(); // 0 = domingo
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const inicioSemana = new Date(now);
  inicioSemana.setUTCDate(now.getUTCDate() + diffToMonday);
  inicioSemana.setUTCHours(0, 0, 0, 0);
  
  const finSemana = new Date(inicioSemana);
  finSemana.setUTCDate(inicioSemana.getUTCDate() + 6);
  finSemana.setUTCHours(23, 59, 59, 999);
  
  return {
    inicioSemana: toUtcISO(inicioSemana),
    finSemana: toUtcISO(finSemana),
  };
}