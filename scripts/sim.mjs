// Simulador de balance: un "jugador bot" juega N horas (con Mudanzas) y anota cuándo llega a cada hito.
// Uso: node scripts/sim.mjs [horas] [semilla] [reaccion_s]
import * as E from '../src/game/engine.js';
import { step } from '../src/game/progress.js';
import { MACHINES, MACHINE_ORDER, UPGRADES, UPGRADE_ORDER, SPACES, PRODUCTS, PERKS, MATERIAL_ORDER } from '../src/game/data.js';
import { money, dur } from '../src/game/format.js';

const HOURS = Number(process.argv[2] || 8);
const SEED = Number(process.argv[3] || 12345);
const REACT = Number(process.argv[4] || 2);
const QUIET = process.argv.includes('--quiet');

let s = E.newGame(null, SEED);
const DT = 1;
let T = 0; // tiempo total jugado (todas las partidas)
let runStart = 0;
const marks = {};
const mark = (k) => { if (!(k in marks)) marks[k] = T; };
let lastAct = 0, lastBuy = 0;
const moves = [];

// Valor estimado de una máquina: lo que ganaría con su mejor producto.
function machineValue(model) {
  const fake = { id: -1, model, product: 'llavero' };
  let best = 0;
  for (const pid of Object.keys(PRODUCTS)) if (E.canPrint(s, fake, pid)) best = Math.max(best, E.productRate(s, fake, pid));
  return best;
}
function act() {
  const ctx = { out: [] };
  for (const m of s.machines) if (m.waitStart) E.startMachine(s, m.id, ctx);
  for (const m of s.machines) if (m.event) E.resolveEvent(s, m.id, m.event.id === 'orientacion' ? 1 : 0, ctx);
  for (const m of s.machines) if (m.state === 'done') E.retrieve(s, m.id, ctx, 'hand');
  if (s.global) E.resolveGlobal(s, s.global.id === 'misteriosa' ? 1 : 0, ctx);
  E.useMate(s, ctx);
  for (const o of [...s.orders.offers]) if (E.suggestAssign(s, o).enough) E.acceptOrder(s, o.id);
}
function buy() {
  for (const mat of MATERIAL_ORDER) {
    const used = s.machines.some((m) => PRODUCTS[m.product].mat === mat);
    if (used && s.mat[mat] < 300 && !E.hasProveedor(s)) E.buyMat(s, mat);
  }
  for (const m of s.machines) { const b = E.bestProductFor(s, m); if (b && b !== m.product) E.setProduct(s, m.id, b); }
  const cands = [];
  for (const id of UPGRADE_ORDER) {
    if (!E.upgradeUnlocked(s, id) || E.upgradeMaxed(s, id)) continue;
    cands.push({ c: E.upgradeCost(s, id), f: () => E.buyUpgrade(s, id) });
  }
  const sp = E.nextSpace(s);
  if (sp && E.repLevel(s) >= sp.rep) cands.push({ c: sp.cost * (s.machines.length >= E.slots(s) ? 0.4 : 1.5), real: sp.cost, f: () => E.buySpace(s) });
  const unlocked = MACHINE_ORDER.filter((m) => E.machineUnlocked(s, m));
  const vals = Object.fromEntries(unlocked.map((m) => [m, machineValue(m)]));
  if (s.machines.length < E.slots(s)) {
    let best = null, bv = 0;
    for (const md of unlocked) { const v = vals[md] / E.machineCost(s, md); if (v > bv) { bv = v; best = md; } }
    if (best) cands.push({ c: E.machineCost(s, best), f: () => E.buyMachine(s, best) });
  } else {
    const top = [...unlocked].sort((a, b) => vals[b] - vals[a])[0];
    const worst = [...s.machines].sort((a, b) => (machineValue(a.model)) - (machineValue(b.model)))[0];
    if (top && vals[top] > machineValue(worst.model) * 1.6) {
      cands.push({ c: E.machineCost(s, top) * 1.2, real: E.machineCost(s, top), f: () => { E.sellMachine(s, worst.id); return E.buyMachine(s, top); } });
    }
  }
  cands.sort((a, b) => a.c - b.c);
  for (const c of cands) { if (s.money >= (c.real ?? c.c)) return !!c.f(); break; }
  return false;
}
function maybeMove() {
  if (!E.canMove(s)) return;
  const gain = E.oficioGain(s);
  const runT = T - runStart;
  const want = gain >= Math.max(3, s.prestige.total * 1.2) || (runT > 5 * 3600 && gain >= s.prestige.total * 0.3);
  if (!want || runT < 1800) return;
  moves.push({ at: T, gain, space: s.space, rep: E.repLevel(s), runT });
  s = E.doMove(s, 'llavero');
  runStart = T;
  // ventajas: la más barata que alcance, repetidamente
  for (;;) {
    const opts = Object.entries(PERKS).filter(([id, P]) => !s.prestige.perks[id] && P.cost <= s.prestige.points).sort((a, b) => a[1].cost - b[1].cost);
    if (!opts.length) break;
    E.buyPerk(s, opts[0][0], PERKS);
  }
}

const TOTAL = HOURS * 3600;
let nextLog = 3600;
while (T < TOTAL) {
  const ctx = { out: [], idle: false };
  step(s, DT, ctx);
  T += DT;
  if (s.time - lastAct >= REACT || s.time < lastAct) { lastAct = s.time; act(); }
  if (s.time - lastBuy >= 3 || s.time < lastBuy) { lastBuy = s.time; for (let i = 0; i < 20 && buy(); i++); }
  maybeMove();
  for (let i = 1; i < SPACES.length; i++) if (s.space >= i) mark('Espacio: ' + SPACES[i].name);
  for (const t of ['resina', 'ams', 'laser', 'cnc']) if (E.has(s, t)) mark('Tecnología: ' + t);
  for (const md of ['a1mini', 'mk4s', 'p1s', 'x1c', 'voron', 'h2d', 'giga', 'rack', 'rackpro', 'form4', 'xtoolp2', 'shapeoko']) if (s.machines.some((m) => m.model === md)) mark('Máquina: ' + MACHINES[md].brand + ' ' + MACHINES[md].name);
  for (const l of [5, 10, 15, 20]) if (E.repLevel(s) >= l) mark('Reputación ' + l);
  if (T >= nextLog && !QUIET) {
    nextLog += 3600 * Math.max(1, Math.floor(HOURS / 20));
    console.log(`[${dur(T).padStart(10)}] run ${dur(T - runStart).padStart(9)} ${money(s.money).padStart(12)} ritmo ${money(E.potentialRate(s)).padStart(12)}/s rep ${String(E.repLevel(s)).padStart(2)} ${SPACES[s.space].id.padEnd(10)} máq ${s.machines.length} oficio ${s.prestige.total}`);
  }
}
console.log('\nMudanzas:');
for (const m of moves) console.log(`  ${dur(m.at).padStart(10)}  +${m.gain} oficio (partida de ${dur(m.runT)}, llegó a ${SPACES[m.space].name}, rep ${m.rep})`);
console.log('\nHitos (tiempo total jugado):');
for (const [k, v] of Object.entries(marks).sort((a, b) => a[1] - b[1])) console.log(`  ${dur(v).padStart(10)}  ${k}`);
console.log(`\nOficio total ${s.prestige.total} · ganado total ${money(s.totalEarned)} · piezas ${s.stats.pieces.toLocaleString('es-AR')} · pedidos ${s.stats.orders} · contratos ${s.stats.contracts}`);
