import { fechaCaracasHoy, grupoParaFecha } from '../src/utils/grupos.ts';

const FECHA_INICIO = '2026-09-09';
const N = 9;

let fallos = 0;
function check(nombre: string, ok: boolean, detalle = '') {
  console.log(`${nombre.padEnd(28)}: ${ok ? 'OK' : 'FAIL'}${detalle ? ` (${detalle})` : ''}`);
  if (!ok) fallos++;
}

const grupo = (fecha: string) => grupoParaFecha({ fechaInicio: FECHA_INICIO, cantidadGrupos: N, fecha });

// 1) El día de inicio es el grupo 1
check('inicio -> grupo 1', grupo('2026-09-09') === 1, `-> ${grupo('2026-09-09')}`);

// 2) Casos del reporte: hoy corresponde al 7, no al 8
check('12-10 -> grupo 7', grupo('2026-10-12') === 7, `-> ${grupo('2026-10-12')}`);
check('13-10 -> grupo 8', grupo('2026-10-13') === 8, `-> ${grupo('2026-10-13')}`);

// 3) Ciclo completo: N días consecutivos reparten 1..N sin repetir
const ciclo = Array.from({ length: N }, (_, i) => grupo(`2026-09-${String(9 + i).padStart(2, '0')}`));
check('ciclo 1..9 sin repetir', new Set(ciclo).size === N && ciclo[0] === 1 && ciclo[N - 1] === N, ciclo.join(','));

// 4) Fecha anterior al inicio: módulo seguro, nunca 0 ni negativo
const antes = grupo('2026-09-08');
check('fecha previa valida 1..N', antes >= 1 && antes <= N, `-> ${antes}`);
const muyAntes = grupo('2020-01-01');
check('fecha muy previa 1..N', muyAntes >= 1 && muyAntes <= N, `-> ${muyAntes}`);

// 5) Frontera: el dia cambia a las 00:00 Caracas (04:00 UTC), no a las 20:00
check('13-10 03:59Z -> 12-10', fechaCaracasHoy(new Date('2026-10-13T03:59:00Z')) === '2026-10-12', fechaCaracasHoy(new Date('2026-10-13T03:59:00Z')));
check('13-10 04:00Z -> 13-10', fechaCaracasHoy(new Date('2026-10-13T04:00:00Z')) === '2026-10-13', fechaCaracasHoy(new Date('2026-10-13T04:00:00Z')));

// 5b) El bug viejo: 21:00 Caracas del 12-10 (01:00Z del 13) debe dar grupo 7, no 8
const noche12 = fechaCaracasHoy(new Date('2026-10-13T01:00:00Z'));
check('12-10 21:00 Caracas -> 7', grupo(noche12) === 7, `${noche12} -> ${grupo(noche12)}`);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exitCode = fallos === 0 ? 0 : 1;
