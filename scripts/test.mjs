// Pruebas rápidas del motor: node scripts/test.mjs
import assert from 'node:assert/strict';
import * as E from '../src/game/engine.js';
import { step, skipTutorial, MISSIONS } from '../src/game/progress.js';
import { PERKS } from '../src/game/data.js';
import { money, dur, num } from '../src/game/format.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ✔', name); };
const run = (s, secs, idle = false) => { for (let i = 0; i < secs * 10; i++) step(s, 0.1, { out: [], idle }); };

t('partida nueva: 1 Kit esperando «Imprimir», 1 kg de PLA, tutorial activo', () => {
  const s = E.newGame(null, 1);
  assert.equal(s.machines.length, 1);
  assert.equal(s.machines[0].waitStart, true);
  assert.equal(s.fil.PLA, 1000);
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
  assert.ok(s.money >= 5);
  assert.equal(s.machines[0].state, 'printing');
  assert.equal(s.fil.PLA, 1000 - 16);
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
  s.fil.PLA = 0; s.money = 1000;
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
  s.fil.PLA = 80; // 10 llaveros
  const r = E.applyOffline(s, 3600);
  assert.ok(r.earned > 0 && r.earned <= 10 * 5 * 0.5 + 1e-6, 'gana ' + r.earned);
  assert.deepEqual(r.stopped, ['PLA']);
  const s2 = E.newGame(null, 8); skipTutorial(s2); s2.fil.PLA = 1e9;
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
  s.fil.PLA = 1e9;
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
  s.runEarned = 4e6; s.space = 3; s.achievements.primera = 1;
  assert.ok(E.canMove(s));
  const n2 = E.doMove(s, 'xl');
  assert.equal(n2.prestige.total, 4);
  assert.equal(n2.prestige.vitrina[0].p, 'xl');
  assert.equal(n2.achievements.primera, 1);
  assert.equal(n2.space, 0);
  assert.equal(n2.money, 0);
  assert.equal(n2.tutorial.active, false);
  assert.ok(E.buyPerk(n2, 'mesa', PERKS));
  assert.ok(E.oficioMult(n2) > 1.1);
});

t('formato argentino', () => {
  assert.equal(money(12500), '$12.500');
  assert.equal(money(1.5e6), '$1,5 M');
  assert.equal(money(3.2e9), '$3,2 mil M');
  assert.equal(dur(4800), '1 h 20 min');
  assert.equal(num(4.5), '4,5');
});

console.log(`\n${n} pruebas OK`);
