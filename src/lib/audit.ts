import { db } from '~/db/client';
import { adminLog } from '~/db/schema';

export type AccionAdmin =
  | 'LOGIN_OK'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'FARMACIA_CREAR'
  | 'FARMACIA_EDITAR'
  | 'FARMACIA_TOGGLE'
  | 'TURNO_CREAR'
  | 'TURNO_BORRAR'
  | 'OVERRIDE_CREAR'
  | 'OVERRIDE_BORRAR'
  | 'PLANTILLA_CREAR'
  | 'PLANTILLA_GENERAR'
  | 'CSV_IMPORT';

export function log(accion: AccionAdmin, payload?: Record<string, unknown>): void {
  db.insert(adminLog)
    .values({
      accion,
      payload: payload ? JSON.stringify(payload) : null,
    })
    .run();
}