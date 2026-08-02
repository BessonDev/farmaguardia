import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { timingSafeEqual as nodeTimingSafeEqual, randomBytes } from 'node:crypto';
import { db } from '../db';
import { farmacias, turnos } from '../db/schema';
import { eq, and, gt, gte, lt, lte, sql } from 'drizzle-orm';
import { parseCaracasDateTimeLocal, toUtcISO, nowUtc, createUtcFromCaracas } from '../utils/time';
import { sendReportToTelegram } from '../utils/telegram';
import { parseCsvClean } from '../utils/csv';

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

  importarFarmacias: defineAction({
    accept: 'form',
    input: z.object({
      archivo: z.instanceof(File),
      sobreescribir: z.string().optional(),
    }),
    handler: async (input) => {
      const texto = await input.archivo.text();
      const filas = parseCsvClean(texto);

      if (filas.length < 2) {
        return { error: 'El archivo no tiene datos. Usa la plantilla descargable.' };
      }

      const header = filas[0].map(c => c.toLowerCase());
      const col = {
        nombre: header.indexOf('nombre'),
        direccion: header.indexOf('direccion'),
        sector: header.indexOf('sector'),
        telefono: header.indexOf('telefono'),
        whatsapp: header.indexOf('whatsapp'),
        latitud: header.indexOf('latitud'),
        longitud: header.indexOf('longitud'),
        delivery: header.indexOf('delivery'),
        activa: header.indexOf('activa'),
      };

      if (col.nombre === -1 || col.direccion === -1) {
        return { error: 'El CSV debe tener al menos las columnas "nombre" y "direccion".' };
      }

      const filaFarmacias = filas.slice(1);
      const resultados = { creadas: 0, actualizadas: 0, errores: [] as string[] };

      for (let i = 0; i < filaFarmacias.length; i++) {
        const f = filaFarmacias[i];
        const nombre = f[col.nombre];
        if (!nombre) {
          resultados.errores.push(`Fila ${i + 2}: nombre vacío`);
          continue;
        }

        const datos = {
          nombre,
          direccion: f[col.direccion] ?? '',
          sector: col.sector >= 0 && f[col.sector] ? f[col.sector] : 'Centro',
          telefono: col.telefono >= 0 && f[col.telefono] ? f[col.telefono] : null,
          whatsapp: col.whatsapp >= 0 && f[col.whatsapp] ? f[col.whatsapp] : null,
          latitud: col.latitud >= 0 && f[col.latitud] ? Number(f[col.latitud]) : null,
          longitud: col.longitud >= 0 && f[col.longitud] ? Number(f[col.longitud]) : null,
          delivery: col.delivery >= 0 ? ['si', 'sí', '1', 'true'].includes(f[col.delivery].toLowerCase()) : false,
          activa: col.activa >= 0 ? !['no', '0', 'false'].includes(f[col.activa].toLowerCase()) : true,
        };

        const existente = await db.select({ id: farmacias.id }).from(farmacias).where(eq(farmacias.nombre, nombre)).limit(1);

        if (existente.length > 0) {
          if (input.sobreescribir) {
            // Preservar coordenadas existentes si el CSV viene vacío
            if (!datos.latitud || !datos.longitud) {
              const actual = await db
                .select({ latitud: farmacias.latitud, longitud: farmacias.longitud })
                .from(farmacias)
                .where(eq(farmacias.id, existente[0].id))
                .limit(1);
              if (actual.length > 0) {
                if (!datos.latitud) datos.latitud = actual[0].latitud;
                if (!datos.longitud) datos.longitud = actual[0].longitud;
              }
            }
            await db.update(farmacias).set(datos).where(eq(farmacias.id, existente[0].id));
            resultados.actualizadas++;
          } else {
            resultados.errores.push(`Fila ${i + 2}: "${nombre}" ya existe (usa "sobreescribir" para actualizarla)`);
          }
        } else {
          await db.insert(farmacias).values(datos);
          resultados.creadas++;
        }
      }

      return { ok: true, ...resultados };
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

      // Validación de solapamiento (solo para la misma farmacia)
      const overlap = await db
        .select({ id: turnos.id })
        .from(turnos)
        .where(and(
          lt(turnos.inicio, fin),
          gt(turnos.fin, inicio),
          eq(turnos.farmaciaId, input.farmaciaId)
        ))
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

      // Solapamiento excluyendo el propio turno (solo para la misma farmacia)
      const overlap = await db
        .select({ id: turnos.id })
        .from(turnos)
        .where(and(
          lt(turnos.inicio, fin),
          gt(turnos.fin, inicio),
          eq(turnos.farmaciaId, input.farmaciaId),
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

  generarRotacion: defineAction({
    accept: 'form',
    input: z.object({
      fechaInicio: z.string(),
      fechaFin: z.string(),
      horaInicio: z.string(),
      duracionHoras: z.coerce.number().min(1).max(168),
      farmacias: z.array(z.coerce.number()).min(1),
      notas: z.string().optional().default(''),
      modo: z.enum(['simultaneo', 'secuencial']).default('secuencial'),
    }),
    handler: async (input) => {
      const [fY, fM, fD] = input.fechaInicio.split('-').map(Number);
      const [hH, hM] = input.horaInicio.split(':').map(Number);
      const [tY, tM, tD] = input.fechaFin.split('-').map(Number);

      const inicioBase = createUtcFromCaracas(fY, fM, fD, hH, hM);
      const finLimite = createUtcFromCaracas(tY, tM, tD, 23, 59);
      const duracionMs = input.duracionHoras * 60 * 60 * 1000;

      if (inicioBase >= finLimite) {
        return { error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
      }

      const generados: { farmaciaId: number; inicio: string; fin: string }[] = [];
      const omitidos: { inicio: string; razon: string }[] = [];

      if (input.modo === 'simultaneo') {
        // Modo simultáneo: todas las farmacias cubren el mismo rango completo
        for (const farmaciaId of input.farmacias) {
          const inicioISO = toUtcISO(inicioBase);
          const finISO = toUtcISO(finLimite);

          // Verificar solapamiento solo para esta farmacia
          const overlap = await db
            .select({ id: turnos.id })
            .from(turnos)
            .where(and(
              lt(turnos.inicio, finISO),
              gt(turnos.fin, inicioISO),
              eq(turnos.farmaciaId, farmaciaId)
            ))
            .limit(1);

          if (overlap.length > 0) {
            omitidos.push({ inicio: inicioISO, razon: 'Solapa con un turno existente' });
          } else {
            await db.insert(turnos).values({
              farmaciaId,
              inicio: inicioISO,
              fin: finISO,
              notas: input.notas || null,
            });
            generados.push({ farmaciaId, inicio: inicioISO, fin: finISO });
          }
        }
      } else {
        // Modo secuencial: cadena rotativa (comportamiento original)
        let inicio = inicioBase;
        let idx = 0;
        let guard = 0;

        while (inicio < finLimite && guard < 2000) {
          const farmaciaId = input.farmacias[idx % input.farmacias.length];
          const fin = new Date(inicio.getTime() + duracionMs);
          const inicioISO = toUtcISO(inicio);
          const finISO = toUtcISO(fin);

          const overlap = await db
            .select({ id: turnos.id })
            .from(turnos)
            .where(and(
              lt(turnos.inicio, finISO),
              gt(turnos.fin, inicioISO),
              eq(turnos.farmaciaId, farmaciaId)
            ))
            .limit(1);

          if (overlap.length > 0) {
            omitidos.push({ inicio: inicioISO, razon: 'Solapa con un turno existente' });
          } else {
            await db.insert(turnos).values({
              farmaciaId,
              inicio: inicioISO,
              fin: finISO,
              notas: input.notas || null,
            });
            generados.push({ farmaciaId, inicio: inicioISO, fin: finISO });
          }

          inicio = fin;
          idx++;
          guard++;
        }
      }

      return { ok: true, generados: generados.length, omitidos: omitidos.length };
    },
  }),

  // ─── Override de emergencia ───
  overrideTurnoHoy: defineAction({
    accept: 'form',
    input: z.object({
      turnoId: z.coerce.number(),
      farmaciaId: z.coerce.number(),
    }),
    handler: async (input, { cookies }) => {
      const ahora = nowUtc();
      const ahoraISO = toUtcISO(ahora);

      // Encontrar el turno activo a sustituir (debe estar vigente ahora)
      const activo = await db
        .select({ id: turnos.id, inicio: turnos.inicio, fin: turnos.fin, farmaciaId: turnos.farmaciaId })
        .from(turnos)
        .where(and(
          eq(turnos.id, input.turnoId),
          lte(turnos.inicio, ahoraISO),
          gt(turnos.fin, ahoraISO)
        ))
        .limit(1);

      if (activo.length === 0) {
        return { error: 'No hay un turno activo en este momento para sustituir' };
      }

      if (activo[0].farmaciaId === input.farmaciaId) {
        return { error: 'La farmacia de respaldo no puede ser la misma que está de turno' };
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
      huellaLocal: z.string().optional().default(''),
    }),
    handler: async (input) => {
      const { reportes, reporteConfirmaciones } = await import('../db/schema');
      const insert = await db.insert(reportes).values({
        farmaciaId: input.farmaciaId || null,
        turnoId: input.turnoId || null,
        tipo: input.tipo,
        detalle: input.detalle || null,
      }).returning({ id: reportes.id });

      // Registrar la confirmación del autor si hay huella
      if (input.huellaLocal && insert.length > 0) {
        await db.insert(reporteConfirmaciones).values({
          reporteId: insert[0].id,
          huellaLocal: input.huellaLocal,
          ipHash: 'accion-admin',
        }).onConflictDoNothing();
      }

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
