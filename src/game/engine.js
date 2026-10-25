// =====================================================================
// MOTOR DEL JUEGO — lógica pura (sin React ni navegador).
// El estado es un objeto plano y serializable; las funciones lo modifican.
// tick(s, dt, ctx) avanza la simulación dt segundos de juego.
// Lo que la interfaz tiene que mostrar se devuelve en ctx.out (lista de avisos).
// =====================================================================
import {
  UNIT, MATERIALS, MATERIAL_ORDER, STAR_MULT, SPACES, MACHINES, MACHINE_ORDER, PRODUCTS, PRODUCT_ORDER, SIZES,
  UPGRADES, repNeeded, REP_PRICE_BONUS, ORDER_TEMPLATES, ORDER_OFFER_LIFE, ORDER_SPAWN_EVERY, CONTRACT_CLIENTS,
  MACHINE_EVENTS, GLOBAL_EVENTS, MAKER_TITLES, MASTERY_BASE, MASTERY_GROWTH, MASTERY_BONUS,
  MASTERY_CHALLENGES, TECHS, FLOORS, FLOOR_SLOTS, COMBO_CLIENTS,
} from './data.js';

export const SAVE_VERSION = 3;
// Escala de la Mudanza: con AR$ 1.000 M ganados en una partida se obtienen ~3 puntos de Oficio.
export const OFICIO_SCALE = 4.5e8;
export const FIRST_FREE_MISSION = 5; // las 5 primeras misiones son el tutorial

// ---------- Azar con semilla ----------
export function rand(s) {
  s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pickWeighted(s, list) {
  const total = list.reduce((a, x) => a + x.w, 0);
  if (total <= 0) return null;
  let r = rand(s) * total;
  for (const x of list) { r -= x.w; if (r <= 0) return x.v; }
  return list[list.length - 1].v;
}

// ---------- Estado nuevo ----------
function freshStats() {
  return { pieces: 0, orders: 0, ordersFailed: 0, mates: 0, events: {}, resolved: 0, urgentDone: 0, contracts: 0,
    exposicion: 0, cortes: 0, favors: 0, spools: 0, xl: 0, maxOffline: 0, handRetrieved: 0, earned: 0, upgrades: 0,
    repairs: 0, usedBought: 0, usedSold: 0, tradeIns: 0 };
}
function freshRun() { return { pieces: 0, products: {}, mates: 0, orders: 0, spools: 0, xl: 0 }; }
export function defaultSettings() {
  return { sound: true, volume: 0.6, anim: 'full', led: 'cyan', quality: 'auto', view: '3d', currency: 'ARS',
    vol: { music: 0.35, ambient: 0.5, machines: 0.6, fx: 0.7 } };
}
const emptyMats = () => Object.fromEntries(MATERIAL_ORDER.map((k) => [k, 0]));

export function newGame(keep = null, seed = (Date.now() ^ 0x5bd1e995) >>> 0, challenge = null) {
  const perks = keep?.prestige?.perks || {};
  const s = {
    v: SAVE_VERSION,
    name: keep?.name || '',
    time: 0,
    money: 0,
    runEarned: 0,
    totalEarned: keep?.totalEarned || 0,
    rep: 0,
    mat: { ...emptyMats(), PLA: UNIT },
    space: 0,
    machines: [],
    nextMid: 1,
    upgrades: {},
    orders: { offers: [], active: [], spawnT: ORDER_SPAWN_EVERY - 8, nextId: 1, fidelity: keep?.orders?.fidelity || {}, gestorT: 0, contractT: 600 },
    mate: { until: 0, ready: 0 },
    trend: { p: null, until: 0, next: 600 },
    boost: { viral: 0, risky: 0, turbo: 0, feria: 0 },
    global: null,
    nextGlobal: 420,
    lastNeg: 0,
    lastCorte: -99999,
    helperT: 8,
    checkT: 0,
    stats: keep?.stats || freshStats(),
    run: freshRun(),
    mastery: keep?.mastery || {},
    tokens: keep?.tokens || 0,
    daily: keep?.daily || null,
    weekly: keep?.weekly || null,
    challenge: challenge ? { id: challenge, started: Date.now() } : null,
    missions: { i: keep ? FIRST_FREE_MISSION : 0 },
    achievements: keep?.achievements || {},
    prestige: keep?.prestige || { points: 0, total: 0, perks: {}, moves: 0, vitrina: [], mastery: {} },
    tutorial: { active: !keep },
    seen: keep?.seen || {},
    settings: keep?.settings || defaultSettings(),
    // Premios del juego online (solo estéticos): qué se ganó y qué se está usando.
    cosmetics: keep?.cosmetics || { unlocked: [], decor: [], skin: null, effect: null },
    // Tienda de usados: publicaciones por confirmar (outbox) y movimientos ya aplicados (done).
    market: keep?.market || { outbox: [], done: [] },
    rng: seed >>> 0,
    lastSeen: Date.now(),
  };
  if (!s.prestige.mastery) s.prestige.mastery = {};
  addMachine(s, 'ender3', 0, !keep);
  if (perks.mesa && !rule(s, 'soloender')) { addMachine(s, 'magna', 0, false); s.money += 150000; }
  if (perks.cuarto) s.space = Math.max(s.space, 1);
  if (perks.garage) s.space = Math.max(s.space, 2);
  if (perks.local) s.space = Math.max(s.space, 3);
  if (perks.reputacion) s.rep = repNeeded(3);
  if (keep?.keptRep) s.rep = Math.max(s.rep, keep.keptRep);
  if (perks.sobrino) s.upgrades.sobrino = 1;
  if (perks.proveedor) s.upgrades.proveedor = 1;
  if (perks.saberpetg) { s.upgrades.petg = 1; s.upgrades.directo = 1; }
  if (perks.saberresina) s.upgrades.resina = 1;
  if (perks.saberlaser) s.upgrades.laser = 1;
  if (perks.sabercnc) s.upgrades.cnc = 1;
  return s;
}

function addMachine(s, model, paid, waitStart = false, wear = 0) {
  const m = {
    id: s.nextMid++, model, product: 'llavero', orderId: null, state: 'idle',
    progress: 0, need: 0, cur: null, curOrder: null, pen: 0, ev: null, event: null,
    pauseUntil: 0, doneAt: 0, paid, waitStart, wear,
  };
  s.machines.push(m);
  m.product = bestProductFor(s, m) || firstProductOf(MACHINES[model].tech);
  return m;
}
const firstProductOf = (tech) => PRODUCT_ORDER.find((p) => PRODUCTS[p].tech === tech);

// ---------- Reglas de los desafíos de maestría ----------
export const rule = (s, id) => s.challenge?.id === id;
export const mastered = (s, id) => !!s.prestige?.mastery?.[id];
const BLOCKED_BY_AMANO = new Set(['sobrino', 'expulsion', 'proveedor', 'gestor']);

// ---------- Cálculos ----------
export const lvlOf = (s, id) => s.upgrades[id] || 0;
export const has = (s, id) => lvlOf(s, id) > 0 && !(rule(s, 'amano') && BLOCKED_BY_AMANO.has(id));
export const perk = (s, id) => !!s.prestige.perks[id];

export function repLevel(s) {
  let l = 1;
  while (s.rep >= repNeeded(l + 1)) l++;
  return l;
}
export function repProgress(s) {
  const l = repLevel(s);
  const a = repNeeded(l), b = repNeeded(l + 1);
  return { level: l, frac: (s.rep - a) / (b - a), cur: s.rep - a, next: b - a };
}
export const repMult = (s) => 1 + REP_PRICE_BONUS * (repLevel(s) - 1);
// Bonus del Oficio: crece cada vez más lento (logarítmico) para que la economía no se dispare.
export const oficioMultOf = (total) => 1 + 0.5 * Math.log(1 + total);
export const oficioMult = (s) => oficioMultOf(s.prestige.total);
export const oficioPct = (total) => Math.round((oficioMultOf(total) - 1) * 100);
export function makerTitle(total) {
  let t = MAKER_TITLES[0][1];
  for (const [n, name] of MAKER_TITLES) if (total >= n) t = name;
  return t;
}

// Experiencia por producto
export function masteryLevel(s, pid) {
  const c = s.mastery[pid] || 0;
  if (c < MASTERY_BASE) return 0;
  return Math.floor(Math.log(c / MASTERY_BASE) / Math.log(MASTERY_GROWTH) + 1e-9) + 1;
}
export function masteryInfo(s, pid) {
  const lvl = masteryLevel(s, pid);
  const c = s.mastery[pid] || 0;
  const prev = lvl === 0 ? 0 : MASTERY_BASE * Math.pow(MASTERY_GROWTH, lvl - 1);
  const next = MASTERY_BASE * Math.pow(MASTERY_GROWTH, lvl);
  return { lvl, count: c, next: Math.ceil(next), frac: (c - prev) / (next - prev), mult: Math.pow(MASTERY_BONUS, lvl) };
}

export const slots = (s) => SPACES[s.space].slots;
// ---------- Pisos por tecnología (Nave de producción y Planta 3DBAT) ----------
export const hasFloors = (s) => !!SPACES[s.space]?.floors;
export const techOfModel = (model) => MACHINES[model]?.tech || 'fdm';
export const floorMachines = (s, tech) => s.machines.filter((m) => techOfModel(m.model) === tech);
export const floorUsed = (s, tech) => (hasFloors(s) ? floorMachines(s, tech).length : s.machines.length);
export const floorCap = (s) => (hasFloors(s) ? FLOOR_SLOTS : slots(s));
// ¿Entran estas máquinas (modelos) si salen las de "removing" (ids)?
export function fitsModels(s, models, removing = []) {
  if (!hasFloors(s)) return s.machines.length - removing.length + models.length <= slots(s);
  const need = {};
  for (const md of models) { const t = techOfModel(md); need[t] = (need[t] || 0) + 1; }
  for (const [t, n] of Object.entries(need)) {
    const out = s.machines.filter((m) => removing.includes(m.id) && techOfModel(m.model) === t).length;
    if (floorMachines(s, t).length - out + n > FLOOR_SLOTS) return false;
  }
  return true;
}
export const roomFor = (s, model, removing = []) => fitsModels(s, [model], removing);
export const isFull = (s) => (hasFloors(s) ? FLOORS.every((f) => floorMachines(s, f.id).length >= FLOOR_SLOTS) : s.machines.length >= slots(s));
// Reorganizar: cambia de lugar una máquina con la anterior/siguiente de su mismo piso.
export function moveMachine(s, mid, dir) {
  const m = s.machines.find((x) => x.id === mid);
  if (!m) return false;
  const tech = techOfModel(m.model);
  const same = s.machines.map((x, i) => [x, i]).filter(([x]) => !hasFloors(s) || techOfModel(x.model) === tech);
  const k = same.findIndex(([x]) => x.id === mid);
  const j = k + (dir < 0 ? -1 : 1);
  if (j < 0 || j >= same.length) return false;
  const a = same[k][1], b = same[j][1];
  [s.machines[a], s.machines[b]] = [s.machines[b], s.machines[a]];
  return true;
}
export const machineDef = (m) => MACHINES[m.model];

export function machineStars(s, m) {
  const M = MACHINES[m.model];
  let st = M.stars;
  if (has(s, 'calibracion') && M.stars <= 2) st++;
  if (has(s, 'boquilla') && M.tech === 'fdm') st++;
  if (perk(s, 'mirada')) st++;
  return Math.min(5, st);
}
export const mateActive = (s) => s.time < s.mate.until;
export function mateDuration(s) { return 60 + (has(s, 'termo') ? 30 : 0) + (perk(s, 'termo') ? 30 : 0); }
export function mateCooldown(s) { return has(s, 'yerba') ? 180 : 300; }
export const mateBoost = (s) => (mastered(s, 'sinmate') ? 2 : 1.5);

export function speedMult(s, model, withMate = true) {
  const M = MACHINES[model];
  let k = Math.pow(1.1, lvlOf(s, 'granja'));
  if (M.tech === 'fdm') {
    k *= Math.pow(1.05, lvlOf(s, 'slicer')) * Math.pow(1.1, lvlOf(s, 'hotend'));
    if (has(s, 'input') && M.enclosed) k *= 1.2;
  } else if (M.tech === 'resin') k *= Math.pow(1.15, lvlOf(s, 'exposicion'));
  else if (M.tech === 'laser') k *= Math.pow(1.15, lvlOf(s, 'potencia'));
  else if (M.tech === 'cnc') k *= Math.pow(1.15, lvlOf(s, 'fresas'));
  if (model === 'ender3' && mastered(s, 'soloender')) k *= 3;
  if (withMate && mateActive(s)) k *= mateBoost(s);
  return k;
}
export const machineSpeed = (s, m, withMate = true) => MACHINES[m.model].speed * speedMult(s, m.model, withMate);

export function materialUnlocked(s, mat) {
  const up = MATERIALS[mat].upgrade;
  return !up || has(s, up);
}
export function techUnlocked(s, tech) {
  const up = TECHS[tech].upgrade;
  return !up || has(s, up);
}
// El producto está "en el catálogo" (independiente de la máquina).
export function productUnlocked(s, pid) {
  const p = PRODUCTS[pid];
  return repLevel(s) >= (p.rep || 1) && s.space >= (p.space || 0) && materialUnlocked(s, p.mat) && techUnlocked(s, p.tech)
    && (!p.multi || has(s, 'ams') || s.machines.some((m) => MACHINES[m.model].multi))
    && (!p.reward || (s.cosmetics?.unlocked || []).includes(p.reward));
}
export function productLockReason(s, pid) {
  const p = PRODUCTS[pid];
  if (!techUnlocked(s, p.tech)) return UPGRADES[TECHS[p.tech].upgrade].name;
  if (repLevel(s) < (p.rep || 1)) return `Reputación ${p.rep}`;
  if (s.space < (p.space || 0)) return SPACES[p.space].name;
  if (!materialUnlocked(s, p.mat)) return UPGRADES[MATERIALS[p.mat].upgrade].name;
  if (p.multi && !has(s, 'ams') && !s.machines.some((m) => MACHINES[m.model].multi)) return 'Sistema multicolor';
  if (p.reward && !(s.cosmetics?.unlocked || []).includes(p.reward)) return 'Plano exclusivo (juego online)';
  return null;
}
export const isMulti = (s, M) => !!(M.multi || (M.amsable && has(s, 'ams')));
// Por qué esta máquina no puede hacer este producto (o null si puede).
export function machineCantReason(s, m, pid) {
  const M = MACHINES[m.model], p = PRODUCTS[pid];
  if (p.tech !== M.tech) return 'Otra tecnología';
  const lock = productLockReason(s, pid);
  if (lock) return lock;
  if (SIZES[p.size] > SIZES[M.size]) return `No entra (pieza ${p.size}, cama ${M.size})`;
  if (p.multi && !isMulti(s, M)) return M.amsable ? 'Necesita sistema multicolor' : 'No es multicolor';
  if (p.enclosed && !M.enclosed) return 'Necesita impresora cerrada';
  if (machineStars(s, m) < (p.minStars || 1)) return `Calidad ★${p.minStars}`;
  return null;
}
export const canPrint = (s, m, pid) => machineCantReason(s, m, pid) === null;

export function pieceValue(s, pid, stars) {
  return PRODUCTS[pid].price * STAR_MULT[Math.max(1, Math.min(5, stars))] * repMult(s) * oficioMult(s)
    * Math.pow(1.08, lvlOf(s, 'marca')) * masteryInfo(s, pid).mult;
}
export const trendActive = (s, pid) => s.trend.p === pid && s.time < s.trend.until;
export function saleMult(s, pid) {
  return (trendActive(s, pid) ? 2 : 1) * (s.time < s.boost.viral ? 2 : 1) * (s.time < s.boost.turbo ? 2 : 1)
    * (s.time < s.boost.feria ? 1.5 : 1) * (mastered(s, 'mostrador') ? 1.25 : 1);
}
export function productRate(s, m, pid, withBoosts = false) {
  const p = PRODUCTS[pid];
  const v = pieceValue(s, pid, machineStars(s, m)) * (withBoosts ? saleMult(s, pid) : 1);
  return v * machineSpeed(s, m, withBoosts) / p.time;
}
export function bestProductFor(s, m) {
  let best = null, bv = -1;
  for (const pid of PRODUCT_ORDER) {
    if (!canPrint(s, m, pid)) continue;
    const mat = PRODUCTS[pid].mat;
    if (s.mat[mat] <= 0 && !hasProveedor(s) && mat !== 'PLA') continue;
    const v = productRate(s, m, pid);
    if (v > bv) { bv = v; best = pid; }
  }
  return best;
}
export function incomeRate(s) {
  let r = 0;
  for (const m of s.machines) {
    if (m.state !== 'printing' || m.event || m.curOrder || !m.cur) continue;
    r += productRate(s, m, m.cur, true);
  }
  return r;
}
export function potentialRate(s) {
  let r = 0;
  for (const m of s.machines) {
    const pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
    if (pid) r += productRate(s, m, pid);
  }
  return r;
}

export const hasProveedor = (s) => has(s, 'proveedor');
export function matPrice(s, mat) {
  return MATERIALS[mat].price * (has(s, 'bulk') ? 0.8 : 1) * (perk(s, 'proveedor') ? 0.9 : 1)
    * (rule(s, 'bobina') ? 5 : 1) * (mastered(s, 'bobina') ? 0.7 : 1);
}
export function machineUnlocked(s, model) {
  const M = MACHINES[model];
  if (rule(s, 'soloender') && model !== 'ender3') return false;
  return repLevel(s) >= M.rep && s.space >= M.space && techUnlocked(s, M.tech);
}
export function machineLockReason(s, model) {
  const M = MACHINES[model];
  const r = [];
  if (rule(s, 'soloender') && model !== 'ender3') return ['Desafío «Solo Ender»'];
  if (!techUnlocked(s, M.tech)) r.push(UPGRADES[TECHS[M.tech].upgrade].name);
  if (repLevel(s) < M.rep) r.push(`Reputación ${M.rep}`);
  if (s.space < M.space) r.push(SPACES[M.space].name);
  return r;
}
export function machineCost(s, model) {
  const M = MACHINES[model];
  const n = s.machines.filter((m) => m.model === model).length;
  return Math.round(M.cost * Math.pow(M.growth, n));
}
export function upgradeCost(s, id) {
  const U = UPGRADES[id];
  return Math.round(U.cost * Math.pow(U.growth, lvlOf(s, id)));
}
export function upgradeUnlocked(s, id) {
  const U = UPGRADES[id];
  if (rule(s, 'amano') && BLOCKED_BY_AMANO.has(id)) return false;
  return repLevel(s) >= U.rep && s.space >= (U.space || 0) && (!U.req || has(s, U.req));
}
export function upgradeLockReason(s, id) {
  const U = UPGRADES[id];
  if (rule(s, 'amano') && BLOCKED_BY_AMANO.has(id)) return 'Desafío «Todo a mano»';
  const r = [];
  if (U.req && !has(s, U.req)) r.push(UPGRADES[U.req].name);
  if (repLevel(s) < U.rep) r.push(`Reputación ${U.rep}`);
  if (s.space < (U.space || 0)) r.push(SPACES[U.space].name);
  return r.join(' · ');
}
export const upgradeMaxed = (s, id) => UPGRADES[id].max != null && lvlOf(s, id) >= UPGRADES[id].max;
export function boardSize(s) { return (has(s, 'tablero') ? 5 : 3) + (perk(s, 'contactos') ? 1 : 0); }
export function offlineEff(s) { return Math.min(1, (has(s, 'remota') ? 0.8 : 0.5) + (perk(s, 'duermo') ? 0.2 : 0)); }
export function offlineCapH(s) { return (has(s, 'remota') ? 6 : 2) + (perk(s, 'duermo') ? 3 : 0); }
// Sobrino ayudante: 1 = retira piezas · 2 = con la expulsión automática pasa a logística
// (ordena las bobinas y despacha los pedidos: +5 % de paga en pedidos).
export const sobrinoLevel = (s) => (has(s, 'sobrino') ? (has(s, 'expulsion') ? 2 : 1) : 0);
export function orderMult(s) {
  return Math.pow(1.1, lvlOf(s, 'instagram')) * (perk(s, 'contactos') ? 1.2 : 1) * (mastered(s, 'exigente') ? 1.25 : 1)
    * (sobrinoLevel(s) >= 2 ? 1.05 : 1);
}

function addMoney(s, x) {
  s.money += x; s.runEarned += x; s.totalEarned += x; s.stats.earned = (s.stats.earned || 0) + x;
}
function addRep(s, n, out) {
  const before = repLevel(s);
  s.rep += n;
  const after = repLevel(s);
  if (after > before) out.push({ type: 'repUp', level: after });
}
function loseRep(s, n) { s.rep = Math.max(repNeeded(repLevel(s)), s.rep - n); }

// ---------- Materiales ----------
function consume(s, mat, amount, out) {
  if (s.mat[mat] >= amount) { s.mat[mat] -= amount; return true; }
  if (hasProveedor(s) && materialUnlocked(s, mat)) {
    const price = matPrice(s, mat) * 1.1;
    const n = Math.max(1, Math.ceil((amount - s.mat[mat]) / UNIT));
    if (s.money >= price * n) {
      s.money -= price * n; s.mat[mat] += UNIT * n; s.stats.spools += n; s.run.spools += n;
      out.push({ type: 'autoSpool', mat });
      s.mat[mat] -= amount;
      return true;
    }
  }
  return false;
}

// ---------- Máquinas ----------
function inProgressFor(s, oid, pid) {
  let n = 0;
  for (const m of s.machines) if (m.curOrder === oid && m.cur === pid && m.state !== 'idle' && m.state !== 'nofil') n++;
  return n;
}
function pickJob(s, m) {
  if (m.orderId) {
    const o = s.orders.active.find((x) => x.id === m.orderId);
    if (!o) m.orderId = null;
    else {
      for (const it of o.items) {
        if (!canPrint(s, m, it.p)) continue;
        if (it.done + inProgressFor(s, o.id, it.p) < it.qty) return { pid: it.p, oid: o.id };
      }
    }
  }
  const pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
  if (pid && pid !== m.product) m.product = pid;
  return pid ? { pid, oid: null } : null;
}

function startPiece(s, m, out) {
  const job = pickJob(s, m);
  if (!job) { m.state = 'idle'; return; }
  const p = PRODUCTS[job.pid];
  if (!consume(s, p.mat, p.use, out)) {
    if (m.state !== 'nofil') out.push({ type: 'nofil', mid: m.id, mat: p.mat });
    m.state = 'nofil'; m.cur = null; m.curOrder = null;
    return;
  }
  m.cur = job.pid; m.curOrder = job.oid; m.progress = 0; m.need = p.time; m.pen = 0; m.state = 'printing';
  m.ev = rollEvent(s, m);
}

function machineEventWeights(s, m) {
  const M = MACHINES[m.model];
  const p = PRODUCTS[m.cur];
  const pei = has(s, 'pei') ? 0.5 : 1;
  const w = [];
  const add = (id, k) => { const E = MACHINE_EVENTS[id]; if (k > 0 && E.tech.includes(M.tech)) w.push({ v: id, w: E.weight * k }); };
  add('spaghetti', pei);
  if (!M.enclosed && p.mat !== 'TPU') add('warping', pei);
  add('tapada', has(s, 'boquilla') ? 0.3 : 1);
  if (!M.autolevel) add('primeracapa', pei);
  if ((p.mat !== 'PLA' || rule(s, 'lluvias')) && !has(s, 'secador')) add('humedo', 1);
  if (lvlOf(s, 'slicer') < 3 || M.tech === 'resin') add('orientacion', M.tech === 'resin' ? 0.5 : 1);
  if (!has(s, 'retraccion')) add('stringing', 1);
  add('layershift', m.model === 'ender3' ? 1 : m.model === 'magna' ? 0.5 : 0);
  if (!M.enclosed) add('gato', 1);
  add('fep', lvlOf(s, 'exposicion') >= 2 ? 0 : 1);
  add('fria', m.model === 'mars' ? 1 : 0);
  add('ipa', hasProveedor(s) ? 0 : 1);
  add('foco', m.model === 'falcon' ? 1 : 0.15);
  add('llama', lvlOf(s, 'potencia') >= 1 ? 0.3 : 1);
  add('humo', m.model === 'falcon' ? 1 : 0);
  add('fresa', lvlOf(s, 'fresas') >= 2 ? 0 : 1);
  add('sujecion', m.model === 'shapeoko' ? 0.2 : 1);
  add('viruta', M.art.type === 'cnc' ? 1 : 0);
  return w;
}
function eventChance(s, m) {
  return MACHINES[m.model].fail * (perk(s, 'ojo') ? 0.75 : 1) * (s.time < s.boost.risky ? 2 : 1)
    * (rule(s, 'lluvias') ? 3 : 1) * (mastered(s, 'lluvias') ? 0.7 : 1) * wearFailMult(m);
}
// Probabilidad de falla por pieza que se muestra en pantalla (con el desgaste).
export const machineFail = (s, m) => eventChance(s, m);
function rollEvent(s, m) {
  if (s.tutorial.force && !s.tutorial.forced) {
    s.tutorial.forced = true;
    return { id: s.tutorial.force, at: 0.3, forced: true };
  }
  if (rand(s) >= eventChance(s, m)) return null;
  const id = pickWeighted(s, machineEventWeights(s, m));
  if (!id) return null;
  return { id, at: id === 'primeracapa' ? 0.05 : 0.15 + rand(s) * 0.7 };
}
function eventAllowed(s, ctx, ev) {
  if (ev.forced) return true;
  if (s.tutorial.active || ctx.idle) return false;
  if (s.time - s.lastNeg < (rule(s, 'lluvias') ? 25 : 60)) return false;
  if (s.machines.filter((x) => x.event).length >= 2) return false;
  return true;
}
function triggerEvent(s, m, id, out) {
  m.event = { id, since: s.time, auto: null };
  s.lastNeg = s.time;
  if (id === 'spaghetti' && has(s, 'camara')) m.event.auto = s.time + 3;
  if (perk(s, 'manos')) m.event.auto = Math.min(m.event.auto ?? Infinity, s.time + 15);
  s.stats.events[id] = (s.stats.events[id] || 0) + 1;
  out.push({ type: 'mevent', mid: m.id, id });
}

export function resolveEvent(s, mid, opt = 0, ctx = {}) {
  const out = ctx.out || (ctx.out = []);
  const m = s.machines.find((x) => x.id === mid);
  if (!m || !m.event) return false;
  const def = MACHINE_EVENTS[m.event.id];
  const o = def.options[opt] || def.options[0];
  const id = m.event.id;
  m.event = null;
  switch (o.effect) {
    case 'restart':
      m.progress = 0;
      if (!o.free && m.cur) {
        const p = PRODUCTS[m.cur];
        if (!consume(s, p.mat, p.use, out)) { m.state = 'nofil'; m.cur = null; m.curOrder = null; }
      }
      break;
    case 'penalty': m.pen++; break;
    case 'pause': m.pauseUntil = s.time + 30; break;
    case 'slow': m.need = m.progress + (m.need - m.progress) * 2; break;
    case 'reorient': m.need *= 0.7; m.progress = 0; break;
    case 'brim': m.need *= 1.2; m.progress = 0; break;
    default: break;
  }
  s.stats.resolved++;
  s.stats['res_' + id] = (s.stats['res_' + id] || 0) + 1;
  out.push({ type: 'resolved', mid, id, effect: o.effect });
  return true;
}

export function retrieve(s, mid, ctx = {}, by = 'hand') {
  const out = ctx.out || (ctx.out = []);
  const m = s.machines.find((x) => x.id === mid);
  if (!m || m.state !== 'done') return false;
  const pid = m.cur;
  const stars = Math.max(1, machineStars(s, m) - m.pen);
  s.stats.pieces++; s.run.pieces++;
  s.run.products[pid] = (s.run.products[pid] || 0) + 1;
  const lvlBefore = masteryLevel(s, pid);
  s.mastery[pid] = (s.mastery[pid] || 0) + 1;
  if (masteryLevel(s, pid) > lvlBefore) out.push({ type: 'mastery', pid, level: masteryLevel(s, pid) });
  if (PRODUCTS[pid].size === 'XL' || PRODUCTS[pid].size === 'L') { s.stats.xl++; s.run.xl++; }
  if (by === 'hand') s.stats.handRetrieved++;
  const o = m.curOrder && s.orders.active.find((x) => x.id === m.curOrder);
  const it = o && o.items.find((i) => i.p === pid && i.done < i.qty);
  if (it) {
    it.done++;
    out.push({ type: 'orderPiece', mid, oid: o.id, pid });
    if (o.items.every((i) => i.done >= i.qty)) completeOrder(s, o, out);
  } else {
    const gain = pieceValue(s, pid, stars) * saleMult(s, pid);
    addMoney(s, gain);
    out.push({ type: 'sale', mid, amount: gain, pid, by });
  }
  out.push({ type: 'piece', pid, by });
  m.state = 'idle'; m.cur = null; m.curOrder = null; m.pen = 0; m.progress = 0;
  startPiece(s, m, out);
  return true;
}

export function startMachine(s, mid, ctx = {}) {
  const out = ctx.out || (ctx.out = []);
  const m = s.machines.find((x) => x.id === mid);
  if (!m) return;
  m.waitStart = false;
  if (m.state === 'idle' || m.state === 'nofil') startPiece(s, m, out);
}

function stepMachine(s, m, dt, ctx, blackout) {
  const out = ctx.out;
  if (m.event) {
    if (m.event.auto != null && s.time >= m.event.auto) resolveEvent(s, m.id, 0, ctx);
    return;
  }
  if (blackout || m.pauseUntil > s.time) return;
  if (m.state === 'idle' || m.state === 'nofil') {
    if (!m.waitStart) startPiece(s, m, out);
    return;
  }
  if (m.state !== 'printing') return;
  m.progress += dt * machineSpeed(s, m);
  const w0 = m.wear || 0;
  m.wear = wearAfter(w0, dt / 3600);
  if (w0 < WEAR_WARN && m.wear >= WEAR_WARN) out.push({ type: 'worn', mid: m.id });
  if (m.ev && m.progress >= m.ev.at * m.need) {
    const ev = m.ev; m.ev = null;
    if (eventAllowed(s, ctx, ev)) { triggerEvent(s, m, ev.id, out); return; }
  }
  if (m.progress >= m.need) {
    m.progress = m.need; m.state = 'done'; m.doneAt = s.time;
    out.push({ type: 'done', mid: m.id });
    if (has(s, 'expulsion')) retrieve(s, m.id, ctx, 'auto');
  }
}

// ---------- Compras ----------
export function buyMachine(s, model) {
  if (!machineUnlocked(s, model) || !roomFor(s, model)) return null;
  const c = machineCost(s, model);
  if (s.money < c) return null;
  s.money -= c;
  return addMachine(s, model, c);
}
export function sellMachine(s, mid) {
  if (s.machines.length <= 1) return false;
  const i = s.machines.findIndex((x) => x.id === mid);
  if (i < 0) return false;
  s.money += Math.round((s.machines[i].paid || 0) * 0.5);
  s.machines.splice(i, 1);
  return true;
}
// ---------- Plan canje (idea de la comunidad: Chechulina) ----------
// Entregás hasta 3 máquinas más chicas como parte de pago de una más grande.
// Te las toman mejor que vendiéndolas sueltas (65 % de la nueva, menos el desgaste),
// pagás la diferencia (como mínimo el 10 % de la nueva) y liberás lugar en el taller.
export const TRADE_MAX = 3;
// Fichas: cada una descuenta el 3 % del precio de la nueva (hasta 10 fichas por canje).
export const TRADE_TOKEN_PCT = 0.03;
export const TRADE_TOKEN_MAX = 10;
export function tradeValue(s, m) {
  const M = MACHINES[m.model];
  return Math.round(Math.max((m.paid || 0) * 0.5, M.cost * 0.65 * (1 - 0.5 * wearOf(m))));
}
// Máquinas tuyas que se pueden entregar para esta (más baratas que la nueva y de otro modelo).
export function tradeCandidates(s, model) {
  const C = MACHINES[model].cost;
  return s.machines.filter((m) => m.model !== model && MACHINES[m.model].cost < C);
}
export function tradeQuote(s, model, mids, tokens = 0) {
  const price = machineCost(s, model);
  const list = s.machines.filter((m) => mids.includes(m.id));
  const tk = Math.max(0, Math.min(TRADE_TOKEN_MAX, Math.floor(tokens) || 0));
  const machinesCredit = list.reduce((a, m) => a + tradeValue(s, m), 0);
  const tokenCredit = Math.round(price * TRADE_TOKEN_PCT * tk);
  const credit = Math.min(machinesCredit + tokenCredit, Math.floor(price * 0.9));
  return { price, credit, machinesCredit, tokenCredit, tokens: tk, pay: price - credit, count: list.length };
}
// Motivo por el que no se puede hacer el canje (o null si se puede).
export function tradeReason(s, model, mids, tokens = 0) {
  if (s.tutorial?.active) return 'Terminá el tutorial primero';
  if (!machineUnlocked(s, model)) return machineLockReason(s, model).join(' · ') || 'Todavía no la podés comprar';
  if (!mids.length && !(tokens > 0)) return 'Elegí qué máquinas entregás';
  if (tokens > TRADE_TOKEN_MAX) return `Hasta ${TRADE_TOKEN_MAX} fichas por canje`;
  if (tokens > (s.tokens || 0)) return 'No tenés tantas fichas';
  if (mids.length > TRADE_MAX) return `Hasta ${TRADE_MAX} máquinas por canje`;
  const ok = new Set(tradeCandidates(s, model).map((m) => m.id));
  if (mids.some((id) => !ok.has(id))) return 'Solo se entregan máquinas más chicas';
  if (!roomFor(s, model, mids)) return hasFloors(s) ? 'Sin lugar en ese piso' : 'Sin lugar en el taller';
  if (s.money < tradeQuote(s, model, mids, tokens).pay) return 'Te falta plata';
  return null;
}
export function tradeIn(s, model, mids, tokens = 0) {
  const ids = [...new Set(mids)];
  if (tradeReason(s, model, ids, tokens)) return null;
  const q = tradeQuote(s, model, ids, tokens);
  s.money -= q.pay;
  s.tokens -= q.tokens;
  s.machines = s.machines.filter((m) => !ids.includes(m.id));
  const m = addMachine(s, model, q.price);
  s.stats.tradeIns = (s.stats.tradeIns || 0) + 1;
  return { machine: m, ...q };
}

// ---------- Desgaste y reparación (idea de la comunidad: SHUNE3D) ----------
// Cada máquina se gasta mientras imprime, cada vez más rápido (curva exponencial):
// 5 % a las 24 h de impresión, 12 % a las 48 h, 21 % a las 72 h, 49 % a los 5 días
// y 100 % a los 7 días. Una máquina gastada falla más (al 100 %, 2,5 veces más).
// Fórmula: desgaste(h) = A·(e^(K·h) − 1), con desgaste(24) = 5 % y desgaste(168) = 100 %.
const WEAR_X = 1.3420418608185745; // cuánto se multiplica el ritmo cada 24 h
export const WEAR_K = Math.log(WEAR_X) / 24;
export const WEAR_A = 0.05 / (WEAR_X - 1);
// Desgaste después de imprimir h horas más (exacto, sin importar el tamaño del paso).
export function wearAfter(w, h) { return Math.min(1, (Math.max(0, w) + WEAR_A) * Math.exp(WEAR_K * h) - WEAR_A); }
export const WEAR_FAIL = 1.5;
export const WEAR_WARN = 0.6;
export const wearOf = (m) => Math.max(0, Math.min(1, Number(m?.wear) || 0));
export const wearPct = (m) => Math.round(wearOf(m) * 100);
export function wearFailMult(m) { return 1 + WEAR_FAIL * wearOf(m); }
export const needsRepair = (m) => wearOf(m) >= 0.05;
export function repairCost(s, m) { return Math.max(1, Math.round(MACHINES[m.model].cost * 0.3 * wearOf(m))); }
export function repairMachine(s, mid) {
  const m = s.machines.find((x) => x.id === mid);
  if (!m || !needsRepair(m)) return false;
  const c = repairCost(s, m);
  if (s.money < c) return false;
  s.money -= c;
  m.wear = 0;
  s.stats.repairs = (s.stats.repairs || 0) + 1;
  return true;
}
export function repairAllCost(s) { return s.machines.filter(needsRepair).reduce((a, m) => a + repairCost(s, m), 0); }
export function repairAll(s) {
  const list = s.machines.filter(needsRepair);
  const c = repairAllCost(s);
  if (!list.length || s.money < c) return 0;
  for (const m of list) repairMachine(s, m.id);
  return list.length;
}

// ---------- Tienda de usados (mercado entre jugadores) ----------
// Los topes de precio son los mismos que controla la base (migración 030).
export const usedMax = (model, wear) => Math.floor(MACHINES[model].cost * 0.9 * (1 - 0.5 * wear));
export const usedMin = (model) => Math.floor(MACHINES[model].cost * 0.1);
export function usedSuggest(model, wear) {
  const v = Math.round((MACHINES[model].cost * 0.65 * (1 - 0.5 * wear)) / 1000) * 1000;
  return Math.max(usedMin(model), Math.min(usedMax(model, wear), v));
}
const wear3 = (w) => Math.round(Math.max(0, Math.min(1, Number(w) || 0)) * 1000) / 1000;
export function marketOf(s) {
  if (!s.market || typeof s.market !== 'object') s.market = { outbox: [], done: [] };
  if (!Array.isArray(s.market.outbox)) s.market.outbox = [];
  if (!Array.isArray(s.market.done)) s.market.done = [];
  return s.market;
}
export const marketDone = (s, key) => marketOf(s).done.includes(key);
function markDone(s, key) { const mk = marketOf(s); mk.done = [key, ...mk.done.filter((k) => k !== key)].slice(0, 300); }
// Por qué no se puede vender esta máquina en Usados (o null si se puede).
export function listReason(s, m) {
  if (!m) return 'Esa máquina ya no está.';
  if (s.machines.length <= 1) return 'Es tu única máquina: necesitás al menos una en el taller.';
  if (s.tutorial?.active) return 'Terminá el tutorial primero.';
  return null;
}
// Saca la máquina del taller y la deja lista para publicar (se confirma con la base).
export function listUsed(s, mid, price, nonce) {
  const i = s.machines.findIndex((x) => x.id === mid);
  const m = s.machines[i];
  if (listReason(s, m)) return null;
  const wear = wear3(m.wear);
  // La máquina se sigue gastando mientras elegís el precio: se ajusta al tope del momento.
  if (!(Number(price) > 0)) return null;
  const p = Math.max(usedMin(m.model), Math.min(usedMax(m.model, wear), Math.round(price)));
  const entry = { nonce, model: m.model, wear, price: p, paid: m.paid || 0, at: Date.now() };
  s.machines.splice(i, 1);
  marketOf(s).outbox.push(entry);
  return entry;
}
// La base confirmó la publicación.
export function listConfirmed(s, nonce) {
  const mk = marketOf(s);
  mk.outbox = mk.outbox.filter((x) => x.nonce !== nonce);
}
// La base rechazó la publicación: la máquina vuelve tal cual estaba.
export function listRejected(s, nonce) {
  const mk = marketOf(s);
  const e = mk.outbox.find((x) => x.nonce === nonce);
  if (!e) return null;
  mk.outbox = mk.outbox.filter((x) => x.nonce !== nonce);
  return MACHINES[e.model] ? addMachine(s, e.model, e.paid || 0, false, e.wear) : null;
}
// ---------- Canje entre makers: ofertas por una máquina de Usados ----------
// Lo ofrecido (hasta 3 máquinas + plata + hasta 20 fichas) queda apartado en la partida
// hasta que la base confirma la oferta; si el dueño no acepta, vuelve (ver offerBack).
export const OFFER_MAX_TOKENS = 20;
export const itemValue = (it) => Math.round((MACHINES[it.model]?.cost || 0) * 0.65 * (1 - 0.5 * (Number(it.wear) || 0)));
export function offerReason(s, it, mids, cash, tokens) {
  if (!MACHINES[it.model]) return 'Máquina desconocida';
  if (it.mine) return 'Es tuya';
  if (!machineUnlocked(s, it.model)) return machineLockReason(s, it.model).join(' · ') || 'Todavía no la podés usar';
  if (mids.length > TRADE_MAX) return `Hasta ${TRADE_MAX} máquinas`;
  if (mids.some((id) => !s.machines.some((m) => m.id === id))) return 'Esa máquina ya no está';
  if (mids.length && mids.length >= s.machines.length) return 'Tenés que quedarte con al menos una máquina';
  if (!roomFor(s, it.model, mids)) return hasFloors(s) ? 'Sin lugar en ese piso' : 'Sin lugar en el taller';
  if (cash > s.money) return 'Te falta plata';
  if (cash > it.price) return 'Ofrecés más que el precio: comprala directo';
  if (tokens > (s.tokens || 0)) return 'No tenés tantas fichas';
  if (tokens > OFFER_MAX_TOKENS) return `Hasta ${OFFER_MAX_TOKENS} fichas`;
  if (!mids.length && !(cash > 0) && !(tokens > 0)) return 'Ofrecé algo: máquinas, plata o fichas';
  return null;
}
// Aparta lo ofrecido (sale del taller y de la caja) hasta que la base confirme la oferta.
export function offerEscrow(s, it, mids, cash, tokens, nonce) {
  const c = Math.max(0, Math.round(cash || 0));
  const tk = Math.max(0, Math.floor(tokens || 0));
  if (offerReason(s, it, mids, c, tk)) return null;
  const items = s.machines.filter((m) => mids.includes(m.id)).map((m) => ({ model: m.model, wear: wear3(m.wear), paid: m.paid || 0 }));
  s.machines = s.machines.filter((m) => !mids.includes(m.id));
  s.money -= c;
  s.tokens -= tk;
  const entry = { kind: 'offer', nonce, listing: it.id, model: it.model, items, money: c, tokens: tk, at: Date.now() };
  marketOf(s).outbox.push(entry);
  return entry;
}
// Devuelve lo apartado: la oferta no se pudo mandar (offerRejectedLocal) o no prosperó (offerBack).
function giveBack(s, items, cash, tokens) {
  for (const x of items || []) if (MACHINES[x.model]) addMachine(s, x.model, x.paid || Math.round(MACHINES[x.model].cost * 0.5), false, wear3(x.wear));
  s.money += Math.max(0, Number(cash) || 0);
  s.tokens = (s.tokens || 0) + Math.max(0, Number(tokens) || 0);
}
export function offerRejectedLocal(s, nonce) {
  const mk = marketOf(s);
  const e = mk.outbox.find((x) => x.nonce === nonce);
  if (!e) return null;
  mk.outbox = mk.outbox.filter((x) => x.nonce !== nonce);
  giveBack(s, e.items, e.money, e.tokens);
  return e;
}
const fitsAll = (s, items) => fitsModels(s, (items || []).map((x) => x.model).filter((md) => MACHINES[md]));
export function offerBack(s, it) {
  const key = 'o' + it.id;
  if (marketDone(s, key)) return { done: true };
  const items = it.items || [];
  if (!fitsAll(s, items)) return null;
  giveBack(s, items, it.money, it.tokens);
  markDone(s, key);
  return { ok: true };
}
// Vendiste por canje: entran las máquinas, la plata (no cuenta como ganado) y las fichas.
export function tradeGot(s, it) {
  const key = 's' + it.id;
  if (marketDone(s, key)) return { done: true };
  const items = it.items || [];
  if (!fitsAll(s, items)) return null;
  for (const x of items) if (MACHINES[x.model]) { const m = addMachine(s, x.model, Math.round(MACHINES[x.model].cost * 0.5), false, wear3(x.wear)); m.used = true; }
  s.money += Math.max(0, Number(it.money) || 0);
  s.tokens = (s.tokens || 0) + Math.max(0, Number(it.tokens) || 0);
  markDone(s, key);
  s.stats.usedSold = (s.stats.usedSold || 0) + 1;
  s.stats.tradeIns = (s.stats.tradeIns || 0) + 1;
  return { ok: true };
}

// ¿Se puede comprar esta usada? Devuelve el motivo si no.
export function buyUsedReason(s, it) {
  if (!MACHINES[it.model]) return 'Máquina desconocida';
  if (it.mine) return 'Es tuya';
  if (!machineUnlocked(s, it.model)) return machineLockReason(s, it.model).join(' · ') || 'Todavía no la podés usar';
  if (!roomFor(s, it.model)) return hasFloors(s) ? 'Sin lugar en ese piso' : 'Sin lugar en el taller';
  if (s.money < it.price) return 'Te falta plata';
  return null;
}
// Entra al taller una usada que compraste (se paga acá).
export function receiveUsed(s, it) {
  const key = 'b' + it.id;
  if (marketDone(s, key) || !MACHINES[it.model]) return null;
  if (!roomFor(s, it.model)) return null;
  if (!it.prepaid) s.money = Math.max(0, s.money - it.price); // por canje ya se pagó con lo apartado
  const m = addMachine(s, it.model, it.price, false, wear3(it.wear));
  m.used = true;
  markDone(s, key);
  s.stats.usedBought = (s.stats.usedBought || 0) + 1;
  return m;
}
// Vendiste una usada: entra la plata (no cuenta como "ganado": no suma puntos ni Oficio).
export function settleSale(s, it) {
  const key = 's' + it.id;
  if (marketDone(s, key)) return false;
  s.money += Math.max(0, Number(it.price) || 0);
  markDone(s, key);
  s.stats.usedSold = (s.stats.usedSold || 0) + 1;
  return true;
}
// Vuelve una publicación que no se vendió. Si ya no la podés usar (por ejemplo,
// después de una Mudanza), se vende al por mayor a la mitad.
export function takeBack(s, it) {
  const key = 's' + it.id;
  if (marketDone(s, key)) return { done: true };
  if (!MACHINES[it.model] || !machineUnlocked(s, it.model)) {
    const cash = Math.round((Number(it.price) || 0) * 0.5);
    s.money += cash;
    markDone(s, key);
    return { cash };
  }
  if (!roomFor(s, it.model)) return null;
  const m = addMachine(s, it.model, Number(it.price) || 0, false, wear3(it.wear));
  markDone(s, key);
  return { machine: m };
}

export function buyUpgrade(s, id) {
  if (!upgradeUnlocked(s, id) || upgradeMaxed(s, id)) return false;
  const c = upgradeCost(s, id);
  if (s.money < c) return false;
  s.money -= c;
  s.upgrades[id] = lvlOf(s, id) + 1;
  s.stats.upgrades = (s.stats.upgrades || 0) + 1;
  return true;
}
export function nextSpace(s) { return SPACES[s.space + 1] || null; }
export function buySpace(s) {
  const sp = nextSpace(s);
  if (!sp || repLevel(s) < sp.rep || s.money < sp.cost) return false;
  s.money -= sp.cost;
  s.space++;
  return true;
}
export function buyMat(s, mat, n = 1) {
  if (!materialUnlocked(s, mat)) return false;
  const c = matPrice(s, mat) * n;
  if (s.money < c) return false;
  s.money -= c;
  s.mat[mat] += UNIT * n;
  s.stats.spools += n; s.run.spools += n;
  return true;
}
export const buySpool = buyMat;
export function setProduct(s, mid, pid) {
  const m = s.machines.find((x) => x.id === mid);
  if (!m || !canPrint(s, m, pid)) return false;
  m.product = pid;
  if (m.state === 'printing' && !m.curOrder && !m.event && m.progress < m.need * 0.1 && m.cur !== pid) {
    const old = PRODUCTS[m.cur];
    s.mat[old.mat] += old.use;
    m.state = 'idle'; m.cur = null;
    startPiece(s, m, []);
  } else if (m.state === 'idle' || m.state === 'nofil') {
    if (!m.waitStart) startPiece(s, m, []);
  }
  return true;
}
export function useMate(s, ctx = {}) {
  const out = ctx.out || (ctx.out = []);
  if (rule(s, 'sinmate') || s.time < s.mate.ready) return false;
  s.mate.until = s.time + mateDuration(s);
  s.mate.ready = s.time + mateCooldown(s);
  s.stats.mates++; s.run.mates++;
  out.push({ type: 'mate' });
  return true;
}

// ---------- Pedidos ----------
function productFeasible(s, pid, minStars = 1) {
  if (!productUnlocked(s, pid)) return false;
  return s.machines.some((m) => canPrint(s, m, pid) && machineStars(s, m) >= minStars);
}
const tplStars = (s, tpl) => Math.max(tpl.minStars || 1, rule(s, 'exigente') ? 3 : 1);
function templateFeasible(s, tpl) {
  return tpl.items.every(([pid]) => productFeasible(s, pid, Math.max(tplStars(s, tpl), PRODUCTS[pid].minStars || 1)));
}
function makeOffer(s, tpl, opts = {}) {
  const fid = s.orders.fidelity[tpl.id] || 0;
  const frequent = tpl.frequent && fid > 0;
  const minStars = tplStars(s, tpl);
  const items = tpl.items.map(([p, q]) => ({ p, qty: Math.max(1, Math.round(q * (opts.qtyMult || 1))), done: 0 }));
  let base = 0;
  for (const it of items) base += it.qty * pieceValue(s, it.p, Math.max(minStars, PRODUCTS[it.p].minStars || 1));
  const mult = (opts.mult ?? tpl.mult) * orderMult(s) * (frequent ? 1 + 0.1 * Math.min(5, fid) : 1);
  return {
    id: s.orders.nextId++, tpl: tpl.id, client: tpl.client, title: opts.title || tpl.title, flavor: opts.flavor ?? tpl.flavor,
    items, time: Math.round((opts.time || tpl.time) * (rule(s, 'exigente') ? 0.7 : 1)), reward: Math.round(base * mult), rep: tpl.rep, minStars,
    expires: s.time + (opts.life || ORDER_OFFER_LIFE), urgent: !!opts.urgent, contract: !!opts.contract, tokens: opts.tokens || 0, frequent,
  };
}
function spawnOffer(s, forceTpl) {
  const busy = new Set([...s.orders.offers, ...s.orders.active].map((o) => o.tpl));
  let tpl = forceTpl ? ORDER_TEMPLATES.find((t) => t.id === forceTpl) : null;
  if (!tpl) {
    // Los pedidos de nivel más alto que podés hacer salen más seguido.
    const list = ORDER_TEMPLATES.map((t, i) => ({ t, i })).filter(({ t }) => !busy.has(t.id) && templateFeasible(s, t));
    const maxI = list.length ? Math.max(...list.map((x) => x.i)) : 0;
    tpl = pickWeighted(s, list.map(({ t, i }) => ({ v: t, w: t.weight * (t.frequent && s.orders.fidelity[t.id] ? 2 : 1) * (i >= maxI - 6 ? 2 : 1) })));
  }
  if (!tpl) return null;
  const o = makeOffer(s, tpl);
  s.orders.offers.push(o);
  return o;
}
function feasibleProducts(s, filter = () => true) {
  return PRODUCT_ORDER.filter((pid) => filter(PRODUCTS[pid]) && productFeasible(s, pid, PRODUCTS[pid].minStars || 1));
}
export function spawnUrgent(s) {
  const prods = feasibleProducts(s, (p) => p.size !== 'XL');
  if (!prods.length) return null;
  const pid = prods[Math.floor(rand(s) * prods.length)];
  const best = Math.max(...s.machines.filter((m) => canPrint(s, m, pid)).map((m) => machineSpeed(s, m, false)));
  const qty = Math.max(1, Math.floor((150 * best) / PRODUCTS[pid].time));
  const tpl = { id: 'urgente', client: 'Cliente apurado', title: `Urgente: ${qty} × ${PRODUCTS[pid].name.toLowerCase()}`, items: [[pid, qty]], time: 240, mult: 5, rep: 2 };
  const o = makeOffer(s, tpl, { urgent: true, life: 90, flavor: '«Lo necesito para mañana a primera hora».' });
  s.orders.offers.unshift(o);
  return o;
}
// Pedido combinado (Nave y Planta): una pieza de cada tecnología que tengas (por ejemplo,
// placa láser + soporte FDM + pieza CNC). Paga ×3,5 y da una ficha por tecnología.
export function spawnCombo(s) {
  if (!hasFloors(s)) return null;
  const byTech = FLOORS.map((f) => feasibleProducts(s, (p) => p.tech === f.id)).map((l, i) => [FLOORS[i], l]).filter(([, l]) => l.length);
  if (byTech.length < 2) return null;
  const picks = byTech.slice(0, 4).map(([f, l]) => [f, l.sort((a, b) => PRODUCTS[b].price - PRODUCTS[a].price)[Math.floor(rand(s) * Math.min(3, l.length))]]);
  const duration = 1500 + Math.round(rand(s) * 3) * 300;
  const items = picks.map(([f, pid]) => {
    const fm = floorMachines(s, f.id).filter((m) => canPrint(s, m, pid));
    const speed = fm.reduce((a, m) => a + machineSpeed(s, m, false), 0) || 1;
    return [pid, Math.max(2, Math.round((speed * duration * 0.18) / PRODUCTS[pid].time))];
  });
  const client = COMBO_CLIENTS[Math.floor(rand(s) * COMBO_CLIENTS.length)];
  const names = picks.map(([f]) => f.name).join(' + ');
  const tpl = { id: 'combinado', client, title: `Combinado ${names}: ${client}`, items, time: duration, mult: 3.5, rep: 3 + picks.length };
  const o = makeOffer(s, tpl, { contract: true, life: 600, tokens: picks.length,
    flavor: `Pedido combinado: necesita trabajo de ${names}. Paga ×3,5 y da ${picks.length} fichas.` });
  o.combo = true;
  s.orders.offers.unshift(o);
  return o;
}
// Contrato de empresa: 2 o 3 productos, plazo largo, paga ×4 y da fichas.
export function spawnContract(s) {
  const prods = feasibleProducts(s);
  if (!prods.length) return null;
  const ranked = prods.sort((a, b) => PRODUCTS[b].price - PRODUCTS[a].price).slice(0, 6);
  const n = Math.min(ranked.length, 2 + (rand(s) < 0.4 ? 1 : 0));
  const chosen = [];
  while (chosen.length < n) { const p = ranked[Math.floor(rand(s) * ranked.length)]; if (!chosen.includes(p)) chosen.push(p); }
  const duration = 1800 + Math.round(rand(s) * 4) * 300; // 30 a 50 min
  const capacity = s.machines.reduce((a, m) => a + machineSpeed(s, m, false), 0) * duration * 0.22;
  const items = chosen.map((pid) => [pid, Math.max(2, Math.round(capacity / chosen.length / PRODUCTS[pid].time))]);
  const client = CONTRACT_CLIENTS[Math.floor(rand(s) * CONTRACT_CLIENTS.length)];
  const lvl = repLevel(s);
  const tokens = 2 + (n === 3 ? 1 : 0) + (lvl >= 10 ? 1 : 0);
  const premium = s.space >= 6; // Planta 3DBAT: contratos especiales de alto valor
  const tpl = { id: 'contrato', client, title: `${premium ? 'Contrato especial' : 'Contrato'}: ${client}`, items, time: duration, mult: premium ? 5.5 : 4, rep: 4 + Math.floor(lvl / 2) };
  const o = makeOffer(s, tpl, { contract: true, life: 600, tokens: tokens + (premium ? 2 : 0),
    flavor: premium ? 'Contrato especial de la Planta 3DBAT: paga ×5,5, mucha reputación y fichas.' : 'Contrato de empresa: paga ×4, suma mucha reputación y fichas.' });
  s.orders.offers.unshift(o);
  return o;
}
function compatible(s, m, o) {
  return o.items.some((it) => it.done < it.qty && canPrint(s, m, it.p) && machineStars(s, m) >= Math.max(o.minStars, PRODUCTS[it.p].minStars || 1));
}
export function orderCompatibleMachines(s, o) { return s.machines.filter((m) => compatible(s, m, o)); }
export function suggestAssign(s, o, timeLeft = o.time) {
  const free = s.machines.filter((m) => !m.orderId && compatible(s, m, o))
    .sort((a, b) => machineSpeed(s, b, false) - machineSpeed(s, a, false));
  let work = 0;
  for (const it of o.items) work += (it.qty - it.done) * PRODUCTS[it.p].time;
  const pick = [];
  let cap = 0;
  for (const m of free) {
    if (pick.length && cap >= work) break;
    pick.push(m);
    cap += machineSpeed(s, m, false) * timeLeft * 0.75;
  }
  // Cada producto del pedido necesita al menos una máquina que lo pueda hacer.
  for (const it of o.items) {
    if (pick.some((m) => canPrint(s, m, it.p))) continue;
    const extra = free.find((m) => !pick.includes(m) && canPrint(s, m, it.p));
    if (extra) pick.push(extra);
  }
  return { machines: pick, enough: cap >= work };
}
export function acceptOrder(s, oid) {
  const i = s.orders.offers.findIndex((x) => x.id === oid);
  if (i < 0) return false;
  const o = s.orders.offers[i];
  const { machines } = suggestAssign(s, o);
  if (!machines.length) return false;
  s.orders.offers.splice(i, 1);
  o.deadline = s.time + o.time;
  s.orders.active.push(o);
  for (const m of machines) m.orderId = o.id;
  return true;
}
export function declineOrder(s, oid) { s.orders.offers = s.orders.offers.filter((x) => x.id !== oid); }
export function assignMore(s, oid, delta) {
  const o = s.orders.active.find((x) => x.id === oid);
  if (!o) return false;
  if (delta > 0) {
    const m = s.machines.filter((x) => !x.orderId && compatible(s, x, o))
      .sort((a, b) => machineSpeed(s, b, false) - machineSpeed(s, a, false))[0];
    if (!m) return false;
    m.orderId = o.id;
  } else {
    const mine = s.machines.filter((x) => x.orderId === o.id).sort((a, b) => machineSpeed(s, a, false) - machineSpeed(s, b, false));
    if (!mine.length) return false;
    mine[0].orderId = null;
  }
  return true;
}
function releaseOrder(s, oid) { for (const m of s.machines) if (m.orderId === oid) m.orderId = null; }
function completeOrder(s, o, out) {
  s.orders.active = s.orders.active.filter((x) => x.id !== o.id);
  releaseOrder(s, o.id);
  addMoney(s, o.reward);
  addRep(s, o.rep, out);
  if (o.tokens) s.tokens += o.tokens;
  s.stats.orders++; s.run.orders++;
  if (o.urgent) s.stats.urgentDone++;
  if (o.contract) s.stats.contracts = (s.stats.contracts || 0) + 1;
  if (o.tpl === 'exposicion') s.stats.exposicion++;
  s.orders.fidelity[o.tpl] = (s.orders.fidelity[o.tpl] || 0) + 1;
  out.push({ type: 'orderDone', oid: o.id, reward: o.reward, rep: o.rep, title: o.title, tpl: o.tpl, tokens: o.tokens, urgent: o.urgent, contract: o.contract });
}
function failOrder(s, o, out) {
  s.orders.active = s.orders.active.filter((x) => x.id !== o.id);
  releaseOrder(s, o.id);
  let pay = 0;
  for (const it of o.items) pay += it.done * pieceValue(s, it.p, 1);
  addMoney(s, pay);
  loseRep(s, 1);
  s.stats.ordersFailed++;
  out.push({ type: 'orderFail', oid: o.id, pay, title: o.title });
}
function stepOrders(s, dt, ctx) {
  const O = s.orders;
  O.offers = O.offers.filter((o) => o.expires > s.time);
  for (const o of [...O.active]) if (s.time >= o.deadline) failOrder(s, o, ctx.out);
  if (s.tutorial.active && !s.tutorial.orders) return;
  if (rule(s, 'mostrador')) { O.offers = []; return; }
  O.spawnT += dt;
  const normal = O.offers.filter((o) => !o.contract).length + O.active.filter((o) => !o.contract).length;
  if (normal < boardSize(s) && O.spawnT >= ORDER_SPAWN_EVERY) {
    O.spawnT = 0;
    const o = spawnOffer(s, s.tutorial.active ? 'vecina' : null);
    if (o) ctx.out.push({ type: 'offer', oid: o.id });
  }
  // Contratos de empresa (desde Reputación 5)
  if (!s.tutorial.active && repLevel(s) >= 5) {
    O.contractT -= dt;
    const hasContract = [...O.offers, ...O.active].some((o) => o.contract && !o.combo);
    if (O.contractT <= 0 && !hasContract) {
      O.contractT = 900 + rand(s) * 600;
      const o = spawnContract(s);
      if (o) ctx.out.push({ type: 'contract', oid: o.id });
    }
  }
  // Pedidos combinados entre tecnologías (desde la Nave de producción)
  if (!s.tutorial.active && hasFloors(s)) {
    O.comboT = (O.comboT ?? 420) - dt;
    if (O.comboT <= 0 && ![...O.offers, ...O.active].some((o) => o.combo)) {
      O.comboT = 1100 + rand(s) * 700;
      const o = spawnCombo(s);
      if (o) ctx.out.push({ type: 'combo', oid: o.id });
    }
  }
  if (has(s, 'gestor')) {
    O.gestorT += dt;
    if (O.gestorT >= 3) {
      O.gestorT = 0;
      for (const o of [...O.offers]) {
        if (o.tpl === 'exposicion' && o.reward === 0) continue;
        if (suggestAssign(s, o).enough) { acceptOrder(s, o.id); ctx.out.push({ type: 'gestor', oid: o.id }); }
      }
    }
  }
}

// ---------- Tendencia ----------
function stepTrend(s) {
  if (s.time < s.trend.next) return null;
  const list = feasibleProducts(s, (p) => p.size !== 'XL');
  if (list.length < 2) { s.trend.next = s.time + 60; return null; }
  let p = list[Math.floor(rand(s) * list.length)];
  if (p === s.trend.p) p = list[(list.indexOf(p) + 1) % list.length];
  s.trend = { p, until: s.time + 480, next: s.time + 720 };
  return p;
}

// ---------- Eventos globales ----------
function startGlobal(s, id, out) {
  const g = { id, since: s.time };
  if (id === 'corte') { s.lastCorte = s.time; s.lastNeg = s.time; }
  if (id === 'cambio') {
    const cands = s.orders.active.filter((o) => o.items.some((i) => i.done < i.qty));
    g.oid = cands[Math.floor(rand(s) * cands.length)].id;
  }
  if (id === 'misteriosa') g.price = Math.round(matPrice(s, 'PLA') * 2 * 0.4);
  if (id === 'feria') g.price = Math.round(Math.max(200, potentialRate(s) * 30));
  s.global = g;
  out.push({ type: 'global', id });
}
function stepGlobal(s, ctx) {
  const out = ctx.out;
  if (s.global) {
    const g = s.global;
    if (g.id !== 'corte' && s.time > g.since + 60) s.global = null;
    if (g.id === 'cambio' && !s.orders.active.some((o) => o.id === g.oid)) s.global = null;
    return;
  }
  if (s.tutorial.active) return;
  // Desafío «Verano porteño»: corte cada 6 minutos.
  if (rule(s, 'verano') && s.time - s.lastCorte >= 360 && s.time > 120) { startGlobal(s, 'corte', out); return; }
  if (s.time < s.nextGlobal) return;
  s.nextGlobal = s.time + 220 + rand(s) * 200;
  const negOk = !ctx.idle && s.time - s.lastNeg >= 60;
  const printing = s.machines.filter((m) => m.state === 'printing').length;
  const list = [];
  const add = (id, ok) => { if (ok) list.push({ v: id, w: GLOBAL_EVENTS[id].weight }); };
  add('corte', negOk && printing >= 3 && s.time - s.lastCorte > 900);
  add('cambio', !ctx.idle && s.orders.active.some((o) => o.items.some((i) => i.done < i.qty) && o.deadline - s.time > 120));
  add('favor', !ctx.idle && s.mat.PLA >= 8);
  add('viral', !ctx.idle && s.stats.pieces > 30);
  add('misteriosa', !ctx.idle && s.money >= matPrice(s, 'PLA'));
  add('urgente', !rule(s, 'mostrador') && s.orders.offers.length + s.orders.active.length <= boardSize(s));
  add('feria', !ctx.idle && s.space >= 1);
  const id = pickWeighted(s, list);
  if (!id) return;
  if (id === 'urgente') {
    const o = spawnUrgent(s);
    if (o) out.push({ type: 'urgent', oid: o.id });
    return;
  }
  startGlobal(s, id, out);
}
export function upsActive(s) { return has(s, 'ups') || mastered(s, 'verano'); }
export function resolveGlobal(s, opt, ctx = {}) {
  const out = ctx.out || (ctx.out = []);
  const g = s.global;
  if (!g) return false;
  if (g.id === 'corte') {
    if (s.time < g.since + 8) return false;
    if (!upsActive(s)) for (const m of s.machines) if (m.state === 'printing') m.progress = 0;
    s.stats.cortes++;
  } else if (g.id === 'cambio' && opt === 0) {
    const o = s.orders.active.find((x) => x.id === g.oid);
    if (o) {
      for (const it of o.items) it.qty = Math.ceil(it.qty * 1.3);
      o.reward = Math.round(o.reward * 1.4);
      o.deadline += o.time * 0.3;
    }
  } else if (g.id === 'favor' && opt === 0) {
    if (s.mat.PLA >= 8) s.mat.PLA -= 8;
    addRep(s, 1, out);
    s.stats.favors++;
  } else if (g.id === 'viral' && opt === 0) {
    s.boost.viral = s.time + 180;
  } else if (g.id === 'misteriosa' && opt === 0) {
    if (s.money < g.price) return false;
    s.money -= g.price;
    s.mat.PLA += UNIT * 2;
    s.boost.risky = s.time + 600;
  } else if (g.id === 'feria' && opt === 0) {
    if (s.money < g.price) return false;
    s.money -= g.price;
    s.boost.feria = s.time + 300;
  }
  s.global = null;
  out.push({ type: 'globalDone', id: g.id, opt });
  return true;
}

// ---------- Tick ----------
export function tick(s, dt, ctx = {}) {
  ctx.out = ctx.out || [];
  s.time += dt;
  s.stats.playSecs = (s.stats.playSecs || 0) + dt;
  const blackout = s.global && s.global.id === 'corte';
  for (const m of s.machines) stepMachine(s, m, dt, ctx, blackout);
  if (has(s, 'sobrino') && !has(s, 'expulsion')) {
    const every = mastered(s, 'amano') ? 4 : 8;
    s.helperT = Math.min(every, s.helperT + dt);
    if (s.helperT >= every) {
      const done = s.machines.filter((m) => m.state === 'done' && !m.event).sort((a, b) => a.doneAt - b.doneAt)[0];
      if (done) { retrieve(s, done.id, ctx, 'sobrino'); s.helperT = 0; }
    }
  }
  stepOrders(s, dt, ctx);
  const tp = stepTrend(s);
  if (tp) ctx.out.push({ type: 'trend', pid: tp });
  stepGlobal(s, ctx);
  return ctx.out;
}

// ---------- Producción en bloque (offline y salto temporal) ----------
function bulkProduce(s, t, eff, payMaterials = true) {
  const byMat = {};
  const perProduct = {};
  for (const m of s.machines) {
    const pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
    if (!pid) continue;
    const p = PRODUCTS[pid];
    const sp = machineSpeed(s, m, false);
    const b = byMat[p.mat] || (byMat[p.mat] = { v: 0, g: 0, prods: [] });
    b.v += pieceValue(s, pid, machineStars(s, m)) * sp / p.time;
    b.g += p.use * sp / p.time;
    b.prods.push({ pid, pcs: sp / p.time });
  }
  let earned = 0, pieces = 0, spools = 0, cost = 0;
  const stopped = [];
  for (const [mat, b] of Object.entries(byMat)) {
    let secsM = t;
    if (payMaterials) {
      const need = b.g * t;
      if (need <= s.mat[mat]) s.mat[mat] -= need;
      else if (hasProveedor(s) && materialUnlocked(s, mat)) {
        const short = need - s.mat[mat];
        const n = Math.ceil(short / UNIT);
        spools += n; cost += n * matPrice(s, mat) * 1.1;
        s.mat[mat] = n * UNIT - short;
      } else {
        secsM = b.g > 0 ? s.mat[mat] / b.g : t;
        s.mat[mat] = 0;
        if (secsM < t) stopped.push(mat);
      }
    }
    earned += b.v * secsM * eff;
    for (const x of b.prods) {
      const n = Math.floor(x.pcs * secsM * eff);
      pieces += n;
      perProduct[x.pid] = (perProduct[x.pid] || 0) + n;
    }
  }
  earned = Math.max(0, earned - cost);
  addMoney(s, earned);
  s.stats.pieces += pieces; s.run.pieces += pieces;
  for (const [pid, n] of Object.entries(perProduct)) {
    s.mastery[pid] = (s.mastery[pid] || 0) + n;
    s.run.products[pid] = (s.run.products[pid] || 0) + n;
  }
  s.stats.spools += spools; s.run.spools += spools;
  return { earned, pieces, spools, stopped, perProduct };
}
// BATI cuida el taller mientras no estás: resuelve lo pendiente y produce a menor rendimiento.
export function applyOffline(s, secs) {
  const capS = offlineCapH(s) * 3600;
  const t = Math.min(secs, capS);
  const eff = offlineEff(s);
  const ctx = { out: [] };
  let fixed = 0;
  for (const m of s.machines) if (m.event) { resolveEvent(s, m.id, 0, ctx); fixed++; }
  if (s.global && s.global.id === 'corte') { s.global.since = -1e9; resolveGlobal(s, 0, ctx); fixed++; }
  else s.global = null;
  for (const m of s.machines) if (m.state === 'done') retrieve(s, m.id, ctx, 'bati');
  for (const m of s.machines) if (m.waitStart) m.waitStart = false;
  const r = bulkProduce(s, t, eff, true);
  // Con el gestor, los clientes se siguen atendiendo: suma reputación.
  let repGain = 0;
  if (has(s, 'gestor') && !rule(s, 'mostrador')) {
    repGain = Math.floor((t / 3600) * repLevel(s) * 6 * eff);
    if (repGain > 0) addRep(s, repGain, ctx.out);
  }
  s.stats.maxOffline = Math.max(s.stats.maxOffline || 0, secs);
  return { secs, counted: t, capped: secs > capS, eff, fixed, out: ctx.out, repGain, ...r };
}

// ---------- Tienda de fichas ----------
export function buyTokenItem(s, id, TOKEN_SHOP) {
  const it = TOKEN_SHOP[id];
  if (!it || s.tokens < it.cost) return null;
  let result = {};
  if (id === 'turbo') s.boost.turbo = Math.max(s.time, s.boost.turbo) + 1200;
  else if (id === 'salto') result = bulkProduce(s, 3600, 1, false);
  else if (id === 'vip') { if (rule(s, 'mostrador') || !spawnContract(s)) return null; }
  else if (id === 'materiales') { for (const k of MATERIAL_ORDER) if (materialUnlocked(s, k)) s.mat[k] += UNIT * 5; }
  s.tokens -= it.cost;
  return { ok: true, ...result };
}

// ---------- Mudanza (prestigio) y desafíos de maestría ----------
export function oficioGain(s) { return Math.floor(2 * Math.sqrt(s.runEarned / OFICIO_SCALE)); }
export const firstOficioAt = () => OFICIO_SCALE / 4;
export function canMove(s) {
  const g = oficioGain(s);
  return g >= 1 && (s.space >= 3 || g >= 3);
}
function keepForMove(s, prestige) {
  const keepFrac = prestige.perks.fieles2 ? 0.5 : prestige.perks.fieles ? 0.25 : 0;
  return {
    keptRep: Math.floor(s.rep * keepFrac),
    name: s.name, totalEarned: s.totalEarned, stats: s.stats, achievements: s.achievements, mastery: s.mastery,
    tokens: s.tokens, daily: s.daily, weekly: s.weekly, prestige, settings: s.settings, seen: s.seen, cosmetics: s.cosmetics,
    market: s.market,
    orders: { fidelity: s.orders.fidelity },
  };
}
function clonePrestige(s) {
  return { ...s.prestige, perks: { ...s.prestige.perks }, vitrina: [...s.prestige.vitrina], mastery: { ...(s.prestige.mastery || {}) } };
}
export function doMove(s, vitrinaPid, challenge = null) {
  if (!canMove(s) && !challenge) return null;
  const gain = canMove(s) ? oficioGain(s) : 0;
  const prestige = clonePrestige(s);
  prestige.points += gain;
  prestige.total += gain;
  if (gain > 0) prestige.moves++;
  if (gain > 0 && vitrinaPid && PRODUCTS[vitrinaPid]) prestige.vitrina.push({ p: vitrinaPid, move: prestige.moves, space: s.space });
  return newGame(keepForMove(s, prestige), s.rng ^ 0x9e3779b9, challenge);
}
export const challengesUnlocked = (s) => s.prestige.moves >= 1;
export function startChallenge(s, id, vitrinaPid) {
  if (!challengesUnlocked(s) || !MASTERY_CHALLENGES[id] || s.challenge) return null;
  return doMove(s, vitrinaPid, id);
}
export function abandonChallenge(s) { s.challenge = null; }
export function challengeProgress(s) {
  const c = s.challenge && MASTERY_CHALLENGES[s.challenge.id];
  if (!c) return null;
  const g = c.goal;
  const parts = [];
  if (g.space != null) parts.push({ label: SPACES[g.space].name, done: s.space >= g.space });
  if (g.earned != null) parts.push({ label: 'Ganancia', done: s.runEarned >= g.earned, frac: Math.min(1, s.runEarned / g.earned) });
  if (g.orders != null) parts.push({ label: 'Pedidos', done: s.run.orders >= g.orders, frac: Math.min(1, s.run.orders / g.orders) });
  return { id: s.challenge.id, def: c, parts, done: parts.every((p) => p.done) };
}
export function buyPerk(s, id, PERKS) {
  const P = PERKS[id];
  if (!P || s.prestige.perks[id] || s.prestige.points < P.cost) return false;
  s.prestige.points -= P.cost;
  s.prestige.perks[id] = true;
  if (id === 'sobrino') s.upgrades.sobrino = Math.max(1, lvlOf(s, 'sobrino'));
  if (id === 'proveedor') s.upgrades.proveedor = Math.max(1, lvlOf(s, 'proveedor'));
  if (id === 'saberpetg') { s.upgrades.petg = 1; s.upgrades.directo = 1; }
  if (id === 'saberresina') s.upgrades.resina = 1;
  if (id === 'saberlaser') s.upgrades.laser = 1;
  if (id === 'sabercnc') s.upgrades.cnc = 1;
  return true;
}

// ---------- Guardado ----------
export function serialize(s) {
  s.lastSeen = Date.now();
  return JSON.stringify(s);
}
// Partidas de la v0.1 (máquinas genéricas) → v0.2 (marcas reales).
const V1_MODELS = { kit: 'ender3', cartesiana: 'magna', rayo: 'k1c', bunker: 'p1s', gigante: 'sidewinder' };
const V1_PRODUCTS = { xl: 'casco' };
// Precios y tiempos de la v0.2 (antes de pasar a AR$), para convertir la plata de forma justa:
// lo que tenías ahorrado equivale a los mismos minutos de producción de tu taller.
const V2_PRODUCTS = {
  llavero: [5, 20], benchy: [14, 45], soporte: [35, 90], maceta: [80, 180], gancho: [40, 60], figura: [140, 240], engranaje: [120, 120],
  topes: [90, 120], organizador: [300, 360], llaveromulti: [60, 60], carcasa: [500, 300], casco: [2500, 900], lampara: [700, 420],
  maqueta: [6000, 1500], figurapintada: [2500, 600], dron: [4000, 600], armadura: [40000, 3600], silla: [1.2e5, 7200], industrial: [6e4, 1800],
  miniatura: [600, 600], joya: [3000, 900], dental: [7000, 1200], busto: [3e4, 2400], llaveroacr: [40, 30], posavasos: [120, 60], caja: [500, 120],
  cartel: [4000, 300], mural: [2e5, 3600], tabla: [4000, 600], cartelmad: [4e4, 1800], alu: [6e4, 1200], mueble: [8e5, 7200],
};
// Fórmulas de la v0.2 para estimar el ritmo viejo del taller.
const V2_SPEED = { ender3: 1, magna: 1.3, a1mini: 2.4, kobra3: 2.2, neptune: 1.8, mk4s: 3, k1c: 4, p1s: 4.5, sidewinder: 2.6, k2plus: 5, x1c: 5.5,
  coreone: 5.2, voron: 7.5, h2d: 7, prusaxl: 6.5, giga: 3.5, rack: 40, rackpro: 60, mars: 1, photon: 1.6, saturn: 2.2, form4: 4, falcon: 1, xtools1: 2,
  xtoolp2: 4, g3018: 1, artisan: 2, shapeoko: 4 };
const V2_STAR = [1, 1, 1.25, 1.6, 2, 2.5];
const V2_REP = [0, 0, 3, 8, 16, 30, 55, 90, 140, 220, 330];
function v2RepLevel(rep) { let l = 1; const need = (n) => (n < V2_REP.length ? V2_REP[n] : Math.round(330 * Math.pow(1.45, n - 10))); while (rep >= need(l + 1)) l++; return l; }
function v2Mastery(c) { return c < 25 ? 0 : Math.floor(Math.log(c / 25) / Math.log(2.5) + 1e-9) + 1; }
export function economyFactor(s) {
  let oldR = 0, newR = 0;
  const L = (id) => s.upgrades[id] || 0;
  for (const m of s.machines) {
    const M = MACHINES[m.model];
    const pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
    const o = pid && V2_PRODUCTS[pid];
    if (!o) continue;
    let sp = (V2_SPEED[m.model] || M.speed) * Math.pow(1.2, L('granja'));
    if (M.tech === 'fdm') sp *= Math.pow(1.1, L('slicer')) * Math.pow(1.25, L('hotend')) * (L('input') && M.enclosed ? 1.5 : 1);
    else if (M.tech === 'resin') sp *= Math.pow(1.15, L('exposicion'));
    else if (M.tech === 'laser') sp *= Math.pow(1.15, L('potencia'));
    else sp *= Math.pow(1.15, L('fresas'));
    const val = (o[0] / o[1]) * V2_STAR[machineStars(s, m)] * (1 + 0.05 * (v2RepLevel(s.rep) - 1)) * Math.pow(1.12, L('marca'))
      * Math.pow(1.2, v2Mastery(s.mastery?.[pid] || 0)) * (1 + 0.03 * (s.prestige?.total || 0));
    oldR += val * sp;
    newR += productRate(s, m, pid);
  }
  const f = oldR > 0 ? newR / oldR : 700;
  return Math.max(50, Math.min(5000, f));
}
export function migrate(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.machines) || typeof obj.money !== 'number') return null;
  if ((obj.v || 0) > SAVE_VERSION) return null;
  if ((obj.v || 1) < 2) {
    obj.mat = { ...emptyMats(), ...(obj.fil || {}) };
    delete obj.fil;
    const fixP = (p) => V1_PRODUCTS[p] || p;
    for (const m of obj.machines) {
      m.model = V1_MODELS[m.model] || m.model;
      m.product = fixP(m.product); if (m.cur) m.cur = fixP(m.cur);
    }
    if (obj.upgrades?.input && !obj.upgrades.hotend) obj.upgrades.hotend = 1;
    if (obj.upgrades?.hotend > 3) obj.upgrades.hotend = 3;
    if (obj.trend?.p) obj.trend.p = fixP(obj.trend.p);
    if (obj.run?.products?.xl) { obj.run.products.casco = obj.run.products.xl; delete obj.run.products.xl; }
    if (obj.prestige?.vitrina) for (const v of obj.prestige.vitrina) v.p = fixP(v.p);
    if (obj.orders) { obj.orders.offers = []; obj.orders.active = []; }
    for (const m of obj.machines) { m.orderId = null; m.curOrder = null; }
    obj.mastery = { ...(obj.run?.products || {}) };
  }
  const toV3 = (obj.v || 1) < 3;
  if (toV3) {
    for (const m of obj.machines) m.paid = MACHINES[m.model] ? MACHINES[m.model].cost : 0;
    if (obj.orders) { obj.orders.offers = []; obj.orders.active = []; }
    for (const m of obj.machines) { m.orderId = null; m.curOrder = null; }
    obj.global = null;
  }
  const base = newGame();
  for (const k of Object.keys(base)) if (obj[k] === undefined) obj[k] = base[k];
  obj.machines = obj.machines.filter((m) => MACHINES[m.model]);
  for (const m of obj.machines) {
    if (!PRODUCTS[m.product]) m.product = firstProductOf(MACHINES[m.model].tech);
    if (m.cur && !PRODUCTS[m.cur]) { m.cur = null; m.state = 'idle'; }
  }
  for (const k of Object.keys(obj.upgrades)) if (!UPGRADES[k]) delete obj.upgrades[k];
  obj.mat = { ...emptyMats(), ...obj.mat };
  obj.stats = { ...base.stats, ...obj.stats };
  // Tiempo jugado total (sobrevive a las mudanzas). Las partidas de antes arrancan con el tiempo de la partida actual.
  if (typeof obj.stats.playSecs !== 'number') obj.stats.playSecs = obj.time || 0;
  obj.run = { ...base.run, ...obj.run };
  obj.boost = { ...base.boost, ...obj.boost };
  obj.orders = { ...base.orders, ...obj.orders };
  obj.settings = { ...defaultSettings(), ...obj.settings };
  obj.prestige = { ...base.prestige, ...obj.prestige };
  obj.cosmetics = { ...base.cosmetics, ...obj.cosmetics };
  for (const k of ['unlocked', 'decor']) if (!Array.isArray(obj.cosmetics[k])) obj.cosmetics[k] = [];
  marketOf(obj);
  for (const m of obj.machines) if (typeof m.wear !== 'number' || !(m.wear >= 0)) m.wear = 0;
  if (!obj.prestige.mastery) obj.prestige.mastery = {};
  if (obj.space >= SPACES.length) obj.space = SPACES.length - 1;
  if (toV3) {
    // La plata vale los mismos minutos de producción que antes (ritmo viejo vs. ritmo nuevo del mismo taller).
    const f = economyFactor(obj);
    obj.econFactor = f;
    for (const k of ['money', 'runEarned', 'totalEarned']) obj[k] = (obj[k] || 0) * f;
    obj.stats.earned = (obj.stats.earned || 0) * f;
    for (const set of [obj.daily, obj.weekly]) if (set) for (const c of set.list) if (c.type === 'ganar') { c.target *= f; c.prog *= f; c.base = (c.base || 0) * f; }
  }
  obj.v = SAVE_VERSION;
  return obj;
}

export { MACHINE_ORDER };
