// SOLO DESARROLLO: arma partidas de ejemplo para revisar pantallas (?demo=inicio|cuarto|garage|local).
import * as E from './engine.js';
import { skipTutorial } from './progress.js';
import { REP_LEVELS } from './data.js';

export function demoState(kind) {
  const s = E.newGame(null, 4242);
  skipTutorial(s);
  s.seen = { offer1: 1 };
  const cash = (n) => { s.money += n; };
  const buyAll = (ups) => ups.forEach((u) => { cash(E.upgradeCost(s, u)); E.buyUpgrade(s, u); });
  if (kind === 'inicio') { cash(40); return s; }
  s.rep = REP_LEVELS[kind === 'cuarto' ? 3 : kind === 'garage' ? 6 : 8];
  cash(1e9);
  E.buySpace(s);
  buyAll(['slicer', 'pei', 'sobrino', 'petg']);
  E.buyMachine(s, 'cartesiana'); E.buyMachine(s, 'kit');
  if (kind !== 'cuarto') {
    E.buySpace(s);
    buyAll(['slicer', 'slicer', 'calibracion', 'proveedor', 'directo', 'hotend']);
    E.buyMachine(s, 'rayo'); E.buyMachine(s, 'bunker'); E.buyMachine(s, 'gigante'); E.buyMachine(s, 'rayo');
    if (kind === 'local') { E.buySpace(s); buyAll(['boquilla', 'input', 'expulsion']); for (let i = 0; i < 5; i++) E.buyMachine(s, 'bunker'); }
  }
  s.money = kind === 'cuarto' ? 950 : kind === 'garage' ? 48000 : 1.9e6;
  s.runEarned = kind === 'local' ? 5e6 : s.money * 3;
  s.machines.forEach((m, i) => { const b = E.bestProductFor(s, m); if (b) m.product = b; m.waitStart = false; });
  s.fil.PETG = 3000; s.fil.TPU = 1000; s.fil.PLA = 2600;
  s.orders.spawnT = 999;
  s.trend = { p: 'maceta', until: 300, next: 600 };
  return s;
}
