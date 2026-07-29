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
  | 'PLANTILLA_APLICAR'
  | 'PLANTILLA_BORRAR'
  | 'CSV_IMPORT'
  | 'CHANGE_PASSWORD_OK'
  | 'CHANGE_PASSWORD_FAIL'
  | 'CHANGE_PASSWORD_ERROR';

export function log(accion: AccionAdmin, payload?: Record<string, unknown>): void {
  db.insert(adminLog)
    .values({
      accion,
      payload: payload ? JSON.stringify(payload) : null,
    })
    .run();
}