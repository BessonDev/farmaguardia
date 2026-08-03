import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { timingSafeEqual as nodeTimingSafeEqual, randomBytes } from 'node:crypto';
import { db } from '../db';
import { farmacias, turnos } from '../db/schema';
import { eq, and, gt, gte, lt, lte, sql } from 'drizzle-orm';
import { parseCaracasDateTimeLocal, toUtcISO, nowUtc, createUtcFromCaracas } from '../utils/time';
import { sendReportToTelegram, testTelegramConnection, isTelegramConfigured } from '../utils/telegram';
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
  // Prioriza process.env (runtime) porque Astro hornea import.meta.env en build time.
  // En Dokploy el .env no está versionado, así que el valor real llega por runtime.
  return process.env.ADMIN_PASSWORD ?? (import.meta as { env?: Record<string, string | undefined> }).env?.ADMIN_PASSWORD;
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
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'ADMIN_PASSWORD no configurado en el servidor' });
      }
      if (!timingSafeEqual(input.password, envPassword)) {
        throw new ActionError({ code: 'UNAUTHORIZED', message: 'Contraseña incorrecta' });
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
      sector: z.string().nullable().optional(),
      telefono: z.string().nullable().optional(),
      whatsapp: z.string().nullable().optional(),
      imagenUrl: z.string().nullable().optional(),
      latitud: z.string().nullable().optional(),
      longitud: z.string().nullable().optional(),
      delivery: z.string().optional(),
      activa: z.string().optional(),
    }),
    handler: async (input) => {
      await db.insert(farmacias).values({
        nombre: input.nombre,
        direccion: input.direccion,
        sector: input.sector || 'Centro',
        telefono: input.telefono || null,
        whatsapp: input.whatsapp || null,
        imagenUrl: input.imagenUrl || null,
        latitud: input.latitud ? Number(input.latitud) : null,
        longitud: input.longitud ? Number(input.longitud) : null,
        delivery: input.delivery === 'on',
        activa: input.activa === 'on',
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
      sector: z.string().nullable().optional(),
      telefono: z.string().nullable().optional(),
      whatsapp: z.string().nullable().optional(),
      imagenUrl: z.string().nullable().optional(),
      latitud: z.string().nullable().optional(),
      longitud: z.string().nullable().optional(),
      delivery: z.string().optional(),
      activa: z.string().optional(),
    }),
    handler: async (input) => {
      await db.update(farmacias).set({
        nombre: input.nombre,
        direccion: input.direccion,
        sector: input.sector || 'Centro',
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
      const buffer = Buffer.from(await input.archivo.arrayBuffer());

      // Detectar formato por magic bytes: XLSX es un ZIP (PK), CSV es texto plano
      const esXlsx = buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;

      let filas: (string | number | boolean | Date | null)[][] = [];

      if (esXlsx) {
        const { readSheet } = await import('read-excel-file/node');
        try {
          filas = await readSheet(buffer);
        } catch {
          throw new ActionError({ code: 'BAD_REQUEST', message: 'No se pudo leer el archivo .xlsx. Verifica que sea un Excel válido.' });
        }
      } else {
        filas = parseCsvClean(buffer.toString('utf-8'));
      }

      if (filas.length < 2) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'El archivo no tiene datos. Usa la plantilla descargable.' });
      }

      const header = filas[0].map(c => String(c).toLowerCase().trim());
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
        throw new ActionError({ code: 'BAD_REQUEST', message: 'El archivo debe tener al menos las columnas "nombre" y "direccion".' });
      }

      // Normaliza celdas de XLSX (booleano/número) y CSV (texto) a verdadero/falso
      function normalizarBooleano(valor: unknown, porDefecto: boolean): boolean {
        if (valor === null || valor === undefined || valor === '') return porDefecto;
        if (typeof valor === 'boolean') return valor;
        if (typeof valor === 'number') return valor !== 0;
        const s = String(valor).trim().toLowerCase();
        if (['si', 'sí', '1', 'true', 'x', 'yes'].includes(s)) return true;
        if (['no', '0', 'false'].includes(s)) return false;
        return porDefecto;
      }

      const filaFarmacias = filas.slice(1);
      const resultados = { creadas: 0, actualizadas: 0, errores: [] as string[] };

      for (let i = 0; i < filaFarmacias.length; i++) {
        const f = filaFarmacias[i];
        const nombre = f[col.nombre] != null ? String(f[col.nombre]).trim() : '';
        if (!nombre) {
          resultados.errores.push(`Fila ${i + 2}: nombre vacío`);
          continue;
        }

        const datos = {
          nombre,
          direccion: f[col.direccion] != null ? String(f[col.direccion]) : '',
          sector: col.sector >= 0 && f[col.sector] != null && String(f[col.sector]) !== '' ? String(f[col.sector]) : 'Centro',
          telefono: col.telefono >= 0 && f[col.telefono] != null && String(f[col.telefono]) !== '' ? String(f[col.telefono]) : null,
          whatsapp: col.whatsapp >= 0 && f[col.whatsapp] != null && String(f[col.whatsapp]) !== '' ? String(f[col.whatsapp]) : null,
          latitud: col.latitud >= 0 && f[col.latitud] != null && String(f[col.latitud]) !== '' ? Number(f[col.latitud]) : null,
          longitud: col.longitud >= 0 && f[col.longitud] != null && String(f[col.longitud]) !== '' ? Number(f[col.longitud]) : null,
          delivery: col.delivery >= 0 ? normalizarBooleano(f[col.delivery], false) : false,
          activa: col.activa >= 0 ? normalizarBooleano(f[col.activa], true) : true,
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
      notas: z.string().nullable().optional(),
    }),
    handler: async (input) => {
      const inicio = parseCaracasDateTimeLocal(input.inicio);
      const fin = parseCaracasDateTimeLocal(input.fin);

      if (inicio >= fin) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'La fecha de inicio debe ser anterior a la fecha de fin' });
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
        throw new ActionError({ code: 'CONFLICT', message: 'Solapamiento: ya existe un turno en ese rango de fechas' });
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
      notas: z.string().nullable().optional(),
    }),
    handler: async (input) => {
      const inicio = parseCaracasDateTimeLocal(input.inicio);
      const fin = parseCaracasDateTimeLocal(input.fin);

      if (inicio >= fin) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'La fecha de inicio debe ser anterior a la fecha de fin' });
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
        throw new ActionError({ code: 'CONFLICT', message: 'Solapamiento: ya existe un turno en ese rango de fechas' });
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
      notas: z.string().nullable().optional(),
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
        throw new ActionError({ code: 'BAD_REQUEST', message: 'La fecha de fin debe ser posterior a la fecha de inicio' });
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
        throw new ActionError({ code: 'NOT_FOUND', message: 'No hay un turno activo en este momento para sustituir' });
      }

      if (activo[0].farmaciaId === input.farmaciaId) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'La farmacia de respaldo no puede ser la misma que está de turno' });
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

  // ─── Importar turnos (Excel/CSV) ───
  importarTurnos: defineAction({
    accept: 'form',
    input: z.object({
      archivo: z.instanceof(File),
      sobreescribir: z.string().optional(),
    }),
    handler: async (input) => {
      const buffer = Buffer.from(await input.archivo.arrayBuffer());

      // Detectar formato por magic bytes: XLSX es un ZIP (PK), CSV es texto plano
      const esXlsx = buffer.length > 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;

      let filas: (string | number | boolean | Date | null)[][] = [];

      if (esXlsx) {
        const { readSheet } = await import('read-excel-file/node');
        try {
          filas = await readSheet(buffer);
        } catch {
          throw new ActionError({ code: 'BAD_REQUEST', message: 'No se pudo leer el archivo .xlsx. Verifica que sea un Excel válido.' });
        }
      } else {
        filas = parseCsvClean(buffer.toString('utf-8'));
      }

      if (filas.length < 2) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'El archivo no tiene datos. Usa la plantilla descargable.' });
      }

      const header = filas[0].map(c => String(c).toLowerCase().trim());
      const col = {
        farmacia: header.indexOf('farmacia'),
        fecha: header.indexOf('fecha'),
        inicio: header.indexOf('hora_inicio') >= 0 ? header.indexOf('hora_inicio') : header.indexOf('inicio'),
        fin: header.indexOf('hora_fin') >= 0 ? header.indexOf('hora_fin') : header.indexOf('fin'),
        notas: header.indexOf('notas'),
      };

      if (col.farmacia === -1 || col.fecha === -1 || col.inicio === -1 || col.fin === -1) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'El archivo debe tener al menos las columnas "farmacia", "fecha", "hora_inicio" y "hora_fin".' });
      }

      // Mapa de farmacias por nombre para resolución
      const catalogo = await db.select({ id: farmacias.id, nombre: farmacias.nombre }).from(farmacias);
      const porNombre = new Map(catalogo.map(f => [f.nombre.trim().toLowerCase(), f.id]));

      // Helpers de normalización
      function extraerFecha(celda: unknown): { year: number; month: number; day: number } | null {
        if (celda instanceof Date && !isNaN(celda.getTime())) {
          return { year: celda.getUTCFullYear(), month: celda.getUTCMonth() + 1, day: celda.getUTCDate() };
        }
        if (typeof celda === 'string') {
          const s = celda.trim();
          // YYYY-MM-DD
          let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
          // DD/MM/YYYY o DD-MM-YYYY
          m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
          if (m) return { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
        }
        return null;
      }

      function extraerHora(celda: unknown): { hours: number; minutes: number } | null {
        if (celda instanceof Date && !isNaN(celda.getTime())) {
          return { hours: celda.getUTCHours(), minutes: celda.getUTCMinutes() };
        }
        if (typeof celda === 'number') {
          // Serial de Excel: fracción del día
          const horas = celda * 24;
          const h = Math.floor(horas);
          const m = Math.round((horas - h) * 60) % 60;
          return { hours: h, minutes: m };
        }
        if (typeof celda === 'string') {
          const s = celda.trim().toLowerCase();
          const match = s.match(/^(\d{1,2}):(\d{2})/);
          if (!match) return null;
          let hours = Number(match[1]);
          const minutes = Number(match[2]);
          if (s.includes('pm') && hours < 12) hours += 12;
          if (s.includes('am') && hours === 12) hours = 0;
          return { hours, minutes };
        }
        return null;
      }

      const resultados = { creados: 0, actualizados: 0, omitidos: 0, errores: [] as string[] };

      for (let i = 1; i < filas.length; i++) {
        const f = filas[i];
        const nombre = col.farmacia >= 0 && f[col.farmacia] != null ? String(f[col.farmacia]).trim() : '';
        const numFila = i + 1;

        if (!nombre) {
          resultados.errores.push(`Fila ${numFila}: farmacia vacía`);
          continue;
        }

        const farmaciaId = porNombre.get(nombre.toLowerCase());
        if (!farmaciaId) {
          resultados.errores.push(`Fila ${numFila}: no existe la farmacia "${nombre}"`);
          continue;
        }

        const fecha = extraerFecha(f[col.fecha]);
        const horaInicio = extraerHora(f[col.inicio]);
        const horaFin = extraerHora(f[col.fin]);

        if (!fecha || !horaInicio || !horaFin) {
          resultados.errores.push(`Fila ${numFila}: fecha u hora inválida (usa AAAA-MM-DD y HH:MM)`);
          continue;
        }

        const notas = col.notas >= 0 && f[col.notas] != null ? String(f[col.notas]).trim() : '';

        // Si fin <= inicio, el turno cruza a la mañana siguiente (ej 08:00 → 08:00)
        const finSiguiente =
          horaFin.hours < horaInicio.hours ||
          (horaFin.hours === horaInicio.hours && horaFin.minutes <= horaInicio.minutes);

        const inicioISO = toUtcISO(createUtcFromCaracas(fecha.year, fecha.month, fecha.day, horaInicio.hours, horaInicio.minutes));
        const finISO = toUtcISO(createUtcFromCaracas(
          fecha.year,
          fecha.month,
          fecha.day + (finSiguiente ? 1 : 0),
          horaFin.hours,
          horaFin.minutes
        ));

        // Solapamiento por farmacia (misma lógica que crearTurno)
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
          // Con "sobreescribir": reemplazar el turno que empieza igual
          const mismoInicio = await db
            .select({ id: turnos.id })
            .from(turnos)
            .where(and(
              eq(turnos.farmaciaId, farmaciaId),
              eq(turnos.inicio, inicioISO)
            ))
            .limit(1);

          if (input.sobreescribir && mismoInicio.length > 0) {
            await db.update(turnos).set({ fin: finISO, notas: notas || null }).where(eq(turnos.id, mismoInicio[0].id));
            resultados.actualizados++;
          } else {
            resultados.omitidos++;
            resultados.errores.push(`Fila ${numFila}: "${nombre}" solapa con un turno existente${input.sobreescribir ? '' : ' (usa "sobreescribir" para reemplazar)'}`);
          }
        } else {
          await db.insert(turnos).values({
            farmaciaId,
            inicio: inicioISO,
            fin: finISO,
            notas: notas || null,
          });
          resultados.creados++;
        }
      }

      return { ok: true, ...resultados };
    },
  }),

  // ─── Test de Telegram ───
  testTelegram: defineAction({
    accept: 'form',
    handler: async () => {
      if (!isTelegramConfigured()) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Telegram no está configurado: faltan TELEGRAM_BOT_TOKEN y/o TELEGRAM_CHAT_ID en .env' });
      }
      try {
        const res = await testTelegramConnection();
        if (res.ok) {
          return { ok: true };
        }
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: `El bot respondió con error: ${res.description || 'desconocido'}` });
      } catch (e) {
        if (e instanceof ActionError) throw e;
        console.error('Error en test de Telegram:', e);
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: `Error enviando mensaje: ${String(e)}` });
      }
    },
  }),
};
