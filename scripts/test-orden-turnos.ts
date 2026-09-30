import { rotarPorDia } from '../src/utils/ordenTurnos.ts';

const base = ['A', 'B', 'C', 'D', 'E'];
const n = base.length;

// 1) Determinismo: misma fecha -> mismo orden, muchas veces
const f = new Date('2026-09-17T15:00:00Z');
const r1 = rotarPorDia(base, f).join('');
let det = true;
for (let i = 0; i < 50; i++) {
  if (rotarPorDia(base, f).join('') !== r1) det = false;
}
console.log('determinista        :', det ? 'OK' : 'FAIL', `(${r1})`);

// 2) No muta la entrada
const copia = [...base];
rotarPorDia(base, f);
console.log('no muta entrada     :', copia.join('') === base.join('') ? 'OK' : 'FAIL');

// 3) Sortedness: cada item ocupa cada posicion exactamente una vez en N dias
const posiciones: Record<string, Set<number>> = {};
let primeraCambia = new Set<string>();
for (let i = 0; i < n; i++) {
  const dia = new Date(Date.UTC(2026, 8, 17 + i, 15));
  const orden = rotarPorDia(base, dia);
  orden.forEach((item, pos) => {
    (posiciones[item] ??= new Set()).add(pos);
  });
  primeraCambia.add(orden[0]);
}
const todasCubiertas = Object.values(posiciones).every(s => s.size === n);
console.log('reparte N posiciones:', todasCubiertas ? 'OK' : 'FAIL');
console.log('primera siempre dipt:', primeraCambia.size === n ? 'OK' : 'FAIL', `(${primeraCambia.size}/${n} distintas)`);

// 4) Edge cases: 0 y 1 elementos
console.log('array vacio         :', rotarPorDia([], f).length === 0 ? 'OK' : 'FAIL');
console.log('array de 1          :', rotarPorDia(['X'], f).join('') === 'X' ? 'OK' : 'FAIL');

// 5) Cambio a medianoche CARACAS (UTC-4), no a las 20:00
const antes20 = new Date('2026-09-17T19:59:00Z'); // 15:59 Caracas
const despues20 = new Date('2026-09-17T20:01:00Z'); // 16:01 Caracas -> UTC ya es dia 18
const dia17 = new Date('2026-09-17T05:00:00Z');
const dia18 = new Date('2026-09-18T05:00:00Z');
console.log('mismo dia Caracas   :', rotarPorDia(base, antes20).join('') === rotarPorDia(base, despues20).join('') ? 'OK' : 'FAIL');
console.log('cambia al dia sig.  :', rotarPorDia(base, dia17).join('') !== rotarPorDia(base, dia18).join('') ? 'OK' : 'FAIL');
console.log('  17/09 ->', rotarPorDia(base, dia17).join(''), '| 18/09 ->', rotarPorDia(base, dia18).join(''));
