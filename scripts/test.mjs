// Pruebas rápidas del motor: node scripts/test.mjs
import assert from 'node:assert/strict';
import * as E from '../src/game/engine.js';
import { step, skipTutorial, MISSIONS, ensureChallenges, claimChallenge } from '../src/game/progress.js';
import { PERKS, TOKEN_SHOP, PRODUCTS } from '../src/game/data.js';
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

console.log(`\n${n} pruebas OK`);
