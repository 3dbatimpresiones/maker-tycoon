// =====================================================================
// MISIONES, TUTORIAL, LOGROS, DESAFÍOS DIARIOS/SEMANALES + el paso completo (step).
// =====================================================================
import * as E from './engine.js';
import { tick, has, repLevel, machineStars, FIRST_FREE_MISSION, challengeProgress, masteryLevel } from './engine.js';
import { UNIT, PRODUCTS, PRODUCT_ORDER, MACHINES, MASTERY_CHALLENGES } from './data.js';

const owns = (s, model) => s.machines.some((m) => m.model === model);
const ownsBrand = (s, brand) => s.machines.some((m) => MACHINES[m.model].brand === brand);
const ownsTech = (s, tech) => s.machines.some((m) => MACHINES[m.model].tech === tech);

// target = qué parte de la interfaz resalta BATI · cta = invitación a redes al completarla
export const MISSIONS = [
  { id: 'imprimir', text: 'Tocá «Imprimir» en tu Creality Ender-3', target: 'machine',
    bati: '¡Hola! Soy BATI, el asistente de 3DBAT. Esta es tu primera impresora: una Ender-3, la escuela de todos los makers. Tocá «Imprimir» y arrancamos con un llavero.',
    check: (s) => s.machines.some((m) => !m.waitStart) },
  { id: 'retirar', text: 'Retirá la pieza terminada', target: 'machine', reward: { money: 5000 },
    bati: '¡Mirá cómo crece capa por capa! Cuando termine, tocá la impresora para retirar la pieza y venderla.',
    check: (s) => s.stats.pieces >= 1 },
  { id: 'slicer', text: 'Comprá la mejora «Perfiles en Orca Slicer» ({$:12000})', target: 'shop-upgrades',
    bati: 'Cada pieza suma. Juntá {$:12000} y comprá tu primera mejora en la Tienda: perfiles optimizados en Orca Slicer. Más velocidad, más piezas.',
    check: (s) => (s.upgrades.slicer || 0) >= 1 },
  { id: 'pedido', text: 'Aceptá tu primer pedido', target: 'orders',
    bati: '¡Llegó un pedido! Pagan bastante más que la venta suelta. Aceptalo y le asigno la impresora.',
    onStart: (s) => { s.tutorial.orders = true; s.orders.spawnT = 999; },
    check: (s) => s.orders.active.length > 0 || s.stats.orders > 0 },
  { id: 'nivelar', text: 'Resolvé el problema de la impresora', target: 'machine',
    bati: 'Ojo: las impresoras fallan, como en la vida real. Cuando aparezca un problema, tocá la impresora y resolvelo.',
    onStart: (s) => { s.tutorial.force = 'primeracapa'; },
    check: (s) => (s.stats.res_primeracapa || 0) >= 1 },
  // --- fin del tutorial ---
  { id: 'pedido1', text: 'Completá tu primer pedido', reward: { money: 21000 }, check: (s) => s.run.orders >= 1 },
  { id: 'mate', text: 'Cebá un mate (botón 🧉): más velocidad un rato', reward: { money: 14000 }, target: 'mate', check: (s) => s.run.mates >= 1 || E.rule(s, 'sinmate') },
  { id: 'segunda', text: 'Tené 2 impresoras', reward: { money: 35000 }, target: 'shop-machines', check: (s) => s.machines.length >= 2 },
  { id: 'sobrino', text: 'Contratá al Sobrino ayudante', reward: { spool: 'PLA' }, target: 'shop-upgrades', check: (s) => has(s, 'sobrino') || E.rule(s, 'amano') },
  { id: 'rep2', text: 'Llegá a Reputación 2 (completá pedidos)', reward: { money: 70000 }, target: 'orders', check: (s) => repLevel(s) >= 2 },
  { id: 'a1mini', text: 'Comprá una Bambu Lab A1 mini', reward: { money: 100000 }, target: 'shop-machines', check: (s) => owns(s, 'a1mini') || E.rule(s, 'soloender') },
  { id: 'cuarto', text: 'Armá tu Cuarto maker (Tienda → Taller)', reward: { money: 250000 }, target: 'shop-space', cta: 'instagram', check: (s) => s.space >= 1 },
  { id: 'a1k1c', text: 'Comprá una Bambu Lab A1 o una Creality K1C', reward: { money: 400000 }, target: 'shop-machines', check: (s) => owns(s, 'a1') || owns(s, 'k1c') || E.rule(s, 'soloender') },
  { id: 'petg', text: 'Desbloqueá el PETG', reward: { spool: 'PETG' }, target: 'shop-upgrades', check: (s) => has(s, 'petg') },
  { id: 'cuatro', text: 'Tené 4 impresoras', reward: { money: 300000 }, target: 'shop-machines', check: (s) => s.machines.length >= 4 },
  { id: 'pedidos10', text: 'Completá 10 pedidos', reward: { money: 500000 }, target: 'orders', check: (s) => s.run.orders >= 10 || E.rule(s, 'mostrador') },
  { id: 'proveedor', text: 'Contratá al Proveedor de materiales', reward: { money: 600000 }, target: 'shop-upgrades', check: (s) => has(s, 'proveedor') || E.rule(s, 'amano') },
  { id: 'garage', text: 'Pasate al Garage taller', reward: { money: 1500000 }, target: 'shop-space', cta: 'batbox', check: (s) => s.space >= 2 },
  { id: 'p1s', text: 'Comprá una Bambu Lab P1S Combo (con AMS)', reward: { money: 1000000 }, target: 'shop-machines', check: (s) => owns(s, 'p1s') || E.rule(s, 'soloender') },
  { id: 'expulsion', text: 'Instalá la Expulsión automática', reward: { money: 1500000 }, target: 'shop-upgrades', check: (s) => has(s, 'expulsion') || E.rule(s, 'amano') },
  { id: 'grande', text: 'Imprimí tu primera pieza grande (cama L)', reward: { money: 3e6 }, target: 'shop-machines', check: (s) => s.run.xl >= 1 },
  { id: 'local', text: 'Abrí el Local con vidriera', reward: { money: 8e6 }, target: 'shop-space', cta: 'comunidad', check: (s) => s.space >= 3 },
  { id: 'h2s', text: 'Comprá una Bambu Lab H2S o una Creality K2 Pro', reward: { money: 5e6 }, target: 'shop-machines', check: (s) => owns(s, 'h2s') || owns(s, 'k2plus') },
  { id: 'mudanza', text: 'Hacé tu primera Mudanza (botón Oficio)', target: 'oficio', check: (s) => s.prestige.moves >= 1 },
  { id: 'resina', text: 'Armá el Rincón de resina', reward: { money: 5e6 }, target: 'shop-upgrades', check: (s) => has(s, 'resina') },
  { id: 'mars', text: 'Comprá tu primera impresora de resina', reward: { spool: 'RESINA' }, target: 'shop-machines', check: (s) => ownsTech(s, 'resin') },
  { id: 'ams', text: 'Instalá el sistema multicolor', reward: { money: 3e6 }, target: 'shop-upgrades', check: (s) => has(s, 'ams') },
  { id: 'contrato', text: 'Completá un contrato de empresa', reward: { tokens: 2 }, target: 'orders', check: (s) => (s.stats.contracts || 0) >= 1 },
  { id: 'desafio', text: 'Superá un desafío de maestría (sección Desafíos)', reward: { tokens: 3 }, target: 'desafios', check: (s) => Object.keys(s.prestige.mastery || {}).length >= 1 },
  { id: 'industrial', text: 'Pasate al Taller industrial', reward: { money: 1e8 }, target: 'shop-space', check: (s) => s.space >= 4 },
  { id: 'laser', text: 'Armá la Sala de láser', reward: { money: 3e7 }, target: 'shop-upgrades', check: (s) => has(s, 'laser') },
  { id: 'xtool', text: 'Cortá tu primera pieza con láser', reward: { spool: 'MDF' }, target: 'shop-machines', check: (s) => PRODUCT_ORDER.some((p) => PRODUCTS[p].tech === 'laser' && s.run.products[p]) },
  { id: 'voron', text: 'Armá una Voron 2.4', reward: { money: 5e7 }, target: 'shop-machines', check: (s) => owns(s, 'voron') },
  { id: 'nave', text: 'Pasate a la Nave de producción', reward: { money: 1e9 }, target: 'shop-space', check: (s) => s.space >= 5 },
  { id: 'cnc', text: 'Armá el Taller de CNC', reward: { money: 2e8 }, target: 'shop-upgrades', check: (s) => has(s, 'cnc') },
  { id: 'asado', text: 'Fresá tu primera tabla de asado', reward: { tokens: 3 }, target: 'shop-machines', check: (s) => (s.run.products.tabla || 0) >= 1 },
  { id: 'rack', text: 'Montá un rack de granja', reward: { money: 5e8 }, target: 'shop-machines', check: (s) => owns(s, 'rack') || owns(s, 'rackpro') },
  { id: 'planta', text: 'Abrí la Planta 3DBAT', reward: { tokens: 10 }, target: 'shop-space', cta: 'comunidad', check: (s) => s.space >= 6 },
  { id: 'libre', text: 'Seguí creciendo: mejoras infinitas, experiencia y Mudanzas', check: () => false },
];

export const ACHIEVEMENTS = [
  { id: 'primera', name: 'Primera capa', desc: 'Retirá tu primera pieza.', check: (s) => s.stats.pieces >= 1 },
  { id: 'cien', name: 'Producción en serie', desc: 'Fabricá 100 piezas.', check: (s) => s.stats.pieces >= 100 },
  { id: 'mil', name: 'Granja en marcha', desc: 'Fabricá 1.000 piezas. Desbloquea LEDs verdes.', check: (s) => s.stats.pieces >= 1000 },
  { id: 'diezmil', name: 'Esto ya es una fábrica', desc: 'Fabricá 10.000 piezas.', check: (s) => s.stats.pieces >= 1e4 },
  { id: 'millonpiezas', name: 'Un millón de capas', desc: 'Fabricá 1.000.000 de piezas.', check: (s) => s.stats.pieces >= 1e6 },
  { id: 'benchy', name: 'Mi primer Benchy', desc: 'Imprimí el barquito más famoso del mundo maker.', check: (s) => (s.mastery.benchy || 0) >= 1 },
  { id: 'spaghetti', name: 'Spaghetti a la carbonara', desc: 'Sobreviví a 10 spaghettis.', check: (s) => (s.stats.events.spaghetti || 0) >= 10 },
  { id: 'gato', name: 'El gato es parte del equipo', desc: 'Bajá al gato de la impresora.', check: (s) => (s.stats.res_gato || 0) >= 1 },
  { id: 'nivelador', name: 'Nivelador compulsivo', desc: 'Nivelá la cama 5 veces.', check: (s) => (s.stats.res_primeracapa || 0) >= 5 },
  { id: 'exposicion', name: 'Pago con exposición', desc: 'Completá el pedido del influencer.', check: (s) => s.stats.exposicion >= 1 },
  { id: 'mate10', name: 'Cebador oficial', desc: 'Cebá 10 mates.', check: (s) => s.stats.mates >= 10 },
  { id: 'mate100', name: 'Termo infinito', desc: 'Cebá 100 mates.', check: (s) => s.stats.mates >= 100 },
  { id: 'pedidos10', name: 'Cliente contento', desc: 'Completá 10 pedidos. Desbloquea LEDs rosas.', check: (s) => s.stats.orders >= 10 },
  { id: 'pedidos50', name: 'Agenda llena', desc: 'Completá 50 pedidos.', check: (s) => s.stats.orders >= 50 },
  { id: 'pedidos500', name: 'Sin turnos hasta marzo', desc: 'Completá 500 pedidos.', check: (s) => s.stats.orders >= 500 },
  { id: 'urgente', name: 'Lo tenés para mañana', desc: 'Completá un pedido urgente.', check: (s) => s.stats.urgentDone >= 1 },
  { id: 'contrato', name: 'Firmaste con una empresa', desc: 'Completá un contrato de empresa.', check: (s) => (s.stats.contracts || 0) >= 1 },
  { id: 'contratos10', name: 'Proveedor oficial', desc: 'Completá 10 contratos.', check: (s) => (s.stats.contracts || 0) >= 10 },
  { id: 'cuarto', name: 'Cuarto maker', desc: 'Armá tu cuarto maker.', check: (s) => s.space >= 1 },
  { id: 'garage', name: 'Garage taller', desc: 'Llegá al garage.', check: (s) => s.space >= 2 },
  { id: 'local', name: 'Local con vidriera', desc: 'Abrí tu local. Desbloquea LEDs blanco cálido.', check: (s) => s.space >= 3 },
  { id: 'industrial', name: 'Taller industrial', desc: 'Llegá al galpón. Desbloquea LEDs naranja checo.', check: (s) => s.space >= 4 },
  { id: 'nave', name: 'Nave de producción', desc: 'Llegá a la nave.', check: (s) => s.space >= 5 },
  { id: 'planta', name: 'Planta 3DBAT', desc: 'Abrí la planta.', check: (s) => s.space >= 6 },
  { id: 'lleno', name: 'No entra ni un alfiler', desc: 'Ocupá todos los lugares del taller.', check: (s) => s.space >= 1 && s.machines.length >= E.slots(s) },
  { id: 'nacional', name: 'Industria nacional', desc: 'Tené una Hellbot.', check: (s) => ownsBrand(s, 'Hellbot') },
  { id: 'checa', name: 'Naranja checo', desc: 'Tené una Prusa.', check: (s) => ownsBrand(s, 'Prusa') },
  { id: 'bambu', name: 'Pasado al lado verde', desc: 'Tené una Bambu Lab.', check: (s) => ownsBrand(s, 'Bambu Lab') },
  { id: 'voron', name: 'Lo armé yo', desc: 'Tené una Voron 2.4.', check: (s) => owns(s, 'voron') },
  { id: 'giga', name: 'El tamaño sí importa', desc: 'Tené una Elegoo OrangeStorm Giga.', check: (s) => owns(s, 'giga') },
  { id: 'petg', name: 'PETGeador', desc: 'Desbloqueá el PETG.', check: (s) => has(s, 'petg') },
  { id: 'tpu', name: 'Flexible como el TPU', desc: 'Desbloqueá el TPU.', check: (s) => has(s, 'directo') },
  { id: 'multicolor', name: 'Arcoíris', desc: 'Imprimí una pieza multicolor.', check: (s) => PRODUCT_ORDER.some((p) => PRODUCTS[p].multi && s.mastery[p]) },
  { id: 'resina', name: 'Olor a resina', desc: 'Imprimí en resina.', check: (s) => PRODUCT_ORDER.some((p) => PRODUCTS[p].tech === 'resin' && s.mastery[p]) },
  { id: 'laser', name: 'Huele a MDF', desc: 'Cortá con láser.', check: (s) => PRODUCT_ORDER.some((p) => PRODUCTS[p].tech === 'laser' && s.mastery[p]) },
  { id: 'cnc', name: 'Viruta en el pelo', desc: 'Fresá con CNC.', check: (s) => PRODUCT_ORDER.some((p) => PRODUCTS[p].tech === 'cnc' && s.mastery[p]) },
  { id: 'asado', name: 'Para el asado del domingo', desc: 'Fresá 10 tablas de asado.', check: (s) => (s.mastery.tabla || 0) >= 10 },
  { id: 'maestro', name: 'Mano experta', desc: 'Llevá un producto a experiencia nivel 5.', check: (s) => PRODUCT_ORDER.some((p) => masteryLevel(s, p) >= 5) },
  { id: 'maestro10', name: 'Lo hago con los ojos cerrados', desc: 'Llevá un producto a experiencia nivel 10.', check: (s) => PRODUCT_ORDER.some((p) => masteryLevel(s, p) >= 10) },
  { id: 'xl', name: 'Pieza grande', desc: 'Imprimí una pieza L o XL.', check: (s) => s.stats.xl >= 1 },
  { id: 'rep5', name: 'Te recomiendan', desc: 'Llegá a Reputación 5.', check: (s) => repLevel(s) >= 5 },
  { id: 'rep10', name: 'Referente maker', desc: 'Llegá a Reputación 10.', check: (s) => repLevel(s) >= 10 },
  { id: 'rep20', name: 'Todos te conocen', desc: 'Llegá a Reputación 20.', check: (s) => repLevel(s) >= 20 },
  { id: 'palo', name: 'El primer palo', desc: 'Ganá {$:1000000} en total.', check: (s) => s.totalEarned >= 1e6 },
  { id: 'milpalos', name: 'Mil palos', desc: 'Ganá {$:1000000000} en total.', check: (s) => s.totalEarned >= 1e9 },
  { id: 'billon', name: 'Un billón', desc: 'Ganá {$:1000000000000} en total.', check: (s) => s.totalEarned >= 1e12 },
  { id: 'mudanza', name: 'Nueva sede', desc: 'Hacé tu primera Mudanza. Desbloquea LEDs violetas.', check: (s) => s.prestige.moves >= 1 },
  { id: 'mudanza10', name: 'Nómade maker', desc: 'Hacé 10 Mudanzas.', check: (s) => s.prestige.moves >= 10 },
  { id: 'vitrina', name: 'Coleccionista', desc: 'Tené 3 piezas en la Vitrina.', check: (s) => s.prestige.vitrina.length >= 3 },
  { id: 'desafio', name: 'Maestro del oficio', desc: 'Superá un desafío de maestría.', check: (s) => Object.keys(s.prestige.mastery || {}).length >= 1 },
  { id: 'desafios', name: 'Sin excusas', desc: 'Superá todos los desafíos de maestría.', check: (s) => Object.keys(s.prestige.mastery || {}).length >= Object.keys(MASTERY_CHALLENGES).length },
  { id: 'diario', name: 'Constancia', desc: 'Completá 10 desafíos diarios.', check: (s) => (s.stats.dailyDone || 0) >= 10 },
  { id: 'dormi', name: 'Dormí tranquilo', desc: 'Volvé después de 2 horas o más.', check: (s) => (s.stats.maxOffline || 0) >= 7200 },
  { id: 'corte', name: 'Volvió la luz', desc: 'Sobreviví a un corte de luz.', check: (s) => s.stats.cortes >= 1 },
  { id: 'piloto', name: 'Piloto automático', desc: 'Expulsión, proveedor y gestor de pedidos instalados.', check: (s) => has(s, 'expulsion') && has(s, 'proveedor') && has(s, 'gestor') },
  { id: 'cinco', name: 'Cinco estrellas', desc: 'Tené una máquina con calidad ★5.', check: (s) => s.machines.some((m) => machineStars(s, m) >= 5) },
];

export const currentMission = (s) => MISSIONS[Math.min(s.missions.i, MISSIONS.length - 1)];

// ---------- Desafíos diarios y semanales ----------
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function seeded(seed) {
  let t = seed;
  return () => { t = (t + 0x6D2B79F5) >>> 0; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
export function dayKey(now) { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function weekKey(now) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes
  return 'S' + dayKey(d.getTime());
}
const roundNice = (n) => { if (n < 10) return Math.max(1, Math.round(n)); const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };

function makeChallenge(s, kind, rnd, scale) {
  const rate = Math.max(0.5, E.potentialRate(s));
  const pps = Math.max(0.05, s.machines.reduce((a, m) => a + E.machineSpeed(s, m, false) / PRODUCTS[m.product].time, 0));
  const made = [...new Set(s.machines.map((m) => m.product))];
  switch (kind) {
    case 'piezas': { const t = roundNice(pps * 900 * scale); return { type: 'piezas', target: t, text: `Fabricá ${t.toLocaleString('es-AR')} piezas` }; }
    case 'producto': {
      const pid = made[Math.floor(rnd() * made.length)];
      const own = s.machines.filter((m) => m.product === pid).reduce((a, m) => a + E.machineSpeed(s, m, false) / PRODUCTS[pid].time, 0);
      const t = roundNice(Math.max(3, own * 1200 * scale));
      return { type: 'producto', pid, target: t, text: `Fabricá ${t.toLocaleString('es-AR')} × ${PRODUCTS[pid].name}` };
    }
    case 'pedidos': { const t = Math.round((3 + rnd() * 3) * scale); return { type: 'pedidos', target: t, text: `Completá ${t} pedidos` }; }
    case 'mates': { const t = Math.round(3 * scale); return { type: 'mates', target: t, text: `Cebá ${t} mates` }; }
    case 'problemas': { const t = Math.round(4 * scale); return { type: 'problemas', target: t, text: `Resolvé ${t} problemas de máquina` }; }
    case 'ganar': { const t = roundNice(rate * 1500 * scale); return { type: 'ganar', target: t, base: s.totalEarned, money: true, text: 'Ganá' }; }
    case 'mejoras': { const t = Math.round(3 * scale); return { type: 'mejoras', target: t, base: s.stats.upgrades || 0, text: `Comprá ${t} mejoras` }; }
    case 'contratos': { const t = Math.max(1, Math.round(scale / 4)); return { type: 'contratos', target: t, text: `Completá ${t} contrato${t > 1 ? 's' : ''} de empresa` }; }
    default: return null;
  }
}
function genSet(s, key, kinds, n, scale, reward) {
  const rnd = seeded(hash(key + (s.name || '')));
  const pool = [...kinds];
  const list = [];
  while (list.length < n && pool.length) {
    const kind = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const c = makeChallenge(s, kind, rnd, scale);
    if (c) list.push({ ...c, prog: 0, claimed: false, reward: reward(list.length) });
  }
  return { key, list };
}
export function ensureChallenges(s, now) {
  if (!now || s.tutorial.active) return false;
  let changed = false;
  const dk = dayKey(now), wk = weekKey(now);
  if (!s.daily || s.daily.key !== dk) {
    const kinds = ['piezas', 'producto', 'pedidos', 'mates', 'problemas', 'ganar', 'mejoras']
      .filter((k) => !(k === 'pedidos' && E.rule(s, 'mostrador')) && !(k === 'mates' && E.rule(s, 'sinmate')));
    s.daily = genSet(s, dk, kinds, 3, 1, (i) => (i === 2 ? 2 : 1));
    changed = true;
  }
  if (!s.weekly || s.weekly.key !== wk) {
    const kinds = repLevel(s) >= 5 ? ['contratos', 'pedidos', 'ganar', 'piezas'] : ['pedidos', 'ganar', 'piezas'];
    s.weekly = genSet(s, wk, kinds, 1, 6, () => 8);
    changed = true;
  }
  return changed;
}
function trackChallenges(s, out) {
  const sets = [s.daily, s.weekly].filter(Boolean);
  if (!sets.length) return;
  for (const e of out) {
    for (const set of sets) for (const c of set.list) {
      if (c.prog >= c.target) continue;
      if (c.type === 'piezas' && e.type === 'piece') c.prog++;
      else if (c.type === 'producto' && e.type === 'piece' && e.pid === c.pid) c.prog++;
      else if (c.type === 'pedidos' && e.type === 'orderDone') c.prog++;
      else if (c.type === 'contratos' && e.type === 'orderDone' && e.contract) c.prog++;
      else if (c.type === 'mates' && e.type === 'mate') c.prog++;
      else if (c.type === 'problemas' && e.type === 'resolved') c.prog++;
    }
  }
  for (const set of sets) for (const c of set.list) {
    if (c.type === 'ganar') c.prog = Math.max(0, Math.min(c.target, s.totalEarned - c.base));
    if (c.type === 'mejoras') c.prog = Math.max(0, Math.min(c.target, (s.stats.upgrades || 0) - c.base));
  }
}
export function claimChallenge(s, which, i) {
  const set = which === 'weekly' ? s.weekly : s.daily;
  const c = set?.list[i];
  if (!c || c.claimed || c.prog < c.target) return false;
  c.claimed = true;
  s.tokens += c.reward;
  if (which === 'daily') s.stats.dailyDone = (s.stats.dailyDone || 0) + 1;
  return c.reward;
}

function checkProgress(s, out) {
  for (let guard = 0; guard < 6; guard++) {
    const m = currentMission(s);
    if (!m.check(s)) break;
    if (m.reward?.money) { s.money += m.reward.money; s.runEarned += m.reward.money; s.totalEarned += m.reward.money; }
    if (m.reward?.spool) s.mat[m.reward.spool] += UNIT;
    if (m.reward?.tokens) s.tokens += m.reward.tokens;
    s.missions.i = Math.min(s.missions.i + 1, MISSIONS.length - 1);
    if (s.tutorial.active && s.missions.i >= FIRST_FREE_MISSION) { s.tutorial.active = false; out.push({ type: 'tutorialDone' }); }
    out.push({ type: 'mission', id: m.id, text: m.text, reward: m.reward, cta: m.cta });
    const next = currentMission(s);
    if (next.onStart) next.onStart(s);
  }
  const cp = challengeProgress(s);
  if (cp && cp.done) {
    s.prestige.mastery[cp.id] = Date.now();
    s.challenge = null;
    s.tokens += 3;
    out.push({ type: 'challengeDone', id: cp.id, name: cp.def.name, reward: cp.def.reward });
  }
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.check(s)) {
      s.achievements[a.id] = Date.now();
      out.push({ type: 'achievement', id: a.id, name: a.name });
    }
  }
}

// Paso completo: simulación + misiones + logros + desafíos.
export function step(s, dt, ctx = {}) {
  ctx.out = ctx.out || [];
  const before = ctx.out.length;
  tick(s, dt, ctx);
  trackChallenges(s, ctx.out.slice(before));
  s.checkT += dt;
  if (s.checkT >= 0.5) {
    s.checkT = 0;
    checkProgress(s, ctx.out);
    if (ctx.now && ensureChallenges(s, ctx.now)) ctx.out.push({ type: 'newChallenges' });
  }
  return ctx.out;
}

export function skipTutorial(s) {
  s.tutorial.active = false;
  s.tutorial.orders = true;
  for (const m of s.machines) m.waitStart = false;
  if (s.missions.i < FIRST_FREE_MISSION) s.missions.i = FIRST_FREE_MISSION;
}
export function startMissionHooks(s) {
  const m = currentMission(s);
  if (m.onStart && s.tutorial.active) m.onStart(s);
}
