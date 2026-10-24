// Simulador de balance: un "jugador bot" juega N horas y anota cuándo llega a cada hito.
// Uso: node scripts/sim.mjs [horas] [semilla] [reaccion_s]
import * as E from '../src/game/engine.js';
import { step } from '../src/game/progress.js';
import { MACHINES, MACHINE_ORDER, UPGRADES, UPGRADE_ORDER, SPACES, PRODUCTS, PERKS } from '../src/game/data.js';
import { money, dur } from '../src/game/format.js';

const HOURS = Number(process.argv[2] || 5);
const SEED = Number(process.argv[3] || 12345);
const REACT = Number(process.argv[4] || 2); // cada cuántos segundos "mira" el jugador
const PERKSARG = process.argv[5] || '';

let s;
if (PERKSARG) {
  const keep = { prestige: { points: 0, total: 6, perks: Object.fromEntries(PERKSARG.split(',').map((p) => [p, true])), moves: 1, vitrina: [] } };
  s = E.newGame(keep, SEED);
} else s = E.newGame(null, SEED);
const DT = 0.5;
const marks = {};
const mark = (k) => { if (!(k in marks)) marks[k] = s.time; };
let lastAct = 0, lastBuy = 0;
const counts = { events: 0, orders: 0, fails: 0, sales: 0 };

function modelScore(model) { const M = MACHINES[model]; return M.speed * (1 + 0.4 * M.stars); }

function act() {
  const ctx = { out: [] };
  for (const m of s.machines) if (m.waitStart) E.startMachine(s, m.id, ctx);
  for (const m of s.machines) if (m.event) {
    const id = m.event.id;
    E.resolveEvent(s, m.id, id === 'orientacion' ? 1 : 0, ctx);
  }
  for (const m of s.machines) if (m.state === 'done') E.retrieve(s, m.id, ctx, 'hand');
  if (s.global) {
    const id = s.global.id;
    if (id === 'misteriosa') E.resolveGlobal(s, 1, ctx); else E.resolveGlobal(s, 0, ctx);
  }
  E.useMate(s, ctx);
  for (const o of [...s.orders.offers]) {
    const sug = E.suggestAssign(s, o);
    if (sug.enough) E.acceptOrder(s, o.id);
  }
}
function buy() {
  // filamento
  for (const mat of ['PLA', 'PETG', 'TPU']) {
    const used = s.machines.some((m) => PRODUCTS[m.product].mat === mat);
    if (used && s.fil[mat] < 300 && !E.hasProveedor(s)) E.buySpool(s, mat);
  }
  // producto óptimo
  for (const m of s.machines) { const b = E.bestProductFor(s, m); if (b && b !== m.product) E.setProduct(s, m.id, b); }
  const cands = [];
  for (const id of UPGRADE_ORDER) {
    if (!E.upgradeUnlocked(s, id) || E.lvlOf(s, id) >= (UPGRADES[id].max || 1)) continue;
    cands.push({ c: E.upgradeCost(s, id), f: () => E.buyUpgrade(s, id), k: 'up:' + id });
  }
  const sp = E.nextSpace(s);
  if (sp && E.repLevel(s) >= sp.rep) cands.push({ c: sp.cost * (s.machines.length >= E.slots(s) ? 0.5 : 1.5), real: sp.cost, f: () => E.buySpace(s), k: 'space' });
  const unlocked = MACHINE_ORDER.filter((m) => E.machineUnlocked(s, m));
  if (s.machines.length < E.slots(s)) {
    let best = null, bv = 0;
    for (const md of unlocked) { const v = modelScore(md) / E.machineCost(s, md); if (v > bv) { bv = v; best = md; } }
    if (best) cands.push({ c: E.machineCost(s, best), f: () => E.buyMachine(s, best), k: 'm:' + best });
  } else {
    const top = unlocked.filter((x) => x !== 'gigante').sort((a, b) => modelScore(b) - modelScore(a))[0];
    const worst = [...s.machines].sort((a, b) => modelScore(a.model) - modelScore(b.model))[0];
    if (top && modelScore(top) > modelScore(worst.model) * 1.3) {
      cands.push({ c: E.machineCost(s, top), f: () => { E.sellMachine(s, worst.id); return E.buyMachine(s, top); }, k: 'rep:' + top });
    }
    if (unlocked.includes('gigante') && !s.machines.some((m) => m.model === 'gigante')) {
      cands.push({ c: E.machineCost(s, 'gigante'), f: () => { E.sellMachine(s, worst.id); return E.buyMachine(s, 'gigante'); }, k: 'gig' });
    }
  }
  cands.sort((a, b) => a.c - b.c);
  for (const c of cands) {
    if (s.money >= (c.real ?? c.c)) { if (c.f()) { lastBuyKey = c.k; return true; } }
    break;
  }
  return false;
}
let lastBuyKey = '';
const T = HOURS * 3600;
let nextLog = 600;
while (s.time < T) {
  const ctx = { out: [], idle: false };
  step(s, DT, ctx);
  for (const e of ctx.out) {
    if (e.type === 'mevent') counts.events++;
    if (e.type === 'orderDone') counts.orders++;
    if (e.type === 'orderFail') counts.fails++;
  }
  if (s.time - lastAct >= REACT) { lastAct = s.time; act(); }
  if (s.time - lastBuy >= 3) { lastBuy = s.time; while (buy()); }
  if (s.machines.length >= 2) mark('2ª impresora');
  if (s.machines.some((m) => m.model === 'cartesiana')) mark('Cartesiana');
  if (s.space >= 1) mark('Cuarto maker');
  if (E.has(s, 'petg')) mark('PETG');
  if (s.machines.some((m) => m.model === 'rayo')) mark('Rayo');
  if (s.space >= 2) mark('Garage');
  if (s.machines.some((m) => m.model === 'bunker')) mark('Búnker');
  if (s.machines.some((m) => m.model === 'gigante')) mark('Gigante');
  if (s.space >= 3) mark('Local');
  if (E.canMove(s)) mark('Mudanza posible');
  for (let l = 2; l <= 10; l++) if (E.repLevel(s) >= l) mark('Rep ' + l);
  if (!s.tutorial.active) mark('Fin tutorial');
  if (s.time >= nextLog) {
    nextLog += 1800;
    console.log(`[${dur(s.time).padStart(9)}] ${money(s.money).padStart(12)}  rate ${money(E.potentialRate(s)).padStart(10)}/s  rep ${E.repLevel(s)}  esp ${SPACES[s.space].id}  maq ${s.machines.map((m) => m.model[0]).join('')}  misión ${s.missions.i}`);
  }
}
console.log('\nHitos:');
for (const [k, v] of Object.entries(marks).sort((a, b) => a[1] - b[1])) console.log(`  ${dur(v).padStart(10)}  ${k}`);
console.log(`\nGanado: ${money(s.runEarned)} · Oficio si se muda: ${E.oficioGain(s)} · eventos ${counts.events} · pedidos ${counts.orders} (fallidos ${counts.fails}) · piezas ${s.stats.pieces}`);
console.log('Mejoras:', Object.keys(s.upgrades).join(', '));
