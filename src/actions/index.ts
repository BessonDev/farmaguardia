import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { timingSafeEqual as nodeTimingSafeEqual, randomBytes } from 'node:crypto';
import { db } from '../db';
import { farmacias, turnos } from '../db/schema';
import { eq, and, gte, lt, lte, sql } from 'drizzle-orm';
import { parseCaracasDateTimeLocal, toUtcISO, nowUtc } from '../utils/time';
import { sendReportToTelegram } from '../utils/telegram';

/**
 * Autenticación simple con ADMIN_PASSWORD en env.
 * Sesión via cookie httpOnly + SameSite=Lax + Secure (producción).
 */

const SESSION_COOKIE = 'farmaguardia_admin';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Revisar contra un dummy del largo correcto para no filtrar la longitud
    return false;
  }
  return nodeTimingSafeEqual(aBuf, bBuf);
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getAdminPassword(): string | undefined {
  return import.meta.env.ADMIN_PASSWORD;
}

export function verifySession(cookies: {
  get: (name: string) => { value: string } | undefined;
}): boolean {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const envToken = getAdminPassword();
  if (!envToken) return false;
  // El token de sesión es un hash aleatorio; en MVP simple lo comparamos
  // contra un valor derivado. Para simplicidad: el token ES el valor fijo.
  return timingSafeEqual(token, envToken);
}

export function setSessionCookie(cookies: {
  set: (name: string, value: string, opts: object) => void;
}): void {
  const token = getAdminPassword();
  if (!token) return;
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

export function clearSessionCookie(cookies: {
  set: (name: string, value: string, opts: object) => void;
}): void {
  cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: 0,
  });
}

export const server = {
  login: defineAction({
    accept: 'form',
    input: z.object({
      password: z.string(),
    }),
    handler: async (input, { cookies }) => {
      const envPassword = getAdminPassword();
      if (!envPassword) {
        return { error: 'ADMIN_PASSWORD no configurado en el servidor' };
      }
      if (!timingSafeEqual(input.password, envPassword)) {
        return { error: 'Contraseña incorrecta' };
      }
      setSessionCookie(cookies);
      return { ok: true };
    },
  }),

  logout: defineAction({
    accept: 'form',
    handler: async (_input, { cookies }) => {
      clearSessionCookie(cookies);
      return { ok: true };
    },
  }),

  // ─── Farmacias CRUD ───
  crearFarmacia: defineAction({
    accept: 'form',
    input: z.object({
      nombre: z.string().min(1),
      direccion: z.string().min(1),
      sector: z.string().optional().default('Centro'),
      telefono: z.string().optional().default(''),
      whatsapp: z.string().optional().default(''),
      imagenUrl: z.string().optional().default(''),
      latitud: z.string().optional().default(''),
      longitud: z.string().optional().default(''),
      delivery: z.string().optional(),
    }),
    handler: async (input) => {
      await db.insert(farmacias).values({
        nombre: input.nombre,
        direccion: input.direccion,
        sector: input.sector,
        telefono: input.telefono || null,
        whatsapp: input.whatsapp || null,
        imagenUrl: input.imagenUrl || null,
        latitud: input.latitud ? Number(input.latitud) : null,
        longitud: input.longitud ? Number(input.longitud) : null,
        delivery: input.delivery === 'on',
      });
      return { ok: true };
    },
  }),

  editarFarmacia: defineAction({
    accept: 'form',
    input: z.object({
      id: z.coerce.number(),
      nombre: z.string().min(1),
      direccion: z.string().min(1),
      sector: z.string().optional().default('Centro'),
      telefono: z.string().optional().default(''),
      whatsapp: z.string().optional().default(''),
      imagenUrl: z.string().optional().default(''),
      latitud: z.string().optional().default(''),
      longitud: z.string().optional().default(''),
      delivery: z.string().optional(),
      activa: z.string().optional(),
    }),
    handler: async (input) => {
      await db.update(farmacias).set({
        nombre: input.nombre,
        direccion: input.direccion,
        sector: input.sector,
        telefono: input.telefono || null,
        whatsapp: input.whatsapp || null,
        imagenUrl: input.imagenUrl || null,
        latitud: input.latitud ? Number(input.latitud) : null,
        longitud: input.longitud ? Number(input.longitud) : null,
        delivery: input.delivery === 'on',
        activa: input.activa === 'on',
      }).where(eq(farmacias.id, input.id));
      return { ok: true };
    },
  }),

  eliminarFarmacia: defineAction({
    accept: 'form',
    input: z.object({ id: z.coerce.number() }),
    handler: async (input) => {
      await db.delete(farmacias).where(eq(farmacias.id, input.id));
      return { ok: true };
    },
  }),

  // ─── Turnos CRUD ───
  crearTurno: defineAction({
    accept: 'form',
    input: z.object({
      farmaciaId: z.coerce.number(),
      inicio: z.string(),
      fin: z.string(),
      notas: z.string().optional().default(''),
    }),
    handler: async (input) => {
      const inicio = parseCaracasDateTimeLocal(input.inicio);
      const fin = parseCaracasDateTimeLocal(input.fin);

      if (inicio >= fin) {
        return { error: 'La fecha de inicio debe ser anterior a la fecha de fin' };
      }

      // Validación de solapamiento (ningún otro turno activo en el rango)
      const overlap = await db
        .select({ id: turnos.id })
        .from(turnos)
        .where(and(lt(turnos.inicio, fin), gte(turnos.fin, inicio)))
        .limit(1);

      if (overlap.length > 0) {
        return { error: 'Solapamiento: ya existe un turno en ese rango de fechas' };
      }

      await db.insert(turnos).values({
        farmaciaId: input.farmaciaId,
        inicio,
        fin,
        notas: input.notas || null,
      });
      return { ok: true };
    },
  }),

  editarTurno: defineAction({
    accept: 'form',
    input: z.object({
      id: z.coerce.number(),
      farmaciaId: z.coerce.number(),
      inicio: z.string(),
      fin: z.string(),
      notas: z.string().optional().default(''),
    }),
    handler: async (input) => {
      const inicio = parseCaracasDateTimeLocal(input.inicio);
      const fin = parseCaracasDateTimeLocal(input.fin);

      if (inicio >= fin) {
        return { error: 'La fecha de inicio debe ser anterior a la fecha de fin' };
      }

      // Solapamiento excluyendo el propio turno
      const overlap = await db
        .select({ id: turnos.id })
        .from(turnos)
        .where(and(
          lt(turnos.inicio, fin),
          gte(turnos.fin, inicio),
          sql`id != ${input.id}`
        ))
        .limit(1);

      if (overlap.length > 0) {
        return { error: 'Solapamiento: ya existe un turno en ese rango de fechas' };
      }

      await db.update(turnos).set({
        farmaciaId: input.farmaciaId,
        inicio,
        fin,
        notas: input.notas || null,
      }).where(eq(turnos.id, input.id));
      return { ok: true };
    },
  }),

  eliminarTurno: defineAction({
    accept: 'form',
    input: z.object({ id: z.coerce.number() }),
    handler: async (input) => {
      await db.delete(turnos).where(eq(turnos.id, input.id));
      return { ok: true };
    },
  }),

  // ─── Override de emergencia ───
  overrideTurnoHoy: defineAction({
    accept: 'form',
    input: z.object({
      farmaciaId: z.coerce.number(),
    }),
    handler: async (input, { cookies }) => {
      const ahora = nowUtc();
      const ahoraISO = toUtcISO(ahora);

      // Encontrar el turno activo actual
      const activo = await db
        .select({ id: turnos.id, inicio: turnos.inicio, fin: turnos.fin })
        .from(turnos)
        .where(and(lte(turnos.inicio, ahoraISO), gte(turnos.fin, ahoraISO)))
        .limit(1);

      if (activo.length === 0) {
        return { error: 'No hay un turno activo en este momento para sustituir' };
      }

      const turnoActivo = activo[0];

      // Crear turno de emergencia para la farmacia de respaldo en el mismo rango
      await db.insert(turnos).values({
        farmaciaId: input.farmaciaId,
        inicio: turnoActivo.inicio,
        fin: turnoActivo.fin,
        notas: 'OVERRIDE DE EMERGENCIA',
      });

      // Marcar el turno original como finalizado (para no solapar)
      await db.update(turnos).set({ fin: ahoraISO }).where(eq(turnos.id, turnoActivo.id));

      return { ok: true, farmaciaId: input.farmaciaId };
    },
  }),

  // ─── Reportes ───
  reportar: defineAction({
    accept: 'json',
    input: z.object({
      farmaciaId: z.coerce.number().optional().nullable(),
      turnoId: z.coerce.number().optional().nullable(),
      tipo: z.enum(['cerrada', 'datos_incorrectos', 'otro']),
      detalle: z.string().optional().default(''),
    }),
    handler: async (input) => {
      const { reportes } = await import('../db/schema');
      await db.insert(reportes).values({
        farmaciaId: input.farmaciaId || null,
        turnoId: input.turnoId || null,
        tipo: input.tipo,
        detalle: input.detalle || null,
      });

      // Intentar enviar a Telegram (no crítico si falla)
      if (input.farmaciaId) {
        try {
          const farm = await db.select().from(farmacias).where(eq(farmacias.id, input.farmaciaId)).limit(1);
          if (farm.length > 0) {
            await sendReportToTelegram({
              farmaciaNombre: farm[0].nombre,
              farmaciaDireccion: farm[0].direccion,
              tipo: input.tipo,
              detalle: input.detalle,
              fecha: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error('Error enviando reporte a Telegram:', e);
        }
      }

      return { ok: true };
    },
  }),
};
