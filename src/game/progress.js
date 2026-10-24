// =====================================================================
// MISIONES, TUTORIAL Y LOGROS + el paso completo del juego (step).
// =====================================================================
import { tick, has, repLevel, machineStars, FIRST_FREE_MISSION } from './engine.js';
import { SPOOL_GRAMS } from './data.js';

// target = qué parte de la interfaz resalta BATI · cta = invitación a redes al completarla
export const MISSIONS = [
  { id: 'imprimir', text: 'Tocá «Imprimir» en tu Kit Inicial', target: 'machine',
    bati: '¡Hola! Soy BATI, el asistente de 3DBAT. Esta es tu primera impresora: medio armada, pero imprime. Tocá «Imprimir» y arrancamos con un llavero.',
    check: (s) => s.machines.some((m) => !m.waitStart) },
  { id: 'retirar', text: 'Retirá la pieza terminada', target: 'machine', reward: { money: 10 },
    bati: '¡Mirá cómo crece capa por capa! Cuando termine, tocá la impresora para retirar la pieza y venderla.',
    check: (s) => s.stats.pieces >= 1 },
  { id: 'slicer', text: 'Comprá la mejora «Perfil de slicer optimizado» ($20)', target: 'shop-upgrades',
    bati: 'Cada pieza suma. Juntá $20 y comprá tu primera mejora en la tienda: el perfil de slicer optimizado. Más velocidad, más piezas.',
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
  { id: 'pedido1', text: 'Completá tu primer pedido', reward: { money: 30 }, check: (s) => s.run.orders >= 1 },
  { id: 'mate', text: 'Cebá un mate (botón 🧉): +50 % de velocidad', reward: { money: 20 }, target: 'mate', check: (s) => s.run.mates >= 1 },
  { id: 'segunda', text: 'Tené 2 impresoras', reward: { money: 50 }, target: 'shop-machines', check: (s) => s.machines.length >= 2 },
  { id: 'sobrino', text: 'Contratá al Sobrino ayudante', reward: { spool: 'PLA' }, target: 'shop-upgrades', check: (s) => has(s, 'sobrino') },
  { id: 'rep2', text: 'Llegá a Reputación 2 (completá pedidos)', reward: { money: 100 }, target: 'orders', check: (s) => repLevel(s) >= 2 },
  { id: 'cartesiana', text: 'Comprá una Cartesiana Autonivelante', reward: { money: 200 }, target: 'shop-machines',
    check: (s) => s.machines.some((m) => m.model === 'cartesiana') },
  { id: 'cuarto', text: 'Armá tu Cuarto maker (Tienda → Taller)', reward: { money: 500 }, target: 'shop-space', cta: 'instagram', check: (s) => s.space >= 1 },
  { id: 'petg', text: 'Desbloqueá el PETG', reward: { spool: 'PETG' }, target: 'shop-upgrades', check: (s) => has(s, 'petg') },
  { id: 'cuatro', text: 'Tené 4 impresoras', reward: { money: 1000 }, target: 'shop-machines', check: (s) => s.machines.length >= 4 },
  { id: 'pedidos10', text: 'Completá 10 pedidos', reward: { money: 2000 }, target: 'orders', check: (s) => s.run.orders >= 10 },
  { id: 'proveedor', text: 'Contratá al Proveedor de filamento', reward: { money: 2500 }, target: 'shop-upgrades', check: (s) => has(s, 'proveedor') },
  { id: 'rayo', text: 'Comprá una CoreXY «Rayo»', reward: { money: 5000 }, target: 'shop-machines', check: (s) => s.machines.some((m) => m.model === 'rayo') },
  { id: 'garage', text: 'Pasate al Garage taller', reward: { money: 20000 }, target: 'shop-space', cta: 'batbox', check: (s) => s.space >= 2 },
  { id: 'bunker', text: 'Comprá una CoreXY «Búnker»', reward: { money: 40000 }, target: 'shop-machines', check: (s) => s.machines.some((m) => m.model === 'bunker') },
  { id: 'expulsion', text: 'Instalá la Expulsión automática', reward: { money: 80000 }, target: 'shop-upgrades', check: (s) => has(s, 'expulsion') },
  { id: 'gigante', text: 'Comprá la Gran Formato «Gigante»', reward: { money: 150000 }, target: 'shop-machines', check: (s) => s.machines.some((m) => m.model === 'gigante') },
  { id: 'xl', text: 'Imprimí tu primera pieza XL', reward: { money: 300000 }, check: (s) => s.run.xl >= 1 },
  { id: 'local', text: 'Abrí el Local con vidriera', reward: { money: 500000 }, target: 'shop-space', cta: 'comunidad', check: (s) => s.space >= 3 },
  { id: 'mudanza', text: 'Hacé tu primera Mudanza (botón Oficio)', target: 'oficio', check: (s) => s.prestige.moves >= 1 },
  { id: 'libre', text: 'Seguí creciendo: cada Mudanza te hace más fuerte', check: () => false },
];

export const ACHIEVEMENTS = [
  { id: 'primera', name: 'Primera capa', desc: 'Retirá tu primera pieza.', check: (s) => s.stats.pieces >= 1 },
  { id: 'cien', name: 'Producción en serie', desc: 'Fabricá 100 piezas.', check: (s) => s.stats.pieces >= 100 },
  { id: 'mil', name: 'Granja en marcha', desc: 'Fabricá 1.000 piezas.', check: (s) => s.stats.pieces >= 1000 },
  { id: 'diezmil', name: 'Esto ya es una fábrica', desc: 'Fabricá 10.000 piezas.', check: (s) => s.stats.pieces >= 10000 },
  { id: 'benchy', name: 'Mi primer Benchy', desc: 'Imprimí el barquito más famoso del mundo maker.', check: (s) => (s.run.products.benchy || 0) >= 1 },
  { id: 'spaghetti', name: 'Spaghetti a la carbonara', desc: 'Sobreviví a 10 spaghettis.', check: (s) => (s.stats.events.spaghetti || 0) >= 10 },
  { id: 'gato', name: 'El gato es parte del equipo', desc: 'Bajá al gato de la impresora.', check: (s) => (s.stats.res_gato || 0) >= 1 },
  { id: 'nivelador', name: 'Nivelador compulsivo', desc: 'Nivelá la cama 5 veces.', check: (s) => (s.stats.res_primeracapa || 0) >= 5 },
  { id: 'exposicion', name: 'Pago con exposición', desc: 'Aceptá y completá el pedido del influencer.', check: (s) => s.stats.exposicion >= 1 },
  { id: 'mate10', name: 'Cebador oficial', desc: 'Cebá 10 mates.', check: (s) => s.stats.mates >= 10 },
  { id: 'mate100', name: 'Termo infinito', desc: 'Cebá 100 mates.', check: (s) => s.stats.mates >= 100 },
  { id: 'pedidos10', name: 'Cliente contento', desc: 'Completá 10 pedidos. Desbloquea LEDs rosas.', check: (s) => s.stats.orders >= 10 },
  { id: 'pedidos50', name: 'Agenda llena', desc: 'Completá 50 pedidos.', check: (s) => s.stats.orders >= 50 },
  { id: 'urgente', name: 'Lo tenés para mañana', desc: 'Completá un pedido urgente.', check: (s) => s.stats.urgentDone >= 1 },
  { id: 'cuarto', name: 'Cuarto maker', desc: 'Armá tu cuarto maker.', check: (s) => s.space >= 1 },
  { id: 'garage', name: 'Garage taller', desc: 'Llegá al garage.', check: (s) => s.space >= 2 },
  { id: 'local', name: 'Local con vidriera', desc: 'Abrí tu local. Desbloquea LEDs blanco cálido.', check: (s) => s.space >= 3 },
  { id: 'lleno', name: 'No entra ni un alfiler', desc: 'Ocupá todos los lugares del taller.', check: (s) => s.space >= 1 && s.machines.length >= [2, 4, 8, 12][s.space] },
  { id: 'petg', name: 'PETGeador', desc: 'Desbloqueá el PETG.', check: (s) => has(s, 'petg') },
  { id: 'tpu', name: 'Flexible como el TPU', desc: 'Desbloqueá el TPU.', check: (s) => has(s, 'directo') },
  { id: 'xl', name: 'Pieza XL', desc: 'Imprimí una pieza XL.', check: (s) => s.stats.xl >= 1 },
  { id: 'rep5', name: 'Te recomiendan', desc: 'Llegá a Reputación 5.', check: (s) => repLevel(s) >= 5 },
  { id: 'rep10', name: 'Referente maker', desc: 'Llegá a Reputación 10.', check: (s) => repLevel(s) >= 10 },
  { id: 'palo', name: 'El primer palo', desc: 'Ganá $1 M en total.', check: (s) => s.totalEarned >= 1e6 },
  { id: 'milpalos', name: 'Mil palos', desc: 'Ganá $1.000 M en total.', check: (s) => s.totalEarned >= 1e9 },
  { id: 'mudanza', name: 'Nueva sede', desc: 'Hacé tu primera Mudanza. Desbloquea LEDs violetas.', check: (s) => s.prestige.moves >= 1 },
  { id: 'vitrina', name: 'Coleccionista', desc: 'Tené 3 piezas en la Vitrina.', check: (s) => s.prestige.vitrina.length >= 3 },
  { id: 'dormi', name: 'Dormí tranquilo', desc: 'Volvé después de 2 horas o más.', check: (s) => (s.stats.maxOffline || 0) >= 7200 },
  { id: 'corte', name: 'Volvió la luz', desc: 'Sobreviví a un corte de luz.', check: (s) => s.stats.cortes >= 1 },
  { id: 'piloto', name: 'Piloto automático', desc: 'Expulsión, proveedor y gestor de pedidos instalados.', check: (s) => has(s, 'expulsion') && has(s, 'proveedor') && has(s, 'gestor') },
  { id: 'cinco', name: 'Cinco estrellas', desc: 'Tené una máquina con calidad ★5.', check: (s) => s.machines.some((m) => machineStars(s, m) >= 5) },
];

export const currentMission = (s) => MISSIONS[Math.min(s.missions.i, MISSIONS.length - 1)];

function checkProgress(s, out) {
  // Misiones en cadena (pueden completarse varias seguidas)
  for (let guard = 0; guard < 5; guard++) {
    const m = currentMission(s);
    if (!m.check(s)) break;
    if (m.reward?.money) { s.money += m.reward.money; s.runEarned += m.reward.money; s.totalEarned += m.reward.money; }
    if (m.reward?.spool) s.fil[m.reward.spool] += SPOOL_GRAMS;
    s.missions.i = Math.min(s.missions.i + 1, MISSIONS.length - 1);
    if (s.tutorial.active && s.missions.i >= FIRST_FREE_MISSION) { s.tutorial.active = false; out.push({ type: 'tutorialDone' }); }
    out.push({ type: 'mission', id: m.id, text: m.text, reward: m.reward, cta: m.cta });
    const next = currentMission(s);
    if (next.onStart) next.onStart(s);
  }
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.check(s)) {
      s.achievements[a.id] = Date.now();
      out.push({ type: 'achievement', id: a.id, name: a.name });
    }
  }
}

// Paso completo: simulación + misiones + logros (cada 0,5 s de juego).
export function step(s, dt, ctx = {}) {
  ctx.out = ctx.out || [];
  tick(s, dt, ctx);
  s.checkT += dt;
  if (s.checkT >= 0.5) { s.checkT = 0; checkProgress(s, ctx.out); }
  return ctx.out;
}

export function skipTutorial(s) {
  s.tutorial.active = false;
  s.tutorial.orders = true;
  for (const m of s.machines) m.waitStart = false;
  if (s.missions.i < FIRST_FREE_MISSION) s.missions.i = FIRST_FREE_MISSION;
}

// Al cargar una partida nueva, la primera misión arranca su onStart si lo tiene.
export function startMissionHooks(s) {
  const m = currentMission(s);
  if (m.onStart && s.tutorial.active) m.onStart(s);
}
