// =====================================================================
// MOTOR DEL JUEGO — lógica pura (sin React ni navegador).
// El estado es un objeto plano y serializable; las funciones lo modifican.
// tick(s, dt, ctx) avanza la simulación dt segundos de juego.
// Lo que la interfaz tiene que mostrar (ventas, eventos, logros) se
// devuelve en ctx.out como una lista de avisos.
// =====================================================================
import {
  MATERIALS, SPOOL_GRAMS, STAR_MULT, SPACES, MACHINES, MACHINE_ORDER, PRODUCTS, PRODUCT_ORDER,
  UPGRADES, REP_LEVELS, REP_PRICE_BONUS, ORDER_TEMPLATES, ORDER_OFFER_LIFE, ORDER_SPAWN_EVERY,
  MACHINE_EVENTS, GLOBAL_EVENTS, OFICIO_BONUS, MAKER_TITLES,
} from './data.js';

export const SAVE_VERSION = 1;

// ---------- Azar con semilla (reproducible para simular y para desafíos futuros) ----------
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
  return { pieces: 0, orders: 0, ordersFailed: 0, mates: 0, events: {}, resolved: 0, urgentDone: 0,
    exposicion: 0, cortes: 0, favors: 0, spools: 0, xl: 0, maxOffline: 0, handRetrieved: 0, earned: 0 };
}
function freshRun() {
  return { pieces: 0, products: {}, mates: 0, orders: 0, spools: 0, xl: 0 };
}
export function defaultSettings() {
  return { sound: true, volume: 0.6, anim: 'full', led: 'cyan', notation: 'short' };
}

export function newGame(keep = null, seed = (Date.now() ^ 0x5bd1e995) >>> 0) {
  const perks = keep?.prestige?.perks || {};
  const s = {
    v: SAVE_VERSION,
    name: keep?.name || '',
    time: 0,
    money: 0,
    runEarned: 0,
    totalEarned: keep?.totalEarned || 0,
    rep: 0,
    fil: { PLA: SPOOL_GRAMS, PETG: 0, TPU: 0 },
    space: 0,
    machines: [],
    nextMid: 1,
    upgrades: {},
    orders: { offers: [], active: [], spawnT: ORDER_SPAWN_EVERY - 8, nextId: 1, fidelity: keep?.orders?.fidelity || {}, gestorT: 0 },
    mate: { until: 0, ready: 0 },
    trend: { p: null, until: 0, next: 600 },
    boost: { viral: 0, risky: 0 },
    global: null,
    nextGlobal: 420,
    lastNeg: 0,
    lastCorte: -99999,
    helperT: 8,
    checkT: 0,
    stats: keep?.stats || freshStats(),
    run: freshRun(),
    missions: { i: keep ? FIRST_FREE_MISSION : 0 },
    achievements: keep?.achievements || {},
    prestige: keep?.prestige || { points: 0, total: 0, perks: {}, moves: 0, vitrina: [] },
    tutorial: { active: !keep },
    seen: keep?.seen || {},
    settings: keep?.settings || defaultSettings(),
    rng: seed >>> 0,
    lastSeen: Date.now(),
  };
  addMachine(s, 'kit', 0, !keep);
  if (perks.mesa) { addMachine(s, 'cartesiana', 0, false); s.money += 200; }
  if (perks.cuarto) s.space = 1;
  if (perks.reputacion) s.rep = REP_LEVELS[3];
  if (perks.sobrino) s.upgrades.sobrino = 1;
  if (perks.proveedor) s.upgrades.proveedor = 1;
  return s;
}
export const FIRST_FREE_MISSION = 5; // las 5 primeras misiones son el tutorial

function addMachine(s, model, paid, waitStart = false) {
  const m = {
    id: s.nextMid++, model, product: 'llavero', orderId: null, state: 'idle',
    progress: 0, need: 0, cur: null, curOrder: null, pen: 0, ev: null, event: null,
    pauseUntil: 0, doneAt: 0, paid, waitStart,
  };
  s.machines.push(m);
  m.product = bestProductFor(s, m) || 'llavero';
  return m;
}

// ---------- Cálculos ----------
export const has = (s, id) => (s.upgrades[id] || 0) > 0;
export const perk = (s, id) => !!s.prestige.perks[id];
export const lvlOf = (s, id) => s.upgrades[id] || 0;

export function repLevel(s) {
  let l = 1;
  for (let i = 1; i < REP_LEVELS.length; i++) if (s.rep >= REP_LEVELS[i]) l = i;
  return l;
}
export function repProgress(s) {
  const l = repLevel(s);
  if (l >= REP_LEVELS.length - 1) return { level: l, frac: 1, cur: s.rep, next: null };
  const a = REP_LEVELS[l], b = REP_LEVELS[l + 1];
  return { level: l, frac: (s.rep - a) / (b - a), cur: s.rep - a, next: b - a };
}
export const repMult = (s) => 1 + REP_PRICE_BONUS * (repLevel(s) - 1);
export const oficioMult = (s) => 1 + OFICIO_BONUS * s.prestige.total;
export function makerTitle(total) {
  let t = MAKER_TITLES[0][1];
  for (const [n, name] of MAKER_TITLES) if (total >= n) t = name;
  return t;
}

export const slots = (s) => SPACES[s.space].slots;

export function machineStars(s, m) {
  const M = MACHINES[m.model];
  let st = M.stars;
  if (has(s, 'calibracion') && (m.model === 'kit' || m.model === 'cartesiana')) st++;
  if (has(s, 'boquilla')) st++;
  if (has(s, 'input') && m.model === 'rayo') st++;
  if (perk(s, 'mirada')) st++;
  return Math.min(5, st);
}
export const mateActive = (s) => s.time < s.mate.until;
export function mateDuration(s) { return 60 + (has(s, 'termo') ? 30 : 0) + (perk(s, 'termo') ? 30 : 0); }
export function mateCooldown(s) { return has(s, 'yerba') ? 180 : 300; }

export function speedMult(s, model, withMate = true) {
  let k = Math.pow(1.15, lvlOf(s, 'slicer'));
  k *= Math.pow(1.5, lvlOf(s, 'hotend'));
  if (has(s, 'input') && (model === 'rayo' || model === 'bunker')) k *= 1.5;
  if (withMate && mateActive(s)) k *= 1.5;
  return k;
}
export const machineSpeed = (s, m, withMate = true) => MACHINES[m.model].speed * speedMult(s, m.model, withMate);

export function materialUnlocked(s, mat) {
  const up = MATERIALS[mat].upgrade;
  return !up || has(s, up);
}
export function productUnlocked(s, pid) {
  const p = PRODUCTS[pid];
  return repLevel(s) >= (p.rep || 1) && s.space >= (p.space || 0) && materialUnlocked(s, p.mat)
    && (!p.xl || s.machines.some((m) => MACHINES[m.model].xl));
}
// Por qué un producto todavía no está (para la interfaz).
export function productLockReason(s, pid) {
  const p = PRODUCTS[pid];
  if (repLevel(s) < (p.rep || 1)) return `Reputación ${p.rep}`;
  if (s.space < (p.space || 0)) return SPACES[p.space].name;
  if (!materialUnlocked(s, p.mat)) return UPGRADES[MATERIALS[p.mat].upgrade].name;
  if (p.xl && !s.machines.some((m) => MACHINES[m.model].xl)) return 'Gran Formato';
  return null;
}
export function canPrint(s, m, pid) {
  const p = PRODUCTS[pid];
  if (!productUnlocked(s, pid)) return false;
  if (p.xl && !MACHINES[m.model].xl) return false;
  return machineStars(s, m) >= (p.minStars || 1);
}
export function pieceValue(s, pid, stars) {
  return PRODUCTS[pid].price * STAR_MULT[Math.max(1, Math.min(5, stars))] * repMult(s) * oficioMult(s) * (1 + 0.2 * lvlOf(s, 'marca'));
}
export const trendActive = (s, pid) => s.trend.p === pid && s.time < s.trend.until;
export function saleMult(s, pid) {
  return (trendActive(s, pid) ? 2 : 1) * (s.time < s.boost.viral ? 2 : 1);
}
// $/s de una máquina fabricando un producto (para elegir y para mostrar)
export function productRate(s, m, pid, withBoosts = false) {
  const p = PRODUCTS[pid];
  const v = pieceValue(s, pid, machineStars(s, m)) * (withBoosts ? saleMult(s, pid) : 1);
  return v * machineSpeed(s, m, withBoosts) / p.time;
}
export function bestProductFor(s, m) {
  let best = null, bv = -1;
  for (const pid of PRODUCT_ORDER) {
    if (!canPrint(s, m, pid)) continue;
    if (s.fil[PRODUCTS[pid].mat] <= 0 && !hasProveedor(s) && PRODUCTS[pid].mat !== 'PLA') continue;
    const v = productRate(s, m, pid);
    if (v > bv) { bv = v; best = pid; }
  }
  return best;
}
export function incomeRate(s) {
  let r = 0;
  for (const m of s.machines) {
    if (m.state !== 'printing' || m.event || m.curOrder) continue;
    r += productRate(s, m, m.cur, true);
  }
  return r;
}
// Ritmo "teórico" del taller (todas las máquinas en lo suyo), para estimar tiempos.
export function potentialRate(s) {
  let r = 0;
  for (const m of s.machines) {
    const pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
    if (pid) r += productRate(s, m, pid);
  }
  return r;
}

export const hasProveedor = (s) => has(s, 'proveedor');
export function spoolPrice(s, mat) {
  return MATERIALS[mat].spool * (has(s, 'bulk') ? 0.8 : 1) * (perk(s, 'proveedor') ? 0.9 : 1);
}
export function machineCost(s, model) {
  const M = MACHINES[model];
  const n = s.machines.filter((m) => m.model === model).length;
  return Math.round(M.cost * Math.pow(M.growth, n));
}
export function upgradeCost(s, id) {
  const U = UPGRADES[id];
  return Math.round(U.cost * Math.pow(U.growth || 1, lvlOf(s, id)));
}
export function machineUnlocked(s, model) {
  const M = MACHINES[model];
  return repLevel(s) >= M.rep && s.space >= M.space;
}
export function upgradeUnlocked(s, id) { return repLevel(s) >= (UPGRADES[id].rep || 1); }
export function boardSize(s) { return (has(s, 'tablero') ? 5 : 3) + (perk(s, 'contactos') ? 1 : 0); }
export function offlineEff(s) { return Math.min(1, (has(s, 'remota') ? 0.8 : 0.5) + (perk(s, 'duermo') ? 0.2 : 0)); }
export function offlineCapH(s) { return (has(s, 'remota') ? 6 : 2) + (perk(s, 'duermo') ? 3 : 0); }

function addMoney(s, x) {
  s.money += x; s.runEarned += x; s.totalEarned += x; s.stats.earned = (s.stats.earned || 0) + x;
}
function addRep(s, n, out) {
  const before = repLevel(s);
  s.rep += n;
  const after = repLevel(s);
  if (after > before) out.push({ type: 'repUp', level: after });
}
function loseRep(s, n) {
  const floor = REP_LEVELS[repLevel(s)];
  s.rep = Math.max(floor, s.rep - n);
}

// ---------- Filamento ----------
function consume(s, mat, grams, out) {
  if (s.fil[mat] >= grams) { s.fil[mat] -= grams; return true; }
  if (hasProveedor(s) && materialUnlocked(s, mat)) {
    const price = spoolPrice(s, mat) * 1.1;
    if (s.money >= price) {
      s.money -= price; s.fil[mat] += SPOOL_GRAMS; s.stats.spools++; s.run.spools++;
      out.push({ type: 'autoSpool', mat });
      s.fil[mat] -= grams;
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
  let pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
  if (pid && pid !== m.product) m.product = pid;
  return pid ? { pid, oid: null } : null;
}

function startPiece(s, m, out) {
  const job = pickJob(s, m);
  if (!job) { m.state = 'idle'; return; }
  const p = PRODUCTS[job.pid];
  if (!consume(s, p.mat, p.grams, out)) {
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
  const add = (id, k) => { if (k > 0) w.push({ v: id, w: MACHINE_EVENTS[id].weight * k }); };
  add('spaghetti', pei);
  if (!M.noWarp && p.mat !== 'TPU') add('warping', pei);
  add('tapada', has(s, 'boquilla') ? 0.3 : 1);
  if (!M.autolevel) add('primeracapa', pei);
  if ((p.mat === 'PETG' || p.mat === 'TPU') && !has(s, 'secador')) add('humedo', 1);
  if (lvlOf(s, 'slicer') < 3) add('orientacion', 1);
  if (!has(s, 'retraccion')) add('stringing', 1);
  add('layershift', m.model === 'kit' ? 1 : m.model === 'cartesiana' ? 0.5 : 0);
  add('gato', 1);
  return w;
}
function rollEvent(s, m) {
  if (s.tutorial.force && !s.tutorial.forced) {
    s.tutorial.forced = true;
    return { id: s.tutorial.force, at: 0.3, forced: true };
  }
  let chance = MACHINES[m.model].fail * (perk(s, 'ojo') ? 0.75 : 1) * (s.time < s.boost.risky ? 2 : 1);
  if (rand(s) >= chance) return null;
  const id = pickWeighted(s, machineEventWeights(s, m));
  if (!id) return null;
  return { id, at: id === 'primeracapa' ? 0.05 : 0.15 + rand(s) * 0.7 };
}
function eventAllowed(s, ctx, ev) {
  if (ev.forced) return true;
  if (s.tutorial.active) return false;
  if (ctx.idle) return false;
  if (s.time - s.lastNeg < 60) return false;
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
      if (!o.free) {
        const p = PRODUCTS[m.cur];
        if (!consume(s, p.mat, p.grams, out)) { m.state = 'nofil'; m.cur = null; m.curOrder = null; }
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
  if (PRODUCTS[pid].xl) { s.stats.xl++; s.run.xl++; }
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
  m.state = 'idle'; m.cur = null; m.curOrder = null; m.pen = 0; m.progress = 0;
  startPiece(s, m, out);
  return true;
}

// El jugador toca "Imprimir" en una máquina que espera (tutorial).
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
  if (!machineUnlocked(s, model) || s.machines.length >= slots(s)) return null;
  const c = machineCost(s, model);
  if (s.money < c) return null;
  s.money -= c;
  return addMachine(s, model, c);
}
export function sellMachine(s, mid) {
  if (s.machines.length <= 1) return false;
  const i = s.machines.findIndex((x) => x.id === mid);
  if (i < 0) return false;
  const m = s.machines[i];
  s.money += Math.round((m.paid || 0) * 0.5);
  s.machines.splice(i, 1);
  return true;
}
export function buyUpgrade(s, id) {
  const U = UPGRADES[id];
  if (!upgradeUnlocked(s, id) || lvlOf(s, id) >= (U.max || 1)) return false;
  const c = upgradeCost(s, id);
  if (s.money < c) return false;
  s.money -= c;
  s.upgrades[id] = lvlOf(s, id) + 1;
  // Desbloqueos de material: las máquinas siguen con lo suyo; el jugador elige.
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
export function buySpool(s, mat, n = 1) {
  if (!materialUnlocked(s, mat)) return false;
  const c = spoolPrice(s, mat) * n;
  if (s.money < c) return false;
  s.money -= c;
  s.fil[mat] += SPOOL_GRAMS * n;
  s.stats.spools += n; s.run.spools += n;
  return true;
}
export function setProduct(s, mid, pid) {
  const m = s.machines.find((x) => x.id === mid);
  if (!m || !canPrint(s, m, pid)) return false;
  m.product = pid;
  // Si recién arrancó (o no tiene trabajo), cambia ya; si no, desde la próxima pieza.
  if (m.state === 'printing' && !m.curOrder && !m.event && m.progress < m.need * 0.1 && m.cur !== pid) {
    const old = PRODUCTS[m.cur];
    s.fil[old.mat] += old.grams;
    m.state = 'idle'; m.cur = null;
    startPiece(s, m, []);
  } else if (m.state === 'idle' || m.state === 'nofil') {
    if (!m.waitStart) startPiece(s, m, []);
  }
  return true;
}
export function useMate(s, ctx = {}) {
  const out = ctx.out || (ctx.out = []);
  if (s.time < s.mate.ready) return false;
  s.mate.until = s.time + mateDuration(s);
  s.mate.ready = s.time + mateCooldown(s);
  s.stats.mates++; s.run.mates++;
  out.push({ type: 'mate' });
  return true;
}

// ---------- Pedidos ----------
function templateFeasible(s, tpl) {
  for (const [pid] of tpl.items) {
    if (!productUnlocked(s, pid)) return false;
    const minStars = Math.max(tpl.minStars || 1, PRODUCTS[pid].minStars || 1);
    if (!s.machines.some((m) => canPrint(s, m, pid) && machineStars(s, m) >= minStars)) return false;
  }
  return true;
}
function makeOffer(s, tpl, opts = {}) {
  const fid = s.orders.fidelity[tpl.id] || 0;
  const frequent = tpl.frequent && fid > 0;
  const minStars = tpl.minStars || 1;
  const items = tpl.items.map(([p, q]) => ({ p, qty: Math.max(1, Math.round(q * (opts.qtyMult || 1))), done: 0 }));
  let base = 0;
  for (const it of items) base += it.qty * pieceValue(s, it.p, Math.max(minStars, PRODUCTS[it.p].minStars || 1));
  const mult = (opts.mult ?? tpl.mult) * (perk(s, 'contactos') ? 1.2 : 1) * (frequent ? 1 + 0.1 * Math.min(5, fid) : 1);
  return {
    id: s.orders.nextId++, tpl: tpl.id, client: tpl.client, title: opts.title || tpl.title, flavor: opts.flavor ?? tpl.flavor,
    items, time: opts.time || tpl.time, reward: Math.round(base * mult), rep: tpl.rep, minStars,
    expires: s.time + (opts.life || ORDER_OFFER_LIFE), urgent: !!opts.urgent, frequent,
  };
}
function spawnOffer(s, forceTpl) {
  const busy = new Set([...s.orders.offers, ...s.orders.active].map((o) => o.tpl));
  let tpl = forceTpl ? ORDER_TEMPLATES.find((t) => t.id === forceTpl) : null;
  if (!tpl) {
    const list = ORDER_TEMPLATES.filter((t) => !busy.has(t.id) && templateFeasible(s, t))
      .map((t) => ({ v: t, w: t.weight * (t.frequent && s.orders.fidelity[t.id] ? 2 : 1) }));
    tpl = pickWeighted(s, list);
  }
  if (!tpl) return null;
  const o = makeOffer(s, tpl);
  s.orders.offers.push(o);
  return o;
}
export function spawnUrgent(s) {
  const prods = PRODUCT_ORDER.filter((pid) => !PRODUCTS[pid].xl && s.machines.some((m) => canPrint(s, m, pid)));
  if (!prods.length) return null;
  const pid = prods[Math.floor(rand(s) * prods.length)];
  // Cantidad para ~3 min con la mejor máquina que lo puede hacer.
  const best = Math.max(...s.machines.filter((m) => canPrint(s, m, pid)).map((m) => machineSpeed(s, m, false)));
  const qty = Math.max(1, Math.floor((150 * best) / PRODUCTS[pid].time));
  const tpl = { id: 'urgente', client: 'Cliente apurado', title: `Urgente: ${qty} × ${PRODUCTS[pid].name.toLowerCase()}`, items: [[pid, qty]], time: 240, mult: 5, rep: 2 };
  const o = makeOffer(s, tpl, { urgent: true, life: 90, flavor: '«Lo necesito para mañana a primera hora».' });
  s.orders.offers.unshift(o);
  return o;
}
function compatible(s, m, o) {
  return o.items.some((it) => it.done < it.qty && canPrint(s, m, it.p) && machineStars(s, m) >= Math.max(o.minStars, PRODUCTS[it.p].minStars || 1));
}
export function orderCompatibleMachines(s, o) { return s.machines.filter((m) => compatible(s, m, o)); }
// Máquinas libres que hacen falta para llegar con margen.
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
export function declineOrder(s, oid) {
  s.orders.offers = s.orders.offers.filter((x) => x.id !== oid);
}
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
    if (mine.length <= 0) return false;
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
  s.stats.orders++; s.run.orders++;
  if (o.urgent) s.stats.urgentDone++;
  if (o.tpl === 'exposicion') s.stats.exposicion++;
  s.orders.fidelity[o.tpl] = (s.orders.fidelity[o.tpl] || 0) + 1;
  out.push({ type: 'orderDone', oid: o.id, reward: o.reward, rep: o.rep, title: o.title, tpl: o.tpl });
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
  O.spawnT += dt;
  if (O.offers.length + O.active.length < boardSize(s) && O.spawnT >= ORDER_SPAWN_EVERY) {
    O.spawnT = 0;
    const o = spawnOffer(s, s.tutorial.active ? 'vecina' : null);
    if (o) ctx.out.push({ type: 'offer', oid: o.id });
  }
  if (has(s, 'gestor')) {
    O.gestorT += dt;
    if (O.gestorT >= 3) {
      O.gestorT = 0;
      for (const o of [...O.offers]) {
        if (o.tpl === 'exposicion' && o.reward === 0) continue;
        const sug = suggestAssign(s, o);
        if (sug.enough) { acceptOrder(s, o.id); ctx.out.push({ type: 'gestor', oid: o.id }); }
      }
    }
  }
}

// ---------- Tendencia ----------
function stepTrend(s) {
  if (s.time < s.trend.next) return null;
  const list = PRODUCT_ORDER.filter((pid) => !PRODUCTS[pid].xl && productUnlocked(s, pid) && s.machines.some((m) => canPrint(s, m, pid)));
  if (list.length < 2) { s.trend.next = s.time + 60; return null; }
  let p = list[Math.floor(rand(s) * list.length)];
  if (p === s.trend.p) p = list[(list.indexOf(p) + 1) % list.length];
  s.trend = { p, until: s.time + 480, next: s.time + 720 };
  return p;
}

// ---------- Eventos globales ----------
function stepGlobal(s, ctx) {
  const out = ctx.out;
  if (s.global) {
    const g = s.global;
    if (g.id !== 'corte' && s.time > g.since + 60) s.global = null;
    if (g.id === 'cambio' && !s.orders.active.some((o) => o.id === g.oid)) s.global = null;
    return;
  }
  if (s.tutorial.active || s.time < s.nextGlobal) return;
  s.nextGlobal = s.time + 220 + rand(s) * 200;
  const negOk = !ctx.idle && s.time - s.lastNeg >= 60;
  const printing = s.machines.filter((m) => m.state === 'printing').length;
  const list = [];
  const add = (id, ok) => { if (ok) list.push({ v: id, w: GLOBAL_EVENTS[id].weight }); };
  add('corte', negOk && printing >= 3 && s.time - s.lastCorte > 900);
  add('cambio', !ctx.idle && s.orders.active.some((o) => o.items.some((i) => i.done < i.qty) && o.deadline - s.time > 120));
  add('favor', !ctx.idle && s.fil.PLA >= 8);
  add('viral', !ctx.idle && s.stats.pieces > 30);
  add('misteriosa', !ctx.idle && s.money >= spoolPrice(s, 'PLA'));
  add('urgente', s.orders.offers.length + s.orders.active.length <= boardSize(s));
  const id = pickWeighted(s, list);
  if (!id) return;
  if (id === 'urgente') {
    const o = spawnUrgent(s);
    if (o) out.push({ type: 'urgent', oid: o.id });
    return;
  }
  const g = { id, since: s.time };
  if (id === 'corte') { s.lastCorte = s.time; s.lastNeg = s.time; }
  if (id === 'cambio') {
    const cands = s.orders.active.filter((o) => o.items.some((i) => i.done < i.qty));
    g.oid = cands[Math.floor(rand(s) * cands.length)].id;
  }
  if (id === 'misteriosa') g.price = Math.round(spoolPrice(s, 'PLA') * 2 * 0.4);
  s.global = g;
  out.push({ type: 'global', id });
}
export function resolveGlobal(s, opt, ctx = {}) {
  const out = ctx.out || (ctx.out = []);
  const g = s.global;
  if (!g) return false;
  if (g.id === 'corte') {
    if (s.time < g.since + 8) return false;
    if (!has(s, 'ups')) for (const m of s.machines) if (m.state === 'printing') m.progress = 0;
    s.stats.cortes++;
  } else if (g.id === 'cambio' && opt === 0) {
    const o = s.orders.active.find((x) => x.id === g.oid);
    if (o) {
      for (const it of o.items) it.qty = Math.ceil(it.qty * 1.3);
      o.reward = Math.round(o.reward * 1.4);
      o.deadline += o.time * 0.3;
    }
  } else if (g.id === 'favor' && opt === 0) {
    if (s.fil.PLA >= 8) s.fil.PLA -= 8;
    addRep(s, 1, out);
    s.stats.favors++;
  } else if (g.id === 'viral' && opt === 0) {
    s.boost.viral = s.time + 180;
  } else if (g.id === 'misteriosa' && opt === 0) {
    if (s.money < g.price) return false;
    s.money -= g.price;
    s.fil.PLA += SPOOL_GRAMS * 2;
    s.boost.risky = s.time + 600;
  }
  s.global = null;
  out.push({ type: 'globalDone', id: g.id, opt });
  return true;
}

// ---------- Tick ----------
export function tick(s, dt, ctx = {}) {
  ctx.out = ctx.out || [];
  s.time += dt;
  const blackout = s.global && s.global.id === 'corte';
  for (const m of s.machines) stepMachine(s, m, dt, ctx, blackout);
  // Sobrino ayudante: retira la pieza más vieja cada 8 s.
  if (has(s, 'sobrino') && !has(s, 'expulsion')) {
    s.helperT = Math.min(8, s.helperT + dt);
    if (s.helperT >= 8) {
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

// ---------- Mientras no estabas ----------
// BATI cuida el taller: resuelve lo pendiente y produce a menor rendimiento.
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
  // Ritmo por material
  const byMat = {};
  for (const m of s.machines) {
    const pid = canPrint(s, m, m.product) ? m.product : bestProductFor(s, m);
    if (!pid) continue;
    const p = PRODUCTS[pid];
    const sp = machineSpeed(s, m, false);
    const b = byMat[p.mat] || (byMat[p.mat] = { v: 0, g: 0, pcs: 0 });
    b.v += pieceValue(s, pid, machineStars(s, m)) * sp / p.time;
    b.g += p.grams * sp / p.time;
    b.pcs += sp / p.time;
  }
  let earned = 0, pieces = 0, spools = 0, spoolCost = 0;
  const stopped = [];
  for (const [mat, b] of Object.entries(byMat)) {
    const need = b.g * t;
    let secsM = t;
    if (need <= s.fil[mat]) s.fil[mat] -= need;
    else if (hasProveedor(s) && materialUnlocked(s, mat)) {
      const short = need - s.fil[mat];
      const n = Math.ceil(short / SPOOL_GRAMS);
      spools += n; spoolCost += n * spoolPrice(s, mat) * 1.1;
      s.fil[mat] = n * SPOOL_GRAMS - short;
    } else {
      secsM = b.g > 0 ? s.fil[mat] / b.g : t;
      s.fil[mat] = 0;
      if (secsM < t) stopped.push(mat);
    }
    earned += b.v * secsM * eff;
    pieces += b.pcs * secsM * eff;
  }
  earned = Math.max(0, earned - spoolCost);
  addMoney(s, earned);
  pieces = Math.floor(pieces);
  s.stats.pieces += pieces; s.run.pieces += pieces;
  s.stats.spools += spools; s.run.spools += spools;
  s.stats.maxOffline = Math.max(s.stats.maxOffline || 0, secs);
  return { secs, counted: t, capped: secs > capS, eff, earned, pieces, spools, stopped, fixed, out: ctx.out };
}

// ---------- Mudanza (prestigio) ----------
export function oficioGain(s) { return Math.floor(2 * Math.sqrt(s.runEarned / 1e6)); }
export function canMove(s) {
  const g = oficioGain(s);
  return g >= 1 && (s.space >= 3 || g >= 3);
}
export function doMove(s, vitrinaPid) {
  if (!canMove(s)) return null;
  const gain = oficioGain(s);
  const prestige = { ...s.prestige, perks: { ...s.prestige.perks }, vitrina: [...s.prestige.vitrina] };
  prestige.points += gain;
  prestige.total += gain;
  prestige.moves++;
  if (vitrinaPid && PRODUCTS[vitrinaPid]) prestige.vitrina.push({ p: vitrinaPid, move: prestige.moves, space: s.space });
  const keep = {
    name: s.name, totalEarned: s.totalEarned, stats: s.stats, achievements: s.achievements,
    prestige, settings: s.settings, seen: s.seen, orders: { fidelity: s.orders.fidelity },
  };
  return newGame(keep, s.rng ^ 0x9e3779b9);
}
export function buyPerk(s, id, PERKS) {
  const P = PERKS[id];
  if (!P || s.prestige.perks[id] || s.prestige.points < P.cost) return false;
  s.prestige.points -= P.cost;
  s.prestige.perks[id] = true;
  // Algunas ventajas valen también para la partida en curso.
  if (id === 'sobrino') s.upgrades.sobrino = Math.max(1, lvlOf(s, 'sobrino'));
  if (id === 'proveedor') s.upgrades.proveedor = Math.max(1, lvlOf(s, 'proveedor'));
  return true;
}

// ---------- Guardado ----------
export function serialize(s) {
  s.lastSeen = Date.now();
  return JSON.stringify(s);
}
export function migrate(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.machines) || typeof obj.money !== 'number') return null;
  if ((obj.v || 0) > SAVE_VERSION) return null;
  const base = newGame();
  // Completa campos que falten (partidas de versiones anteriores).
  for (const k of Object.keys(base)) if (obj[k] === undefined) obj[k] = base[k];
  obj.stats = { ...base.stats, ...obj.stats };
  obj.run = { ...base.run, ...obj.run };
  obj.settings = { ...defaultSettings(), ...obj.settings };
  obj.prestige = { ...base.prestige, ...obj.prestige };
  obj.v = SAVE_VERSION;
  return obj;
}

export { MACHINE_ORDER };
