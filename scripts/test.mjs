// Pruebas rápidas del motor: node scripts/test.mjs
import assert from 'node:assert/strict';
import * as E from '../src/game/engine.js';
import { step, skipTutorial, MISSIONS, ensureChallenges, claimChallenge, trackChallenges } from '../src/game/progress.js';
import { PERKS, TOKEN_SHOP, PRODUCTS, UPGRADES, ZONES, EXPO_PREP } from '../src/game/data.js';
import { money, dur, num, setCurrency } from '../src/game/format.js';
import { decideSync, summaryOf, isFreshSave } from '../src/online/api.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ✔', name); };
const run = (s, secs, idle = false) => { for (let i = 0; i < secs * 10; i++) step(s, 0.1, { out: [], idle }); };

t('partida nueva: 1 Kit esperando «Imprimir», 1 kg de PLA, tutorial activo', () => {
  const s = E.newGame(null, 1);
  assert.equal(s.machines.length, 1);
  assert.equal(s.machines[0].waitStart, true);
  assert.equal(s.mat.PLA, 1000);
  assert.equal(s.tutorial.active, true);
  run(s, 30);
  assert.equal(s.machines[0].state, 'idle', 'no arranca sola');
});

t('imprimir → terminar → retirar da plata y arranca la siguiente', () => {
  const s = E.newGame(null, 2);
  E.startMachine(s, s.machines[0].id);
  run(s, 21);
  assert.equal(s.machines[0].state, 'done');
  const ctx = { out: [] };
  assert.ok(E.retrieve(s, s.machines[0].id, ctx));
  assert.ok(s.money >= 3500);
  assert.equal(s.machines[0].state, 'printing');
  assert.equal(s.mat.PLA, 1000 - 16);
});

t('tutorial completo en menos de 2 min con un jugador atento', () => {
  const s = E.newGame(null, 3);
  for (let i = 0; i < 1200 && s.tutorial.active; i++) {
    const ctx = { out: [] };
    step(s, 0.1, ctx);
    for (const m of s.machines) {
      if (m.waitStart) E.startMachine(s, m.id);
      if (m.event) E.resolveEvent(s, m.id, 0);
      if (m.state === 'done') E.retrieve(s, m.id);
    }
    if (s.money >= 20 && !s.upgrades.slicer) E.buyUpgrade(s, 'slicer');
    for (const o of [...s.orders.offers]) E.acceptOrder(s, o.id);
  }
  assert.equal(s.tutorial.active, false, 'misión ' + MISSIONS[s.missions.i].id);
});

t('sin filamento la máquina espera; al comprar bobina sigue', () => {
  const s = E.newGame(null, 4); skipTutorial(s);
  s.mat.PLA = 0; s.money = 100000;
  run(s, 2);
  assert.equal(s.machines[0].state, 'nofil');
  assert.ok(E.buySpool(s, 'PLA'));
  run(s, 1);
  assert.equal(s.machines[0].state, 'printing');
});

t('pedido: aceptar asigna máquina, completar paga bonus y reputación', () => {
  const s = E.newGame(null, 5); skipTutorial(s);
  s.orders.spawnT = 999;
  run(s, 0.2);
  const o = s.orders.offers[0];
  assert.ok(o, 'hay oferta');
  assert.ok(E.acceptOrder(s, o.id));
  assert.equal(s.machines[0].orderId, o.id);
  const money0 = s.money, rep0 = s.rep;
  for (let i = 0; i < 20000 && s.orders.active.length; i++) {
    step(s, 0.1, { out: [] });
    for (const m of s.machines) { if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id); }
  }
  assert.equal(s.orders.active.length, 0);
  assert.ok(s.rep > rep0, 'sube reputación');
  assert.ok(s.money > money0);
});

t('pedido vencido: paga lo entregado y nunca baja de nivel', () => {
  const s = E.newGame(null, 6); skipTutorial(s);
  s.rep = 3; // justo nivel 2
  s.orders.spawnT = 999; run(s, 0.2);
  const o = s.orders.offers[0]; E.acceptOrder(s, o.id);
  run(s, o.time + 5); // nadie retira piezas
  assert.equal(s.orders.active.length, 0);
  assert.equal(E.repLevel(s), 2);
});

t('offline: produce a 50 %, respeta el tope y frena sin filamento', () => {
  const s = E.newGame(null, 7); skipTutorial(s);
  s.mat.PLA = 80; // 10 llaveros
  const r = E.applyOffline(s, 3600);
  assert.ok(r.earned > 0 && r.earned <= 10 * E.pieceValue(s, 'llavero', 1) * 0.5 + 1e-6, 'gana ' + r.earned);
  assert.deepEqual(r.stopped, ['PLA']);
  const s2 = E.newGame(null, 8); skipTutorial(s2); s2.mat.PLA = 1e9;
  const r2 = E.applyOffline(s2, 10 * 3600);
  assert.equal(r2.capped, true);
  assert.equal(r2.counted, 2 * 3600);
});

t('BATI resuelve problemas pendientes al volver', () => {
  const s = E.newGame(null, 9); skipTutorial(s);
  run(s, 3);
  s.machines[0].event = { id: 'tapada', since: s.time, auto: null };
  const r = E.applyOffline(s, 120);
  assert.equal(r.fixed, 1);
  assert.equal(s.machines[0].event, null);
});

t('eventos: no aparecen con el jugador inactivo', () => {
  const s = E.newGame(null, 10); skipTutorial(s);
  s.mat.PLA = 1e9;
  for (let i = 0; i < 3000; i++) {
    step(s, 0.5, { out: [], idle: true });
    for (const m of s.machines) if (m.state === 'done') E.retrieve(s, m.id);
  }
  assert.equal(Object.values(s.stats.events).reduce((a, b) => a + b, 0), 0);
});

t('guardado: serializar y migrar devuelve la misma partida', () => {
  const s = E.newGame(null, 11); skipTutorial(s);
  run(s, 60);
  const back = E.migrate(JSON.parse(E.serialize(s)));
  assert.equal(back.money, s.money);
  assert.equal(back.machines.length, s.machines.length);
  assert.equal(E.migrate({ hola: 1 }), null);
  assert.equal(E.migrate({ ...JSON.parse(E.serialize(s)), v: 999 }), null);
});

t('mudanza: da Oficio, conserva logros y vitrina, reinicia el taller', () => {
  const s = E.newGame(null, 12); skipTutorial(s);
  s.runEarned = 4 * E.OFICIO_SCALE; s.space = 3; s.achievements.primera = 1;
  assert.ok(E.canMove(s));
  const n2 = E.doMove(s, 'casco');
  assert.equal(n2.prestige.total, 4);
  assert.equal(n2.prestige.vitrina[0].p, 'casco');
  assert.equal(n2.achievements.primera, 1);
  assert.equal(n2.space, 0);
  assert.equal(n2.money, 0);
  assert.equal(n2.tutorial.active, false);
  assert.ok(E.buyPerk(n2, 'mesa', PERKS));
  assert.ok(E.oficioMult(n2) > 1.1);
});

t('migración v0.1 → v0.2: máquinas genéricas pasan a marcas reales', () => {
  const old = { v: 1, money: 500, machines: [{ id: 1, model: 'kit', product: 'llavero', state: 'printing', cur: 'llavero', progress: 3, need: 20 }, { id: 2, model: 'gigante', product: 'xl', state: 'idle' }],
    fil: { PLA: 2000, PETG: 500, TPU: 0 }, upgrades: { slicer: 2, input: 1 }, space: 2, rep: 40, orders: { offers: [], active: [] }, prestige: { points: 1, total: 2, perks: {}, moves: 1, vitrina: [{ p: 'xl' }] } };
  const s = E.migrate(old);
  assert.equal(s.v, 3);
  assert.ok(s.money > 500 * 100, 'la plata pasa a AR$');
  assert.deepEqual(s.machines.map((m) => m.model), ['ender3', 'sidewinder']);
  assert.equal(s.machines[1].product, 'casco');
  assert.equal(s.mat.PLA, 2000);
  assert.equal(s.prestige.vitrina[0].p, 'casco');
  assert.equal(s.upgrades.input, 1);
  run(s, 5);
});

t('marcas y reglas: tamaño de cama, multicolor, impresora cerrada', () => {
  const s = E.newGame(null, 20); skipTutorial(s);
  s.rep = 1e9; s.space = 6; s.money = 1e15;
  for (const u of ['petg', 'abs', 'nylon', 'ams', 'resina', 'laser', 'cnc']) s.upgrades[u] = 1;
  const mini = E.buyMachine(s, 'a1mini');
  const p1s = E.buyMachine(s, 'p1s');
  const ender = s.machines[0];
  assert.match(E.machineCantReason(s, mini, 'casco'), /No entra/);
  assert.equal(E.canPrint(s, p1s, 'carcasa'), true);
  assert.match(E.machineCantReason(s, ender, 'carcasa'), /cerrada/);
  assert.equal(E.canPrint(s, p1s, 'lampara'), true, 'P1S con AMS');
  assert.match(E.machineCantReason(s, ender, 'lampara'), /multicolor/);
  const mars = E.buyMachine(s, 'mars');
  assert.equal(E.canPrint(s, mars, 'miniatura'), true);
  assert.equal(E.machineCantReason(s, mars, 'llavero'), 'Otra tecnología');
});

t('experiencia por producto: sube de nivel y paga más', () => {
  const s = E.newGame(null, 21); skipTutorial(s);
  const v0 = E.pieceValue(s, 'llavero', 1);
  s.mastery.llavero = 25;
  assert.equal(E.masteryLevel(s, 'llavero'), 1);
  assert.ok(Math.abs(E.pieceValue(s, 'llavero', 1) / v0 - 1.12) < 1e-9);
  s.mastery.llavero = 225;
  assert.equal(E.masteryLevel(s, 'llavero'), 3);
});

t('desafío de maestría: reglas activas y premio al cumplir', () => {
  const s = E.newGame(null, 22); skipTutorial(s);
  s.prestige.moves = 1;
  const c = E.startChallenge(s, 'sinmate');
  assert.ok(c && c.challenge.id === 'sinmate');
  assert.equal(E.useMate(c), false);
  c.space = 2;
  step(c, 1, { out: [] });
  assert.equal(c.challenge, null);
  assert.ok(c.prestige.mastery.sinmate);
  assert.equal(E.mateBoost(c), 2);
});

t('desafíos diarios: se generan por día, avanzan y dan fichas', () => {
  const s = E.newGame(null, 23); skipTutorial(s);
  const now = new Date(2026, 9, 24, 12).getTime();
  ensureChallenges(s, now);
  assert.equal(s.daily.list.length, 3);
  assert.equal(s.weekly.list.length, 1);
  const c = s.daily.list[0];
  c.prog = c.target;
  const r = claimChallenge(s, 'daily', 0);
  assert.ok(r >= 1 && s.tokens === r);
  assert.equal(claimChallenge(s, 'daily', 0), false, 'no se cobra dos veces');
  ensureChallenges(s, now + 86400000);
  assert.notEqual(s.daily.key, '2026-10-24');
});

t('contrato de empresa y tienda de fichas', () => {
  const s = E.newGame(null, 24); skipTutorial(s);
  s.rep = 40; s.money = 1e8; s.tokens = 10;
  for (let i = 0; i < 3; i++) E.buyMachine(s, 'ender3');
  const o = E.spawnContract(s);
  assert.ok(o.contract && o.tokens >= 2 && o.items.length >= 1);
  const r = E.buyTokenItem(s, 'turbo', TOKEN_SHOP);
  assert.ok(r && s.tokens === 7 && s.boost.turbo > s.time);
  const m0 = s.money;
  E.buyTokenItem(s, 'salto', TOKEN_SHOP);
  assert.ok(s.money > m0 && s.tokens === 2);
});

t('migración v0.2 → v0.3: la plata vale los mismos minutos de producción', () => {
  // Partida v0.2 típica: cuarto maker, 3 máquinas, $24.599 ahorrados.
  const v2 = E.newGame(null, 30); skipTutorial(v2);
  v2.v = 2; v2.space = 1; v2.rep = 10;
  v2.machines.push({ ...v2.machines[0], id: 2, model: 'a1mini', product: 'benchy' }, { ...v2.machines[0], id: 3, model: 'magna', product: 'soporte' });
  v2.machines[0].product = 'llavero';
  v2.money = 24599; v2.runEarned = 60000; v2.totalEarned = 80000;
  v2.orders.active = [{ id: 1, tpl: 'cumple', items: [{ p: 'llavero', qty: 12, done: 3 }], reward: 90, deadline: 999 }];
  // Ritmo con las fórmulas de la v0.2: velocidades viejas (A1 mini 2,4), estrellas viejas y reputación vieja (nivel 3 → +10 %).
  const oldRate = (5 / 20 * 1 * 1 + 14 / 45 * 2.4 * 1.6 + 35 / 90 * 1.3 * 1.25) * 1.1;
  const s = E.migrate(JSON.parse(JSON.stringify(v2)));
  assert.equal(s.v, 3);
  const f = s.econFactor;
  assert.ok(f > 300 && f < 1500, 'factor ' + f);
  // Minutos de producción equivalentes (±5 %)
  const newRate = E.potentialRate(s);
  assert.ok(Math.abs((s.money / newRate) / (24599 / oldRate) - 1) < 0.05);
  assert.equal(s.orders.active.length, 0, 'pedidos viejos se limpian');
  assert.equal(s.machines.length, 3);
  assert.equal(s.space, 1);
  assert.equal(s.rep, 10);
  run(s, 5);
});

t('formato argentino', () => {
  assert.equal(money(12500), 'AR$ 12.500');
  assert.equal(money(1.5e6), 'AR$ 1,5 M');
  assert.equal(money(3.2e9), 'AR$ 3,2 mil M');
  setCurrency('USD');
  assert.equal(money(3.2e6), 'US$ 2.000');
  assert.equal(money(3500), 'US$ 2,19');
  setCurrency('ARS');
  assert.equal(dur(4800), '1 h 20 min');
  assert.equal(num(4.5), '4,5');
  assert.equal(money(2.5e18), 'AR$ 2,5 Tr');
});

t('nube: cuenta sin partida guardada → se sube la de este navegador', () => {
  const s = E.newGame(null, 5); skipTutorial(s);
  assert.equal(decideSync({ uid: 'u1', cloud: null, meta: null, local: s }).action, 'upload');
});

t('nube: partida recién empezada → se usa la de la nube sin preguntar', () => {
  const fresh = E.newGame(null, 6);
  const cloud = { rev: 4, summary: { pieces: 900, totalEarned: 5e6, machines: 4 } };
  assert.equal(decideSync({ uid: 'u1', cloud, meta: null, local: fresh }).action, 'useCloud');
  assert.ok(isFreshSave(fresh));
});

t('nube: dos partidas con progreso distinto → SIEMPRE se pregunta (nunca se pisa)', () => {
  const s = E.newGame(null, 7); skipTutorial(s);
  s.stats.pieces = 500; s.totalEarned = 4e6;
  const cloud = { rev: 2, summary: { pieces: 9000, totalEarned: 8e7, machines: 9 } };
  assert.equal(decideSync({ uid: 'u1', cloud, meta: null, local: s }).action, 'ask');
  assert.equal(decideSync({ uid: 'u1', cloud, meta: { uid: 'u1', rev: 1 }, local: s }).reason, 'cloudNewer');
  assert.equal(decideSync({ uid: 'u2', cloud, meta: { uid: 'u1', rev: 2 }, local: s }).action, 'ask', 'otra cuenta en el mismo navegador');
});

t('nube: misma versión → sigue guardando; misma partida → se adopta sin preguntar', () => {
  const s = E.newGame(null, 8); skipTutorial(s);
  s.stats.pieces = 300; s.totalEarned = 2e6;
  const cloud = { rev: 5, summary: summaryOf(s) };
  assert.equal(decideSync({ uid: 'u1', cloud, meta: { uid: 'u1', rev: 5 }, local: s }).action, 'inSync');
  assert.equal(decideSync({ uid: 'u1', cloud, meta: null, local: s }).action, 'adopt');
  // Guardado de salida que no llegó: la local es la más nueva, no se molesta al jugador.
  const d = decideSync({ uid: 'u1', cloud, meta: { uid: 'u1', rev: 6, pending: true }, local: { ...s, stats: { ...s.stats, pieces: 320 } } });
  assert.equal(d.action, 'inSync'); assert.equal(d.fixRev, 5);
});

t('premios online: sobreviven a la Mudanza y el Llavero BATI pide su plano', () => {
  const s = E.newGame(null, 9); skipTutorial(s);
  assert.equal(E.productUnlocked(s, 'llaverobati'), false);
  assert.ok(/Plano/.test(E.productLockReason(s, 'llaverobati')));
  s.cosmetics.unlocked = ['p_bati', 'd_planta']; s.cosmetics.decor = ['d_planta'];
  assert.equal(E.productUnlocked(s, 'llaverobati'), true);
  assert.equal(PRODUCTS.llaverobati.price, PRODUCTS.llavero.price, 'paga igual que el llavero común');
  assert.equal(PRODUCTS.llaverobati.time, PRODUCTS.llavero.time);
  s.runEarned = E.OFICIO_SCALE * 4;
  const next = E.doMove(s, null);
  assert.deepEqual(next.cosmetics.unlocked, ['p_bati', 'd_planta']);
  assert.deepEqual(next.cosmetics.decor, ['d_planta']);
  const old = JSON.parse(E.serialize(E.newGame(null, 10))); delete old.cosmetics;
  assert.deepEqual(E.migrate(old).cosmetics.unlocked, [], 'partidas viejas reciben la estructura vacía');
});

t('desafío semanal cobrado suma al contador (para los puntos online)', () => {
  const s = E.newGame(null, 11); skipTutorial(s);
  ensureChallenges(s, Date.now());
  const c = s.weekly.list[0]; c.prog = c.target;
  claimChallenge(s, 'weekly', 0);
  assert.equal(s.stats.weeklyDone, 1);
});

t('desgaste: sube imprimiendo, hace fallar más y se repara', () => {
  const s = E.newGame(null, 12); skipTutorial(s);
  const m = s.machines[0];
  assert.equal(m.wear, 0);
  const base = E.machineFail(s, m);
  m.state = 'printing'; m.cur = 'llavero'; m.need = 1e12; m.progress = 0;
  const ctx = { out: [], idle: true };
  for (let i = 0; i < 24 * 6; i++) E.tick(s, 600, ctx); // 24 h imprimiendo, de a 10 min
  assert.ok(Math.abs(m.wear - 0.05) < 1e-6, '24 h → 5 %: ' + m.wear);
  assert.ok(!ctx.out.some((e) => e.type === 'worn'), 'todavía no avisa');
  assert.ok(Math.abs(E.wearAfter(0, 168) - 1) < 1e-6, '7 días → 100 %');
  assert.ok(E.wearAfter(0, 48) - E.wearAfter(0, 24) > E.wearAfter(0, 24), 'el segundo día gasta más que el primero (exponencial)');
  for (let i = 0; i < 6 * 24 * 5; i++) E.tick(s, 600, ctx); // 5 días más: pasa el 60 %
  assert.ok(m.wear > 0.6 && m.wear < 0.85, 'a los 6 días: ' + m.wear);
  assert.ok(ctx.out.some((e) => e.type === 'worn'), 'avisa que está gastada');
  assert.ok(Math.abs(E.machineFail(s, m) / base - (1 + E.WEAR_FAIL * m.wear)) < 1e-9, 'falla más');
  const c = E.repairCost(s, m);
  s.money = c - 1;
  assert.equal(E.repairMachine(s, m.id), false, 'sin plata no se repara');
  s.money = c;
  assert.equal(E.repairMachine(s, m.id), true);
  assert.equal(m.wear, 0); assert.equal(s.money, 0); assert.equal(s.stats.repairs, 1);
  const old = JSON.parse(E.serialize(E.newGame(null, 13))); delete old.machines[0].wear; delete old.market;
  const mg = E.migrate(old);
  assert.equal(mg.machines[0].wear, 0, 'las máquinas de antes arrancan sin desgaste');
  assert.deepEqual(mg.market, { outbox: [], done: [] });
});

t('usados: publicar, rechazo devuelve la máquina igual, confirmación la deja afuera', () => {
  const s = E.newGame(null, 14); skipTutorial(s);
  assert.ok(E.listReason(s, s.machines[0]), 'no se puede vender la única');
  s.space = 1; s.money = 1e9;
  E.buyMachine(s, 'ender3');
  const m = s.machines[1]; m.wear = 0.4;
  const paid = m.paid;
  const e = E.listUsed(s, m.id, E.usedMax('ender3', 0.4) + 5000, 'n1');
  assert.equal(e.price, E.usedMax('ender3', 0.4), 'más caro que el tope: se ajusta al tope');
  assert.ok(e && s.machines.length === 1 && s.market.outbox.length === 1);
  const back = E.listRejected(s, 'n1');
  assert.ok(back && back.wear === 0.4 && back.paid === paid && s.machines.length === 2 && s.market.outbox.length === 0);
  E.listUsed(s, back.id, 100000, 'n2');
  E.listConfirmed(s, 'n2');
  assert.equal(s.machines.length, 1); assert.equal(s.market.outbox.length, 0);
  assert.equal(E.usedMax('ender3', 0), 360000); assert.equal(E.usedMax('ender3', 1), 180000); assert.equal(E.usedMin('ender3'), 40000);
});

t('usados: comprar, cobrar y recuperar se aplican una sola vez', () => {
  const s = E.newGame(null, 15); skipTutorial(s);
  s.space = 1; s.money = 1e6;
  const it = { id: 7, model: 'ender3', wear: 0.5, price: 250000 };
  assert.equal(E.buyUsedReason(s, it), null);
  assert.ok(E.buyUsedReason(s, { ...it, model: 'rackpro' }), 'una que todavía no desbloqueaste: no');
  assert.ok(E.buyUsedReason(s, { ...it, mine: true }));
  const m = E.receiveUsed(s, it);
  assert.ok(m && m.wear === 0.5 && m.used && m.paid === 250000);
  assert.equal(s.money, 750000);
  assert.equal(E.receiveUsed(s, it), null, 'no se recibe dos veces');
  assert.equal(s.machines.length, 2);
  const earned = s.runEarned;
  assert.equal(E.settleSale(s, { id: 9, price: 300000 }), true);
  assert.equal(E.settleSale(s, { id: 9, price: 300000 }), false, 'no se cobra dos veces');
  assert.equal(s.money, 1050000); assert.equal(s.runEarned, earned, 'no cuenta como ganado');
  const r = E.takeBack(s, { id: 10, model: 'ender3', wear: 0.2, price: 200000 });
  assert.ok(r.machine && r.machine.wear === 0.2);
  assert.ok(E.takeBack(s, { id: 10, model: 'ender3', wear: 0.2, price: 200000 }).done);
  const r2 = E.takeBack(s, { id: 11, model: 'rackpro', wear: 0, price: 1e7 });
  assert.equal(r2.cash, 5e6, 'si ya no la podés usar, se vende al por mayor');
  s.runEarned = E.OFICIO_SCALE * 4;
  const next = E.doMove(s, null);
  assert.ok(next.market.done.includes('b7') && next.market.done.includes('s9'), 'lo hecho sobrevive a la Mudanza');
});

t('plan canje: dos chicas + la diferencia por una más grande', () => {
  const s = E.newGame(null, 16); skipTutorial(s);
  s.space = 1; s.rep = 1e6; s.money = 1e9;
  E.buyMachine(s, 'a1mini');
  s.machines[0].wear = 0.5;
  const [ender, mini] = s.machines;
  assert.ok(E.tradeValue(s, ender) > Math.round(ender.paid * 0.5) - 1, 'vale al menos lo que te dan vendiéndola');
  assert.ok(E.tradeValue(s, mini) > E.tradeValue(s, { ...mini, wear: 0.9 }), 'gastada vale menos');
  assert.ok(E.tradeReason(s, 'magna', [ender.id, mini.id]), 'la Magna no es más grande que la A1 mini');
  assert.equal(E.tradeReason(s, 'k1c', [ender.id, mini.id]), null);
  const q = E.tradeQuote(s, 'k1c', [ender.id, mini.id]);
  assert.equal(q.price - q.credit, q.pay);
  const money0 = s.money, earned0 = s.runEarned;
  const r = E.tradeIn(s, 'k1c', [ender.id, mini.id]);
  assert.ok(r && s.machines.length === 1 && s.machines[0].model === 'k1c');
  assert.equal(s.money, money0 - q.pay); assert.equal(s.runEarned, earned0);
  assert.equal(s.stats.tradeIns, 1);
  // Taller lleno: el canje libera lugar
  const f = E.newGame(null, 17); skipTutorial(f); f.money = 1e9; f.rep = 1e6;
  while (f.machines.length < E.slots(f)) E.buyMachine(f, 'ender3');
  assert.equal(E.buyMachine(f, 'a1mini'), null, 'lleno: no entra una más');
  assert.equal(E.tradeReason(f, 'a1mini', [f.machines[0].id]), null, 'pero entregando una, sí');
  // Siempre se paga algo
  const g = E.newGame(null, 18); skipTutorial(g); g.space = 1; g.rep = 1e6; g.money = 1e9;
  for (let i = 0; i < 2; i++) E.buyMachine(g, 'a1mini');
  const ids = g.machines.map((m) => m.id);
  assert.ok(E.tradeQuote(g, 'magna', []).pay > 0);
  assert.ok(E.tradeQuote(g, 'k1c', ids.slice(0, 3)).pay >= Math.ceil(E.machineCost(g, 'k1c') * 0.1) - 1);
});

t('plan canje con fichas', () => {
  const s = E.newGame(null, 19); skipTutorial(s);
  s.space = 1; s.rep = 1e6; s.money = 1e9; s.tokens = 12;
  const q0 = E.tradeQuote(s, 'k1c', [], 0);
  const q5 = E.tradeQuote(s, 'k1c', [], 5);
  assert.equal(q5.tokenCredit, Math.round(q0.price * 0.15), '5 fichas = 15 %');
  assert.equal(E.tradeQuote(s, 'k1c', [], 50).tokens, E.TRADE_TOKEN_MAX, 'tope 10 fichas');
  assert.equal(E.tradeReason(s, 'k1c', [], 5), null, 'se puede canjear solo con fichas');
  assert.ok(E.tradeReason(s, 'k1c', [], 13), 'no más fichas de las que tenés');
  const r = E.tradeIn(s, 'k1c', [s.machines[0].id], 4);
  assert.ok(r && s.tokens === 8 && s.machines.some((m) => m.model === 'k1c'));
});

t('canje entre makers: apartar, devolver y recibir sin perder nada', () => {
  const s = E.newGame(null, 20); skipTutorial(s);
  s.space = 2; s.rep = 1e6; s.money = 5e6; s.tokens = 10;
  E.buyMachine(s, 'a1mini'); E.buyMachine(s, 'a1mini');
  const it = { id: 50, model: 'p1s', price: 1500000, wear: 0.1 };
  let minis = s.machines.filter((m) => m.model === 'a1mini').map((m) => m.id);
  const refresh = () => { minis = s.machines.filter((m) => m.model === 'a1mini').map((m) => m.id); };
  assert.ok(E.offerReason(s, it, s.machines.map((m) => m.id), 0, 0), 'no podés quedarte sin máquinas');
  assert.ok(E.offerReason(s, { ...it, mine: true }, minis, 0, 0));
  assert.ok(E.offerReason(s, it, [], 0, 25), 'hasta 20 fichas (y las que tengas)');
  const money0 = s.money;
  const e = E.offerEscrow(s, it, minis, 100000, 5, 'n1');
  assert.ok(e && e.items.length === 2 && s.machines.length === 1 && s.money === money0 - 100000 && s.tokens === 5);
  E.offerRejectedLocal(s, 'n1');
  assert.ok(s.machines.length === 3 && s.money === money0 && s.tokens === 10, 'si no se pudo mandar, vuelve todo');
  refresh();
  const e2 = E.offerEscrow(s, it, minis, 100000, 5, 'n2');
  E.listConfirmed(s, 'n2');
  // No prosperó: vuelve una sola vez
  assert.ok(E.offerBack(s, { id: 7, items: e2.items, money: 100000, tokens: 5 }).ok);
  assert.ok(E.offerBack(s, { id: 7, items: e2.items, money: 100000, tokens: 5 }).done, 'no vuelve dos veces');
  assert.ok(s.machines.length === 3 && s.money === money0 && s.tokens === 10);
  // Aceptada: el comprador recibe la P1S sin volver a pagar
  refresh();
  assert.ok(E.offerEscrow(s, it, minis, 100000, 5, 'n3')); E.listConfirmed(s, 'n3');
  const m0 = s.money;
  E.receiveUsed(s, { id: 50, model: 'p1s', wear: 0.1, price: 1500000, prepaid: true });
  assert.ok(s.money === m0 && s.machines.some((m) => m.model === 'p1s'), 'por canje no se cobra de nuevo');
  // El vendedor recibe máquinas + plata + fichas (una sola vez)
  const v = E.newGame(null, 21); skipTutorial(v); v.space = 1;
  const vm = v.money, ve = v.runEarned;
  assert.ok(E.tradeGot(v, { id: 50, items: e2.items, money: 100000, tokens: 5 }).ok);
  assert.ok(E.tradeGot(v, { id: 50, items: e2.items, money: 100000, tokens: 5 }).done);
  assert.ok(v.machines.length === 3 && v.money === vm + 100000 && v.tokens === 5 && v.runEarned === ve);
});

t('Nave de producción: un piso por tecnología con 20 lugares', () => {
  const s = E.newGame(null, 30); skipTutorial(s);
  s.rep = 1e7; s.money = 1e15; s.space = 4;
  for (const id of ['laser', 'resina', 'cnc', 'saberlaser', 'saberresina', 'sabercnc']) if (UPGRADES[id]) s.upgrades[id] = 1;
  while (s.machines.length < E.slots(s)) E.buyMachine(s, 'ender3');
  assert.equal(E.buyMachine(s, 'ender3'), null, 'taller industrial lleno');
  s.space = 5;
  assert.ok(E.hasFloors(s));
  assert.equal(E.floorUsed(s, 'fdm'), 16, 'las FDM que había pasan al piso 1 sin perder nada');
  for (let i = 0; i < 4; i++) assert.ok(E.buyMachine(s, 'ender3'));
  assert.equal(E.floorUsed(s, 'fdm'), 20);
  assert.equal(E.buyMachine(s, 'ender3'), null, 'piso FDM lleno (20/20)');
  assert.ok(E.buyMachine(s, 'mars'), 'pero el piso de resina tiene su lugar');
  assert.equal(E.floorUsed(s, 'resin'), 1);
  // canje: entregar una FDM libera lugar en el piso FDM
  const fdm = s.machines.find((m) => m.model === 'ender3');
  assert.equal(E.tradeReason(s, 'a1mini', [fdm.id]), null);
  // reorganizar: solo con las de su mismo piso
  const ids = E.floorMachines(s, 'fdm').map((m) => m.id);
  assert.ok(E.moveMachine(s, ids[1], -1));
  assert.deepEqual(E.floorMachines(s, 'fdm').map((m) => m.id).slice(0, 2), [ids[1], ids[0]]);
  assert.equal(E.moveMachine(s, ids[1], -1), false, 'ya es la primera de su piso');
});

t('Planta con más de 30 FDM: no se pierde nada, solo no se compran más', () => {
  const s = E.newGame(null, 31); skipTutorial(s);
  s.rep = 1e7; s.money = 1e15; s.space = 6;
  for (let i = 0; i < 33; i++) s.machines.push({ ...s.machines[0], id: 1000 + i });
  const n = s.machines.length;
  const back = E.migrate(JSON.parse(E.serialize(s)));
  assert.equal(back.machines.length, n, 'todas siguen ahí');
  assert.equal(E.buyMachine(back, 'ender3'), null, 'piso FDM excedido: no entra otra');
});

t('la Planta tiene pisos de 30 (más que la Nave)', () => {
  const s = E.newGame(null, 52); skipTutorial(s);
  s.space = 5; assert.equal(E.floorCap(s), 20);
  s.space = 6; assert.equal(E.floorCap(s), 30);
  s.rep = 1e7; s.money = 1e15;
  while (E.floorMachines(s, 'fdm').length < 30) assert.ok(E.buyMachine(s, 'ender3'));
  assert.equal(E.buyMachine(s, 'ender3'), null, 'con 30 se llena');
});

t('pedido combinado entre tecnologías', () => {
  const s = E.newGame(null, 32); skipTutorial(s);
  s.rep = 1e7; s.money = 1e15; s.space = 5;
  for (const id of ['laser', 'resina', 'cnc', 'saberlaser', 'saberresina', 'sabercnc']) if (UPGRADES[id]) s.upgrades[id] = 1;
  assert.equal(E.spawnCombo(s), null, 'con una sola tecnología no hay combinado');
  E.buyMachine(s, 'falcon');
  const o = E.spawnCombo(s);
  assert.ok(o && o.combo && o.items.length === 2 && o.tokens === 2, JSON.stringify(o));
  const techs = o.items.map((it) => PRODUCTS[it.p].tech).sort();
  assert.deepEqual(techs, ['fdm', 'laser']);
});

t('presupuestos: rápido paga más con menos plazo; premium pide más calidad', () => {
  const s = E.newGame(null, 40); skipTutorial(s);
  s.rep = 50; s.orders.spawnT = 999; run(s, 0.2);
  const o = s.orders.offers.find((x) => E.quotable(s, x));
  assert.ok(o, 'hay pedido presupuestable');
  const std = { reward: o.reward, time: o.time };
  const f = E.quoteFor(s, o, 'fast');
  assert.ok(f.reward > std.reward && f.time < std.time);
  const p = E.quoteFor(s, o, 'prem');
  assert.equal(p.minStars, Math.min(5, o.minStars + 1));
  if (p.why) assert.equal(E.acceptOrder(s, o.id, 'prem'), false, 'sin calidad no se acepta premium');
  assert.ok(E.acceptOrder(s, o.id, 'fast'));
  const a = s.orders.active[0];
  assert.equal(a.quote, 'fast'); assert.equal(a.reward, f.reward); assert.equal(a.time, f.time);
});

t('clientes: entregar sube la confianza; fallar dos veces lo aleja un rato', () => {
  const s = E.newGame(null, 41); skipTutorial(s);
  s.rep = 50; s.orders.spawnT = 999; run(s, 0.2);
  const o = s.orders.offers.find((x) => E.quotable(s, x));
  const who = o.client;
  E.acceptOrder(s, o.id, 'eco');
  for (let i = 0; i < 40000 && s.orders.active.length; i++) {
    step(s, 0.1, { out: [] });
    for (const m of s.machines) { if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id); }
  }
  const c = E.clientOf(s, who);
  assert.ok(c.trust >= 15 && c.done === 1 && c.last >= 3, JSON.stringify(c));
  s.orders.clients[who].trust = 20;
  for (let k = 0; k < 2; k++) {
    const fake = { ...o, id: 900 + k, items: o.items.map((it) => ({ ...it, done: 0 })), quote: 'std' };
    s.orders.active.push({ ...fake, deadline: s.time + 1 });
    run(s, 2);
  }
  assert.ok(E.clientGone(s, who), 'se fue con otro taller');
  const back = E.migrate(JSON.parse(E.serialize(s)));
  assert.ok(E.clientGone(back, who), 'se guarda');
  const moved = E.newGame({ orders: { clients: back.orders.clients, fidelity: {} } }, 1);
  assert.ok(E.clientOf(moved, who).reviews >= 3, 'los clientes sobreviven a la mudanza');
});

t('mods por máquina: 3 ranuras, efectos y devolución al vender', () => {
  const s = E.newGame(null, 42); skipTutorial(s);
  s.money = 1e9;
  const m = s.machines[0];
  const v0 = E.machineSpeed(s, m, false), st0 = E.machineStars(s, m);
  assert.ok(E.installMod(s, m.id, 'hotend'));
  assert.ok(Math.abs(E.machineSpeed(s, m, false) - v0 * 1.2) < 1e-9);
  assert.equal(E.installMod(s, m.id, 'hotend'), false, 'no se repite');
  assert.equal(E.installMod(s, m.id, 'fep'), false, 'uno de resina no va en una FDM');
  assert.ok(E.installMod(s, m.id, 'endurecida'));
  assert.equal(E.machineStars(s, m), Math.min(5, st0 + 1));
  assert.ok(E.installMod(s, m.id, 'gabinete'));
  assert.equal(E.modReason(s, m, 'pei'), 'Sin ranuras libres (3/3)');
  const before = s.money;
  assert.ok(E.removeMod(s, m.id, 'gabinete'));
  assert.equal(s.money - before, Math.round(E.modCost(s, m, 'gabinete') * 0.5));
  const back = E.migrate(JSON.parse(E.serialize(s)));
  assert.deepEqual(back.machines[0].mods, ['hotend', 'endurecida'], 'se guardan');
  E.buyMachine(s, 'ender3');
  const refund = E.modsRefund(s, m) + Math.round((m.paid || 0) * 0.5);
  const b2 = s.money;
  assert.ok(E.sellMachine(s, m.id));
  assert.equal(s.money - b2, refund, 'al vender devuelve la mitad de los mods');
});

t('proyecto grande: etapas en cadena y bonus al final', () => {
  const s = E.newGame(null, 43); skipTutorial(s);
  s.rep = 1e6; s.money = 1e12; s.mat.PLA = 1e9; s.mat.PETG = 1e9;
  for (let i = 0; i < 3; i++) E.buyMachine(s, 'ender3');
  const o = E.spawnProject(s, 'stand');
  assert.ok(o && o.project.stage === 0 && o.project.n === 3, JSON.stringify(o?.project));
  assert.equal(E.spawnProject(s), null, 'uno por vez');
  const money0 = s.money, tokens0 = s.tokens;
  const evs = [];
  for (let stage = 0; stage < 3; stage++) {
    const cur = s.orders.offers.find((x) => x.project);
    assert.ok(cur, 'etapa ' + (stage + 1) + ' en el tablero');
    assert.equal(cur.project.stage, stage);
    assert.ok(E.acceptOrder(s, cur.id));
    for (let i = 0; i < 80000 && s.orders.active.some((x) => x.project); i++) {
      const ctx = { out: [] };
      step(s, 0.1, ctx); evs.push(...ctx.out);
      for (const m of s.machines) { if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id, ctx); }
    }
  }
  assert.ok(!s.orders.offers.some((x) => x.project) && !s.orders.active.some((x) => x.project), 'terminado');
  assert.ok(s.tokens >= tokens0 + 3 + 5, 'fichas por etapa + 5 al final');
  assert.ok(s.money > money0);
  assert.equal(s.stats.projects, 1);
});

t('ciudad: la demanda rota, cambia el precio de venta y los rivales se pueden superar', () => {
  const s = E.newGame(null, 44); skipTutorial(s);
  s.rep = 30; run(s, 1);
  assert.equal(s.city.hot.length, 2); assert.ok(s.city.cold);
  const z = ZONES.find((x) => x.id === s.city.hot[0]);
  const pid = z.products[0];
  assert.equal(E.demandMult(s, pid), 1.4);
  const cold = ZONES.find((x) => x.id === s.city.cold);
  const onlyCold = cold.products.find((p) => !E.zonesOf(p).some((zz) => s.city.hot.includes(zz.id)));
  if (onlyCold) assert.equal(E.demandMult(s, onlyCold), 0.85);
  const until = s.city.until;
  run(s, until - s.time + 1);
  assert.ok(s.city.until > until, 'rotó');
  // rivales: con muchísima fama los superás a todos (premio una vez)
  s.stats.orders = 1e5;
  const evs = [];
  for (let i = 0; i < 120; i++) { const ctx = { out: [] }; step(s, 0.1, ctx); evs.push(...ctx.out); }
  assert.ok(Object.values(s.city.rivals).filter((r) => r.beaten).length === 4);
  const later = [];
  for (let i = 0; i < 120; i++) { const ctx = { out: [] }; step(s, 0.1, ctx); later.push(...ctx.out); }
  assert.ok(evs.filter((e) => e.type === 'rivalBeaten').length >= 1);
  assert.equal(later.filter((e) => e.type === 'rivalBeaten').length, 0, 'el premio es una sola vez por rival');
});

t('Expo Maker: inscribirse, producir y quedar en un puesto', () => {
  const s = E.newGame(null, 45); skipTutorial(s);
  s.rep = 1e5; s.money = 1e12; s.mat.PLA = 1e9;
  for (let i = 0; i < 3; i++) E.buyMachine(s, 'ender3');
  E.openExpo(s);
  assert.equal(E.expoJoinReason(s, [], 0), 'Elegí de 1 a 3 productos');
  assert.ok(E.expoJoin(s, ['llavero', 'benchy'], 2));
  assert.equal(s.city.expo.state, 'joined');
  const ctx = { out: [] };
  for (let i = 0; i < (EXPO_PREP + 5) * 10; i++) {
    step(s, 0.1, ctx);
    for (const m of s.machines) { if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id, ctx); }
  }
  const done = ctx.out.find((e) => e.type === 'expoDone');
  assert.ok(done && done.place >= 1 && done.place <= 5, JSON.stringify(done));
  assert.equal(s.city.expo, null);
  assert.equal(s.city.expos, 1);
  assert.ok(s.city.lastExpo.table.length === 5);
});

t('duelo maker: 10 minutos, puntaje relativo a la capacidad y aviso al terminar', () => {
  const s = E.newGame(null, 46); skipTutorial(s);
  s.money = 1e9; s.mat.PLA = 1e9;
  for (let i = 0; i < 2; i++) E.buyMachine(s, 'ender3');
  assert.equal(E.duelStartReason(s, { kind: 'tecnico', tech: 'cnc' }), 'No tenés máquinas de esa tecnología');
  assert.ok(E.startDuel(s, { id: 7, kind: 'carrera', rival: 'Lola' }));
  assert.equal(E.startDuel(s, { id: 8, kind: 'carrera' }), false, 'uno por vez');
  const evs = [];
  for (let i = 0; i < (E.DUEL_SECS + 2) * 10; i++) {
    const ctx = { out: [] }; step(s, 0.1, ctx); evs.push(...ctx.out);
    for (const m of s.machines) { if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id, ctx); }
  }
  const done = evs.find((e) => e.type === 'duelDone');
  assert.ok(done && done.id === 7, 'termina');
  assert.ok(done.score > 40 && done.score <= 130, 'jugando bien rinde cerca del 100 %: ' + done.score);
  assert.equal(evs.filter((e) => e.type === 'duelNarr').length, 2, 'BATI narra la mitad y el último minuto');
});

t('lotes: apartar, devolver si falla, comprar y cobrar una sola vez', () => {
  const s = E.newGame(null, 47); skipTutorial(s);
  s.mat.PETG = 6000; s.tokens = 5; s.money = 1e6;
  assert.equal(E.lotReason(s, 'mat', 'PETG', 9000, 100000, false), 'No tenés tanto PETG');
  assert.match(E.lotReason(s, 'mat', 'PETG', 5000, 10, false), /barato/);
  const price = Math.round(E.lotRefPrice(s, 'mat', 'PETG', 5000));
  assert.ok(E.lotEscrow(s, { nonce: 'n1', kind: 'mat', mat: 'PETG', qty: 5000, price }));
  assert.equal(s.mat.PETG, 1000);
  assert.ok(E.lotRefund(s, 'n1'));
  assert.equal(s.mat.PETG, 6000, 'si la base lo rechaza, vuelve');
  assert.ok(E.lotEscrow(s, { nonce: 'n2', kind: 'tokens', qty: 3, nick: 'Nuevito' }), 'donación sin precio');
  assert.equal(s.tokens, 2);
  E.lotPublished(s, 'n2');
  assert.equal(E.lotRefund(s, 'n2'), false, 'ya publicado: no vuelve');
  const lot = { id: 9, kind: 'mat', mat: 'PLA', qty: 2000, price: 30000 };
  const pla = s.mat.PLA, m0 = s.money;
  assert.ok(E.lotBought(s, lot)); assert.equal(E.lotBought(s, lot), false);
  assert.equal(s.mat.PLA, pla + 2000); assert.equal(s.money, m0 - 30000);
  assert.ok(E.lotPaid(s, { id: 10, price: 50000 })); assert.equal(E.lotPaid(s, { id: 10, price: 50000 }), false);
  const back = E.migrate(JSON.parse(E.serialize(s)));
  assert.ok(back.lots.done.b9 && back.lots.done.p10, 'se guarda lo cobrado');
});

t('desafío de mates: cebar con el botón cuenta', () => {
  const s = E.newGame(null, 48); skipTutorial(s);
  s.daily = { key: 'x', list: [{ type: 'mates', target: 3, prog: 0, claimed: false, reward: 1 }] };
  for (let i = 0; i < 3; i++) { const ctx = { out: [] }; s.mate.ready = 0; E.useMate(s, ctx); trackChallenges(s, ctx.out); }
  assert.equal(s.daily.list[0].prog, 3);
});

t('pedidos: si falta material se compra solo con envío urgente (no se traba)', () => {
  const s = E.newGame(null, 49); skipTutorial(s);
  s.orders.spawnT = 999; run(s, 0.2);
  const o = s.orders.offers[0];
  assert.ok(E.acceptOrder(s, o.id));
  s.mat.PLA = 0; s.money = 1e7;
  const before = s.money;
  for (let i = 0; i < 20000 && s.orders.active.length; i++) {
    step(s, 0.1, { out: [] });
    for (const m of s.machines) { if (m.event) E.resolveEvent(s, m.id, 0); if (m.state === 'done') E.retrieve(s, m.id); }
  }
  assert.equal(s.orders.active.length, 0, 'el pedido se terminó');
  assert.ok(s.stats.spools > 0 && s.money !== before, 'compró material');
  const s2 = E.newGame(null, 50); skipTutorial(s2); s2.mat.PLA = 0; s2.money = 1e7;
  run(s2, 5);
  assert.equal(s2.stats.spools, 0, 'sin pedido no compra solo');
});

console.log(`\n${n} pruebas OK`);
