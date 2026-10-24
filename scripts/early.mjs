// Recorrido de los primeros minutos con un jugador "normal" (retira, acepta pedidos, compra lo útil).
// Uso: node scripts/early.mjs [minutos]
import * as E from '../src/game/engine.js';
import { step } from '../src/game/progress.js';
import { money } from '../src/game/format.js';

const MIN = Number(process.argv[2] || 90);
const s = E.newGame(null, 12345);
const log = [];
const at = (t) => `${String(Math.round(t / 60)).padStart(3)} min`;
for (let t = 0; t < 60 * MIN; t++) {
  const ctx = { out: [] }; step(s, 1, ctx);
  for (const m of s.machines) { if (m.waitStart) E.startMachine(s, m.id); if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id); }
  if (s.global) E.resolveGlobal(s, s.global.id === 'misteriosa' ? 1 : 0);
  E.useMate(s);
  for (const o of [...s.orders.offers]) if (E.suggestAssign(s, o).enough) E.acceptOrder(s, o.id);
  for (const k of ['PLA', 'PETG']) if (E.materialUnlocked(s, k) && s.mat[k] < 200) E.buyMat(s, k);
  for (const e of ctx.out) if (e.type === 'repUp') log.push(`${at(t)} · reputación ${e.level}`);
  if (t % 5) continue;
  // Prioridad: lugar libre → mejor máquina accesible; taller lleno → espacio; si no, mejoras baratas.
  const free = s.machines.length < E.slots(s);
  const models = ['h2s', 'k2plus', 'p1s', 'k1c', 'a1', 'a1mini', 'magna', 'ender3'].filter((id) => E.machineUnlocked(s, id));
  if (free && models.length) {
    const id = models.find((x) => s.money >= E.machineCost(s, x));
    if (id && (id !== 'ender3' || E.machineCost(s, 'a1mini') > s.money * 3 || !E.machineUnlocked(s, 'a1mini'))) { E.buyMachine(s, id); log.push(`${at(t)} · máquina ${id} (${money(E.machineCost(s, id))})`); continue; }
  }
  if (!free && E.buySpace(s)) { log.push(`${at(t)} · espacio: ${s.space}`); continue; }
  for (const id of ['slicer', 'pei', 'sobrino', 'yerba', 'calibracion', 'petg', 'termo', 'proveedor', 'hotend', 'instagram', 'marca', 'ams', 'expulsion']) {
    if (!E.upgradeUnlocked(s, id) || E.upgradeMaxed(s, id)) continue;
    const c = E.upgradeCost(s, id);
    if (s.money >= c && c < Math.max(60000, E.potentialRate(s) * 240)) { E.buyUpgrade(s, id); log.push(`${at(t)} · mejora ${id} (${money(c)})`); break; }
  }
  if (t % 600 === 0) log.push(`${at(t)} · plata ${money(s.money)} · ritmo ${money(E.potentialRate(s))}/s · rep ${E.repLevel(s)} · ${s.machines.length} máquinas`);
}
console.log(log.join('\n'));
