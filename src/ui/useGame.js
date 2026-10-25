// Hook principal: carga/guarda la partida, corre el bucle y traduce los avisos
// del motor a cosas visibles (números flotantes, toasts, mensajes de BATI, sonidos).
import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import * as E from '../game/engine.js';
import { step, startMissionHooks, currentMission, skipTutorial, claimChallenge } from '../game/progress.js';
import { PRODUCTS, MACHINES, UPGRADES, MATERIALS, MACHINE_EVENTS, GLOBAL_EVENTS, TOKEN_SHOP, MASTERY_CHALLENGES, fullName } from '../game/data.js';
import { SAVE_KEY, BACKUP_KEY } from '../config.js';
import { money, num, setCurrency, fmtText } from '../game/format.js';
import { sfx } from './sfx.js';
import { demoState } from '../game/demo.js';

const IDLE_MS = 180000;
// SOLO DESARROLLO: ?speed=10 acelera el tiempo para probar.
const SPEED = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('speed')) || 1 : 1;
let uid = 1;

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      // Antes de convertir una partida vieja, se guarda una copia intacta (por las dudas).
      if ((obj.v || 1) < E.SAVE_VERSION && !localStorage.getItem(SAVE_KEY + '.v' + (obj.v || 1))) localStorage.setItem(SAVE_KEY + '.v' + (obj.v || 1), raw);
      const s = E.migrate(obj);
      if (s) return s;
    }
    const bak = localStorage.getItem(BACKUP_KEY);
    if (bak) { const s = E.migrate(JSON.parse(bak)); if (s) return s; }
  } catch { /* partida dañada o sin acceso: arranca una nueva */ }
  return null;
}
let saveBlocked = false; // pestaña pausada porque el juego está abierto en otra
function save(s, backup = false) {
  if (saveBlocked) return false;
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo')) return false;
  try {
    const json = E.serialize(s);
    if (backup) { const prev = localStorage.getItem(SAVE_KEY); if (prev) localStorage.setItem(BACKUP_KEY, prev); }
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch { return false; }
}

// Qué se desbloquea al llegar a un nivel de reputación (para que BATI lo cuente).
function unlocksAt(level) {
  const list = [];
  for (const p of Object.values(PRODUCTS)) if ((p.rep || 1) === level && !p.space && !MATERIALS[p.mat].upgrade && p.tech === 'fdm') list.push(p.name);
  for (const m of Object.values(MACHINES)) if (m.rep === level) list.push(fullName(m));
  for (const u of Object.values(UPGRADES)) if ((u.rep || 1) === level) list.push(u.name);
  return list;
}

export function useGame() {
  const ref = useRef(null);
  if (!ref.current && import.meta.env.DEV) {
    const demo = new URLSearchParams(window.location.search).get('demo');
    if (demo) ref.current = demoState(demo);
  }
  if (!ref.current) {
    const loaded = load();
    ref.current = loaded || E.newGame();
    if (!loaded) startMissionHooks(ref.current);
  }
  const [, force] = useReducer((x) => x + 1, 0);
  const [floats, setFloats] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [bati, setBati] = useState([]);
  const [offline, setOffline] = useState(null);
  const lastInput = useRef(Date.now());
  const lastTick = useRef(Date.now());
  // Otra pestaña con el juego abierto: esta se pausa para que no se pisen la partida.
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  const s = ref.current;

  const toast = useCallback((text, kind = 'ok', ms = 3200) => {
    const id = uid++;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);
  const say = useCallback((text, opts = {}) => {
    setBati((q) => (q.some((x) => x.text === text) ? q : [...q.slice(-4), { id: uid++, text, mood: opts.mood || 'normal', ctas: opts.ctas || null }]));
  }, []);
  const sayOnce = useCallback((key, text, opts) => {
    const st = ref.current;
    if (st.seen[key]) return;
    st.seen[key] = 1;
    say(text, opts);
  }, [say]);
  const floatAt = useCallback((mid, text, kind = 'money') => {
    const id = uid++;
    setFloats((f) => [...f.slice(-24), { id, mid, text, kind }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
  }, []);

  const handle = useCallback((out) => {
    const st = ref.current;
    for (const e of out) {
      switch (e.type) {
        case 'sale':
          floatAt(e.mid, '+' + money(e.amount));
          if (e.by === 'hand') sfx.sale(); else sfx.saleAuto();
          break;
        case 'orderPiece': floatAt(e.mid, '📋 +1', 'order'); if (!E.has(st, 'expulsion')) sfx.click(); break;
        case 'done': if (!E.has(st, 'expulsion') && !E.has(st, 'sobrino')) sfx.done(); break;
        case 'mevent': {
          const ev = MACHINE_EVENTS[e.id];
          if (e.id === 'spaghetti') sfx.boing(); else sfx.alert();
          if (!st.tutorial.active) sayOnce('ev_' + e.id, `${ev.icon} ${ev.name}: ${ev.text} Tocá la impresora para resolverlo.`, { mood: 'worried' });
          break;
        }
        case 'resolved': sfx.click(); break;
        case 'orderDone':
          sfx.order();
          toast(`✔ Pedido entregado: ${e.reward ? '+' + money(e.reward) + ' · ' : ''}+${e.rep} ⭐`);
          if (e.tokens) toast(`🎟️ +${e.tokens} fichas por el contrato`, 'info');
          if (e.tpl === 'exposicion') say('Te pagaron con exposición… y la verdad, la reputación sirve. Pero las bobinas no se pagan con likes 😅', { mood: 'happy' });
          break;
        case 'orderFail':
          sfx.fail();
          toast(`⏰ Venció «${e.title}». Cobraste lo entregado (${money(e.pay)}).`, 'err', 5000);
          sayOnce('orderfail', 'Un pedido venció. No pasa nada: cobrás lo que entregaste y perdés un poquito de reputación, nunca un nivel. Asignale más impresoras la próxima.', { mood: 'worried' });
          break;
        case 'offer':
          if (!st.tutorial.active) sayOnce('offer1', 'Los pedidos aparecen en el tablero. Al aceptar uno, le asigno las impresoras que hacen falta (podés sumar o sacar con − y +).');
          break;
        case 'urgent': sfx.urgent(); toast('⚡ ¡Pedido urgente en el tablero! Paga x5.', 'warn'); break;
        case 'repUp': {
          sfx.achievement();
          const un = unlocksAt(e.level);
          say(`¡Subiste a Reputación ${e.level}! Tus piezas valen un 3 % más.${un.length ? ' Nuevo: ' + un.join(', ') + '.' : ''}`, { mood: 'happy' });
          break;
        }
        case 'trend': toast(`📈 Tendencia: «${PRODUCTS[e.pid].name}» paga el doble por 8 min`, 'info', 4500); break;
        case 'global': {
          const g = GLOBAL_EVENTS[e.id];
          if (e.id === 'corte') sfx.power(); else sfx.alert();
          sayOnce('g_' + e.id, `${g.icon} ${g.name}. ${g.text}`, { mood: g.pos ? 'happy' : 'worried' });
          break;
        }
        case 'mission':
          if (!st.tutorial.active && e.id !== 'nivelar') toast(`🎯 Misión cumplida: ${fmtText(e.text)}${e.reward?.money ? ' · +' + money(e.reward.money) : e.reward?.spool ? ' · +1 bobina de ' + e.reward.spool : ''}`);
          if (!st.tutorial.active && e.id !== 'nivelar') {
            const next = currentMission(st);
            if (e.cta === 'instagram') say('¡Ya tenés un cuarto maker! Si te gusta el juego, seguinos en Instagram: ahí mostramos impresiones reales del taller 3DBAT.', { mood: 'happy', ctas: ['instagram'] });
            else if (e.cta === 'batbox') say('¡Garage propio! En la vida real también podés crecer: en BATBOX tenés el Cotizador gratis, tutoriales y la WikiBAT.', { mood: 'happy', ctas: ['batbox'] });
            else if (e.cta === 'comunidad') say('¡Local con vidriera! Ya sos un referente. Sumate a la Comunidad Makers 3DBAT y contanos hasta dónde llegaste.', { mood: 'happy', ctas: ['comunidad', 'instagram'] });
            else if (next && next.id !== 'libre') say('Próxima misión: ' + fmtText(next.text) + '.');
          }
          break;
        case 'tutorialDone':
          sfx.achievement();
          say('¡Listo, ya sos maker! Te dejo misiones para seguir creciendo. Si me necesitás, tocame. Y ojo: cuando no estás, yo cuido el taller.', { mood: 'happy' });
          say('Tip: si entrás con Google, tu taller queda guardado en la nube y podés jugar el ranking, los retos de la comunidad y armar una granja con otros makers.', { mood: 'wink', ctas: ['online'] });
          break;
        case 'achievement': sfx.achievement(); toast(`🏆 Logro: ${e.name}`, 'info', 4000); break;
        case 'mastery':
          if (e.level >= 2) toast(`⭐ Experiencia en «${PRODUCTS[e.pid].name}»: nivel ${e.level} (+12 % de precio)`, 'info', 3500);
          sayOnce('mastery', 'Cada producto tiene su experiencia: cuanto más lo fabricás, mejor te sale y más lo cobrás. Y eso no se pierde nunca, ni con la Mudanza.', { mood: 'happy' });
          break;
        case 'contract':
          sfx.alert(); toast('🏢 ¡Llegó un contrato de empresa! Paga ×4 y da fichas.', 'warn', 4500);
          sayOnce('contract1', 'Los contratos de empresa son pedidos grandes: llevan más tiempo pero pagan ×4, suman mucha reputación y dan fichas para la tienda de fichas.', { mood: 'happy' });
          break;
        case 'combo':
          sfx.alert(); toast('🔀 ¡Pedido combinado! Necesita trabajo de varios pisos. Paga ×3,5 y da fichas.', 'warn', 4500);
          sayOnce('combo1', 'Los pedidos combinados mezclan tecnologías: por ejemplo, un cartel láser con soportes FDM y una pieza CNC. Cada piso hace su parte y cobrás todo junto.', { mood: 'happy' });
          break;
        case 'challengeDone': sfx.achievement(); say(`¡Superaste el desafío «${e.name}»! Premio para siempre: ${e.reward} (+3 fichas).`, { mood: 'happy' }); break;
        case 'newChallenges':
          if (!st.seen.daily1) { st.seen.daily1 = 1; say('Hay desafíos nuevos todos los días (y uno semanal). Dan fichas para canjear por turbos, saltos de tiempo y más. Están en el botón 🎯 Desafíos.'); }
          break;
        case 'nofil':
          sfx.nofil();
          sayOnce('nofil_' + e.mat, `Se terminó: ${MATERIALS[e.mat].name}. Comprá más en Tienda → Materiales (o contratá a Filacolor, el proveedor oficial, y olvidate). ¿Y en tu taller real? También está Filacolor.`, { mood: 'worried', ctas: ['filacolor'] });
          break;
        case 'worn': {
          const wm = st.machines.find((x) => x.id === e.mid);
          if (!wm) break;
          const nm = fullName(MACHINES[wm.model]);
          toast(`🔧 ${nm} gastada (${E.wearPct(wm)} %): falla más. Reparala en Tienda → Mejoras.`, 'warn', 5000);
          sayOnce('worn1', `🔧 Tu ${nm} ya está gastada de tanto imprimir: ahora falla más seguido. En Tienda → Mejoras está el Taller de reparación: la dejás al 100 %.`, { mood: 'worried', ctas: ['reparar'] });
          break;
        }
        case 'mate': sfx.mate(); break;
        case 'gestor': break;
        default: break;
      }
    }
  }, [floatAt, say, sayOnce, toast]);

  // Aplica tiempo ausente (pestaña cerrada o en segundo plano).
  const catchUp = useCallback((ms) => {
    const st = ref.current;
    if (ms < 60000 || st.tutorial.active) return;
    const r = E.applyOffline(st, ms / 1000);
    handle(r.out);
    setOffline(r);
    save(st);
  }, [handle]);

  // Arranque: tiempo offline desde la última vez.
  useEffect(() => {
    const st = ref.current;
    sfx.configure(st.settings.sound, st.settings.volume, st.settings.vol);
    setCurrency(st.settings.currency);
    const gap = Date.now() - (st.lastSeen || Date.now());
    if (gap > 60000) catchUp(gap);
    st.lastSeen = Date.now();
    lastTick.current = Date.now();
    const onInput = () => { lastInput.current = Date.now(); sfx.unlock(); };
    window.addEventListener('pointerdown', onInput, { passive: true });
    window.addEventListener('keydown', onInput);
    const onHide = () => { if (document.visibilityState === 'hidden') save(ref.current); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    const loop = setInterval(() => {
      const now = Date.now();
      if (lockedRef.current) { lastTick.current = now; return; }
      let ms = now - lastTick.current;
      lastTick.current = now;
      if (ms <= 60000) ms *= SPEED;
      const st2 = ref.current;
      if (ms > 60000) { catchUp(ms); force(); return; }
      const ctx = { out: [], idle: now - lastInput.current > IDLE_MS, now };
      let left = ms / 1000;
      while (left > 0) { const d = Math.min(0.25, left); step(st2, d, ctx); left -= d; }
      if (import.meta.env.DEV) window.__mt = st2;
      st2.lastSeen = now;
      if (ctx.out.length) handle(ctx.out);
      force();
    }, 100);
    let n = 0;
    const saver = setInterval(() => { n++; save(ref.current, n % 30 === 0); }, 10000);
    return () => {
      clearInterval(loop); clearInterval(saver);
      window.removeEventListener('pointerdown', onInput);
      window.removeEventListener('keydown', onInput);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      save(ref.current);
    };
  }, [catchUp, handle]);

  // Una sola pestaña juega a la vez (la más vieja sigue; la nueva pregunta).
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined' || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo'))) return undefined;
    const ch = new BroadcastChannel('mt3dbat-tabs');
    const me = { id: Math.random().toString(36).slice(2), at: Date.now() };
    const lock = (v) => { lockedRef.current = v; saveBlocked = v; setLocked(v); };
    ch.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.id === me.id) return;
      if (m.t === 'hello' && !lockedRef.current) ch.postMessage({ t: 'here', id: me.id, at: me.at, to: m.id });
      if (m.t === 'here' && m.to === me.id && m.at < me.at) lock(true);
      if (m.t === 'takeover') { if (!lockedRef.current) save(ref.current); lock(true); }
    };
    ch.postMessage({ t: 'hello', id: me.id, at: me.at });
    takeOverRef.current = () => {
      ch.postMessage({ t: 'takeover', id: me.id });
      // La otra pestaña pudo haber avanzado: se recarga la partida guardada.
      setTimeout(() => {
        const fresh = load();
        if (fresh) { ref.current = fresh; startMissionHooks(fresh); }
        lock(false);
        lastTick.current = Date.now();
        const gap = Date.now() - (ref.current.lastSeen || Date.now());
        if (gap > 60000) catchUp(gap);
        force();
      }, 250);
    };
    return () => { ch.close(); };
  }, [catchUp]);
  const takeOverRef = useRef(null);

  // Ejecuta una acción del jugador sobre el estado.
  const act = useCallback((fn) => {
    const ctx = { out: [] };
    const r = fn(ref.current, ctx);
    if (ctx.out.length) handle(ctx.out);
    lastInput.current = Date.now();
    force();
    return r;
  }, [handle]);

  const replace = useCallback((next) => {
    ref.current = next;
    startMissionHooks(next);
    save(next, true);
    force();
  }, []);

  const actions = {
    start: (mid) => act((st, ctx) => { sfx.click(); E.startMachine(st, mid, ctx); }),
    retrieve: (mid) => act((st, ctx) => E.retrieve(st, mid, ctx, 'hand')),
    resolve: (mid, opt) => act((st, ctx) => E.resolveEvent(st, mid, opt, ctx)),
    buyMachine: (model) => act((st) => {
      const m = E.buyMachine(st, model);
      if (m) {
        sfx.buy(); toast(`Nueva: ${fullName(MACHINES[model])}`);
        if (E.hasFloors(st)) st.settings.floor = E.techOfModel(model); // te lleva al piso donde quedó
      }
      return m;
    }),
    moveMachine: (mid, dir) => act((st) => { E.moveMachine(st, mid, dir); }),
    tradeIn: (model, mids, tokens = 0) => act((st) => {
      const r = E.tradeIn(st, model, mids, tokens);
      if (r) {
        sfx.buy(); save(st);
        const gave = [r.count ? `${r.count} máquina${r.count > 1 ? 's' : ''}` : '', r.tokens ? `${r.tokens} ficha${r.tokens > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ');
        toast(`🔁 Canje hecho: entregaste ${gave} y te llevaste la ${fullName(MACHINES[model])} (pagaste ${money(r.pay)})`, 'ok', 6000);
      }
      return r;
    }),
    sellMachine: (mid) => act((st) => { const ok = E.sellMachine(st, mid); if (ok) sfx.click(); return ok; }),
    repair: (mid) => act((st) => { const ok = E.repairMachine(st, mid); if (ok) { sfx.buy(); toast('🔧 Reparada: quedó al 100 %'); } return ok; }),
    repairAll: () => act((st) => { const n = E.repairAll(st); if (n) { sfx.buy(); toast(`🔧 ${n === 1 ? 'Reparada' : n + ' máquinas reparadas'}: todo al 100 %`); } return n; }),
    // Tienda de usados (ver online/useMarket.js). Cada cambio se guarda en el acto.
    marketList: (mid, price, nonce) => act((st) => { const e = E.listUsed(st, mid, price, nonce); if (e) save(st); return e; }),
    marketConfirm: (nonce) => act((st) => { E.listConfirmed(st, nonce); save(st); }),
    marketReject: (nonce, why) => act((st) => {
      const m = E.listRejected(st, nonce);
      if (m) { save(st); toast(`No se pudo publicar${why ? ': ' + why : ''}. La máquina volvió a tu taller.`, 'err', 7000); }
      return m;
    }),
    // Canje entre makers: aparta lo ofrecido / lo devuelve si no se pudo mandar.
    marketOffer: (it, mids, cash, tokens, nonce) => act((st) => { const e = E.offerEscrow(st, it, mids, cash, tokens, nonce); if (e) save(st); return e; }),
    marketOfferReject: (nonce, why) => act((st) => {
      const e = E.offerRejectedLocal(st, nonce);
      if (e) { save(st); toast(`No se pudo mandar la oferta${why ? ': ' + why : ''}. Te volvió todo.`, 'err', 7000); }
      return e;
    }),
    marketApply: (it) => act((st) => {
      const M = MACHINES[it.model];
      const nm = M ? fullName(M) : 'máquina';
      const what = (x) => [(x.items || []).length ? `${x.items.length} máquina${x.items.length > 1 ? 's' : ''}` : '', Number(x.money) > 0 ? money(x.money) : '', x.tokens ? `${x.tokens} ficha${x.tokens > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ');
      if (it.kind === 'traded') {
        const r = E.tradeGot(st, it);
        if (!r) return 'wait';
        if (r.done) return 'done';
        save(st); sfx.sale();
        const who = it.who && it.who !== 'Maker anónimo' ? it.who : 'Otro maker';
        toast(`🔁 ¡Canje hecho! Por tu ${nm} recibiste ${what(it)}.`, 'ok', 7000);
        say(`¡Canjeaste tu ${nm} con ${who}! Recibiste ${what(it)}. Ya está todo en tu taller.`, { mood: 'happy' });
        return 'applied';
      }
      if (it.kind === 'offer_back') {
        const r = E.offerBack(st, it);
        if (!r) return 'wait';
        if (r.done) return 'done';
        save(st);
        const why = it.status === 'rejected' ? `${it.who || 'El dueño'} no aceptó tu canje por la ${nm}` : it.status === 'cancelled' ? 'Retiraste tu oferta' : `Tu oferta por la ${nm} venció`;
        toast(`↩️ ${why}: te volvió todo (${what(it)}).`, 'info', 7000);
        return 'applied';
      }
      if (it.kind === 'bought' && it.prepaid) {
        if (E.marketDone(st, 'b' + it.id)) return 'done';
        if (!E.receiveUsed(st, it)) return 'wait';
        save(st); sfx.buy();
        toast(`🔁 ¡${it.who || 'El dueño'} aceptó tu canje! La ${nm} ya está en tu taller.`, 'ok', 7000);
        say(`¡Aceptaron tu canje! La ${nm} ya es tuya.`, { mood: 'happy' });
        return 'applied';
      }
      if (it.kind === 'bought') {
        if (E.marketDone(st, 'b' + it.id)) return 'done';
        if (!E.receiveUsed(st, it)) return 'wait';
        save(st); sfx.buy();
        toast(`🛒 Compraste una ${nm} usada a ${money(it.price)}. ¡Ya está en tu taller!`, 'ok', 5000);
        return 'applied';
      }
      if (it.kind === 'sold') {
        if (!E.settleSale(st, it)) return 'done';
        save(st); sfx.sale();
        const who = it.who && it.who !== 'Maker anónimo' ? it.who : 'Otro maker';
        toast(`💸 ¡Vendiste tu ${nm} usada! +${money(it.price)}`, 'ok', 6000);
        say(`¡Vendiste tu ${nm} en Usados! ${who} te pagó ${money(it.price)} y ya está en tu caja.`, { mood: 'happy' });
        return 'applied';
      }
      const r = E.takeBack(st, it);
      if (!r) return 'wait';
      if (r.done) return 'done';
      save(st);
      if (r.cash) toast(`📦 Tu ${nm} no se vendió y ya no la podés usar en esta sede: la vendí al por mayor por ${money(r.cash)}.`, 'info', 7000);
      else {
        const why = it.status === 'expired' ? ' (pasaron 3 días sin venderse)' : it.status === 'removed' ? ` (el equipo sacó la publicación${it.note ? ': ' + it.note : ''})` : '';
        toast(`📦 Tu ${nm} volvió al taller${why}.`, 'info', 6000);
      }
      return 'applied';
    }),
    buyUpgrade: (id) => act((st) => { const ok = E.buyUpgrade(st, id); if (ok) { sfx.buy(); toast(`Mejora: ${UPGRADES[id].name}`); } return ok; }),
    buySpace: () => act((st) => { const ok = E.buySpace(st); if (ok) { sfx.buy(); } return ok; }),
    buyMat: (mat, n) => act((st) => { const ok = E.buyMat(st, mat, n); if (ok) sfx.click(); return ok; }),
    claim: (which, i) => act((st) => { const r = claimChallenge(st, which, i); if (r) { sfx.order(); toast(`🎟️ +${r} ficha${r > 1 ? 's' : ''}`); } return r; }),
    buyToken: (id) => act((st) => {
      const r = E.buyTokenItem(st, id, TOKEN_SHOP);
      if (!r) { toast('No se pudo usar ahora.', 'err'); return false; }
      sfx.buy();
      toast(id === 'salto' ? `⏩ Salto temporal: +${money(r.earned)}` : `🎟️ ${TOKEN_SHOP[id].name}: ¡listo!`);
      return true;
    }),
    startChallenge: (id) => {
      const next = E.startChallenge(ref.current, id, null);
      if (next) { sfx.achievement(); replace(next); say(`Arrancó el desafío «${MASTERY_CHALLENGES[id].name}». Regla: ${MASTERY_CHALLENGES[id].rule} Meta: ${MASTERY_CHALLENGES[id].goalText}`, { mood: 'wink' }); }
      return !!next;
    },
    abandonChallenge: () => act((st) => { E.abandonChallenge(st); toast('Desafío abandonado: seguís jugando sin las reglas.', 'info'); }),
    setProduct: (mid, pid) => act((st) => E.setProduct(st, mid, pid)),
    mate: () => act((st, ctx) => E.useMate(st, ctx)),
    accept: (oid) => act((st) => { const ok = E.acceptOrder(st, oid); if (ok) sfx.accept(); return ok; }),
    decline: (oid) => act((st) => E.declineOrder(st, oid)),
    assign: (oid, d) => act((st) => E.assignMore(st, oid, d)),
    resolveGlobal: (opt) => act((st, ctx) => E.resolveGlobal(st, opt, ctx)),
    skipTutorial: () => act((st) => { skipTutorial(st); say('¡Dale! Te dejo las misiones arriba a la izquierda. Si me necesitás, tocame.', { mood: 'happy' }); }),
    setName: (name) => act((st) => { st.name = name.slice(0, 28); }),
    setting: (k, v) => act((st) => { st.settings[k] = v; sfx.configure(st.settings.sound, st.settings.volume, st.settings.vol); if (k === 'currency') setCurrency(v); }),
    setVol: (k, v) => act((st) => { st.settings.vol = { ...(st.settings.vol || {}), [k]: v }; sfx.configure(st.settings.sound, st.settings.volume, st.settings.vol); }),
    buyPerk: (id, PERKS) => act((st) => { const ok = E.buyPerk(st, id, PERKS); if (ok) sfx.buy(); return ok; }),
    move: (pid) => { const next = E.doMove(ref.current, pid); if (next) { sfx.achievement(); replace(next); say('¡Nueva sede! Arrancás de nuevo, pero con todo el oficio encima: tus piezas valen más para siempre.', { mood: 'happy' }); } return !!next; },
    reset: () => { const next = E.newGame(); try { localStorage.removeItem(BACKUP_KEY); } catch { /* sin acceso */ } replace(next); setBati([]); },
    exportCode: () => { const json = E.serialize(ref.current); return btoa(unescape(encodeURIComponent(json))); },
    importCode: (code) => {
      try {
        const obj = E.migrate(JSON.parse(decodeURIComponent(escape(atob(code.trim())))));
        if (!obj) return false;
        obj.lastSeen = Date.now();
        replace(obj);
        return true;
      } catch { return false; }
    },
    // Usa una partida que viene de otro lado (la nube): se convierte, se aplica el tiempo
    // ausente y se guarda. La partida anterior ya la respaldó quien llama.
    adoptSave: (obj) => {
      const next = E.migrate(obj);
      if (!next) return false;
      const gap = Date.now() - (next.lastSeen || Date.now());
      replace(next);
      lastTick.current = Date.now();
      if (gap > 60000) catchUp(gap);
      return true;
    },
    setCosmetic: (k, v) => act((st) => {
      st.cosmetics = st.cosmetics || { unlocked: [], decor: [], skin: null, effect: null };
      if (k === 'decor') {
        const set = new Set(st.cosmetics.decor || []);
        if (set.has(v)) set.delete(v); else set.add(v);
        st.cosmetics.decor = [...set];
      } else st.cosmetics[k] = st.cosmetics[k] === v ? null : v;
    }),
    setSign: (sign) => act((st) => {
      st.cosmetics = st.cosmetics || { unlocked: [], decor: [], skin: null, effect: null };
      st.cosmetics.sign = sign;
    }),
    takeOver: () => takeOverRef.current?.(),
    dismissBati: (id) => setBati((q) => q.filter((x) => x.id !== id)),
    say,
    toast,
    closeOffline: () => setOffline(null),
    seen: (key) => { const st = ref.current; if (st.seen[key]) return true; st.seen[key] = 1; return false; },
  };

  const getState = useCallback(() => ref.current, []);
  return { s, actions, floats, toasts, bati, offline, locked, getState };
}

export { num };
