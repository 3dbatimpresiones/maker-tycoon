// SOLO DESARROLLO: partidas de ejemplo para revisar pantallas.
// ?demo=inicio|cuarto|garage|local|industrial|planta
import * as E from './engine.js';
import { skipTutorial, ensureChallenges } from './progress.js';
import { repNeeded, MATERIAL_ORDER, UNIT } from './data.js';

const SETUPS = {
  cuarto: { space: 1, rep: 3, ups: ['slicer', 'pei', 'sobrino', 'petg'], machines: ['magna', 'a1mini', 'kobra3'] },
  garage: { space: 2, rep: 6, ups: ['slicer', 'slicer', 'pei', 'sobrino', 'petg', 'calibracion', 'proveedor', 'directo', 'hotend', 'ams'], machines: ['magna', 'a1mini', 'mk4s', 'k1c', 'p1s', 'neptune', 'p1s'] },
  local: { space: 3, rep: 8, ups: ['slicer', 'slicer', 'pei', 'sobrino', 'petg', 'calibracion', 'proveedor', 'directo', 'hotend', 'ams', 'abs', 'boquilla', 'resina', 'expulsion'], machines: ['mk4s', 'p1s', 'x1c', 'k2plus', 'sidewinder', 'mars', 'photon', 'p1s', 'a1mini', 'k1c', 'x1c'] },
  industrial: { space: 4, rep: 11, ups: ['slicer', 'pei', 'petg', 'proveedor', 'directo', 'hotend', 'ams', 'abs', 'boquilla', 'resina', 'expulsion', 'laser', 'nylon', 'input'], machines: ['coreone', 'voron', 'h2d', 'x1c', 'saturn', 'falcon', 'xtools1', 'p1s', 'k2plus', 'mk4s', 'photon', 'h2d', 'voron', 'a1mini', 'sidewinder'] },
  planta: { space: 6, rep: 16, ups: ['slicer', 'pei', 'petg', 'proveedor', 'directo', 'hotend', 'ams', 'abs', 'boquilla', 'resina', 'expulsion', 'laser', 'nylon', 'input', 'cnc', 'granja'], machines: ['rackpro', 'rack', 'giga', 'prusaxl', 'h2d', 'voron', 'form4', 'xtoolp2', 'shapeoko', 'artisan', 'g3018', 'saturn', 'coreone', 'x1c', 'xtools1', 'k2plus', 'h2d', 'falcon', 'mars', 'p1s', 'mk4s', 'a1mini'] },
};

export function demoState(kind) {
  const s = E.newGame(null, 4242);
  skipTutorial(s);
  s.seen = { offer1: 1, daily1: 1 };
  if (kind === 'inicio' || !SETUPS[kind]) { s.money = 40; return s; }
  const D = SETUPS[kind];
  s.rep = repNeeded(D.rep);
  s.money = 1e15;
  while (s.space < D.space) { s.money += 1e15; E.buySpace(s); }
  for (const u of D.ups) { s.upgrades[u] = (s.upgrades[u] || 0) + 1; }
  for (const md of D.machines) E.buyMachine(s, md);
  s.money = { cuarto: 950, garage: 48000, local: 1.9e6, industrial: 3.2e8, planta: 4.5e12 }[kind];
  s.runEarned = s.money * 4;
  s.tokens = 7;
  for (const k of MATERIAL_ORDER) s.mat[k] = E.materialUnlocked(s, k) ? 6 * UNIT : 0;
  s.machines.forEach((m, i) => { const b = E.bestProductFor(s, m); if (b) m.product = b; m.waitStart = false; m.progress = 0; });
  // Avanzar un poco para que haya piezas a medio hacer
  s.machines.forEach((m, i) => { E.startMachine(s, m.id); m.progress = m.need * ((i * 0.37) % 1); });
  for (let i = 0; i < 6; i++) s.mastery[s.machines[i % s.machines.length].product] = 30 + i * 40;
  s.orders.spawnT = 999;
  s.prestige.moves = kind === 'planta' ? 4 : 1;
  s.prestige.total = kind === 'planta' ? 900 : 6;
  s.prestige.vitrina = [{ p: 'casco', move: 1 }, { p: 'figura', move: 2 }, { p: 'benchy', move: 3 }];
  ensureChallenges(s, Date.now());
  return s;
}
