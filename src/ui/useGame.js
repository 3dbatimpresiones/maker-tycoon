// Hook principal: carga/guarda la partida, corre el bucle y traduce los avisos
// del motor a cosas visibles (números flotantes, toasts, mensajes de BATI, sonidos).
import { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import * as E from '../game/engine.js';
import * as B from '../game/bati.js';
import { rpc } from '../online/api.js';
import { step, startMissionHooks, currentMission, skipTutorial, claimChallenge, trackChallenges } from '../game/progress.js';
import { PRODUCTS, MACHINES, UPGRADES, MATERIALS, MACHINE_EVENTS, GLOBAL_EVENTS, TOKEN_SHOP, MASTERY_CHALLENGES, fullName, MODS, SPACES } from '../game/data.js';
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
  const social = (kind, data) => { try { window.dispatchEvent(new CustomEvent('mt-social', { detail: { kind, data } })); } catch { /* nada */ } };
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
    if (ref.current?.settings?.lite) return; // modo liviano: sin números flotando
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
          if (e.contract && e.tpl === 'contrato') social('contract', {});
          if (e.tpl === 'exposicion') say('Te pagaron con exposición… y la verdad, la reputación sirve. Pero las bobinas no se pagan con likes 😅', { mood: 'happy' });
          if (e.review) {
            const r = e.review;
            toast(`${'⭐'.repeat(r.stars)} ${r.client}: ${r.stars === 5 ? '«¡Impecable! Vuelvo seguro.»' : r.stars === 4 ? '«Muy bien, gracias.»' : '«Cumpliste.»'}`, 'info', 4000);
            if (r.tierUp) toast(`🤝 ${r.client} ahora es cliente ${r.tierUp}: vuelve más seguido y paga mejor.`, 'info', 5000);
            if (r.pref) sayOnce('pref1', `A ${r.client} le encantó el presupuesto que elegiste: cada cliente tiene su forma preferida (económico, rápido o premium). Si la respetás, la confianza sube más rápido.`, { mood: 'happy' });
          }
          break;
        case 'orderFail':
          sfx.fail();
          toast(`⏰ Venció «${e.title}». Cobraste lo entregado (${money(e.pay)}).${e.failRep > 1 ? ` −${e.failRep} de reputación por el presupuesto.` : ''}`, 'err', 5000);
          if (e.gone) toast(`😠 ${e.client} te dejó una mala reseña y se fue con otro taller por un rato.`, 'err', 6000);
          if (e.project) toast(`🏗️ Se cayó el proyecto «${e.project}»: venció una etapa.`, 'err', 6000);
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
        case 'project':
          sfx.alert(); toast('🏗️ ¡Llegó un proyecto grande de varias etapas!', 'warn', 4500);
          sayOnce('project1', 'Los proyectos grandes tienen varias etapas, cada una con una tecnología (FDM, láser, CNC, resina). Cada etapa se cobra al entregarla y al terminar todas te llevás un 50 % extra y 5 fichas. Si una etapa vence, el proyecto se cae.', { mood: 'happy' });
          break;
        case 'projectLost': sfx.fail(); toast(`🏗️ Se cayó el proyecto «${e.name}»: no aceptaste la etapa siguiente a tiempo.`, 'err', 6000); break;
        case 'projectStage': sfx.order(); toast(`🏗️ ${e.name}: ¡ya está la etapa ${e.stage}/${e.n} en el tablero!`, 'info', 4500); break;
        case 'projectDone':
          social('project', { name: e.name });
          sfx.achievement(); toast(`${e.icon} ¡Proyecto terminado: ${e.name}! Bonus +${money(e.bonus)} · +5 🎟️`, 'info', 6000);
          say(`¡Terminaste el proyecto «${e.name}» entero! Te llevás un bonus de ${money(e.bonus)} y 5 fichas. Eso es tener una empresa de verdad.`, { mood: 'happy' });
          break;
        case 'demand':
          if (!st.seen.demand1) { st.seen.demand1 = 1; say('Cambió la demanda en la ciudad: algunas zonas compran más (🔥 ×1,4) y otra está floja. Mirá el mapa en el botón Ciudad.', { ctas: ['ciudad'] }); }
          else toast('🗺️ Cambió la demanda de la ciudad: mirá qué zonas están 🔥', 'info', 3500);
          break;
        case 'stolen': toast(`${e.icon} ${e.rival} se quedó con «${e.title}» porque lo dejaste esperando.`, 'warn', 5000); break;
        case 'rivalBeaten':
          social('rival', { name: e.name });
          sfx.achievement(); toast(`🏁 ¡Superaste en fama a ${e.icon} ${e.name}! +3 🎟️`, 'info', 5000);
          sayOnce('rival1', 'En la ciudad hay talleres rivales. Cada vez que superás a uno en fama por primera vez te llevás fichas. La fama sube con pedidos, proyectos y Expos.', { mood: 'happy', ctas: ['ciudad'] });
          break;
        case 'expoOpen':
          sfx.urgent(); toast('🎪 ¡Se anunció una Expo Maker! Tenés 5 minutos para inscribirte.', 'warn', 6000);
          say('¡Hay Expo Maker! Elegí hasta 3 productos, armá tu stand y en 15 minutos fabricá todo lo que puedas. Competís con los talleres rivales por plata, fichas y reputación.', { mood: 'happy', ctas: ['expo'] });
          break;
        case 'expoMissed': toast('🎪 Se cerró la Expo Maker sin tu taller. ¡La próxima!', 'info', 4000); break;
        case 'expoDone':
          if (e.place === 1 && B.giveAcc(st, 'mascara')) toast('😷 BATI ganó un accesorio: Máscara de resina', 'info', 5000);
          if (e.place <= 3) social('expo', { place: e.place });
          sfx.achievement();
          toast(e.place === 1 ? `🏆 ¡Ganaste la Expo Maker! +${money(e.cash)} · +${e.tokens} 🎟️` : e.place <= 3 ? `🎪 Expo Maker: puesto ${e.place}. +${money(e.cash)} · +${e.tokens} 🎟️` : `🎪 Expo Maker: puesto ${e.place}. ¡La próxima sale mejor!`, 'info', 7000);
          say(e.place === 1 ? '¡GANAMOS LA EXPO! Toda la ciudad habla de tu taller.' : e.place <= 3 ? `¡Podio en la Expo! Puesto ${e.place}. Para ganar: stand mejor, productos caros y variedad.` : 'Esta vez no llegamos al podio. Probá con un stand mejor y poné más máquinas en los productos de la Expo.', { mood: e.place <= 3 ? 'happy' : 'worried', ctas: ['expo'] });
          break;
        case 'expoNarr':
          if (e.k === 'half') say(`🎙️ ¡Señoras y señores, vamos por la mitad de la Expo! Tu taller lleva ${num(e.score)} puntos y ${e.rivalIcon} ${e.rival} viene con unos ${num(e.rivalScore)}. ${e.score >= e.rivalScore ? '¡Vamos adelante!' : 'Hay que apretar: cebá un mate y poné más máquinas en los productos de la Expo.'}`, { mood: e.score >= e.rivalScore ? 'happy' : 'worried', ctas: ['expo'] });
          else say(`🎙️ ¡Quedan 2 minutos de Expo! ${e.score >= e.rivalScore ? `Vamos punteros contra ${e.rival}, ¡que no se corte la luz!` : `${e.rival} va adelante… ¿se viene la remontada?`}`, { mood: 'happy', ctas: ['expo'] });
          break;
        case 'chapterDone':
          sfx.achievement(); toast(`📖 ¡Capítulo terminado: ${e.title}! BATI ahora tiene ${B.BATI_ACCS[e.acc]?.icon || ''} ${B.BATI_ACCS[e.acc]?.name || ''}`, 'info', 6000);
          social('chapter', { name: e.title });
          break;
        case 'duelNarr':
          if (e.k === 'half') say(`🎙️ ¡Mitad del duelo! Vas rindiendo ${e.score} %. ${e.score >= 90 ? 'Ritmo de campeón, seguí así.' : 'Hay que apretar: ¿hay piezas esperando o fallas sin resolver?'}`, { mood: e.score >= 90 ? 'happy' : 'worried' });
          else say(`🎙️ ¡Último minuto del duelo! ${e.score} % y subiendo… ¡que no se corte la luz!`, { mood: 'happy' });
          break;
        case 'duelDone': sfx.achievement(); toast(`⚔️ Terminó el duelo: rendiste ${e.score} %. Mandando el resultado…`, 'info', 4000); break;
        case 'autoSpool':
          if (e.urgent) sayOnce('urgentspool', `Faltaba ${MATERIALS[e.mat]?.name || 'material'} para un pedido y lo compré con envío urgente (+25 %), así no se traba. Para pagar menos, dejá stock en Tienda → Materiales o contratá a Filacolor en Mejoras.`, { mood: 'normal', ctas: ['filacolor'] });
          break;
        case 'orderTurbo': toast(`⚡ Turbo de pedido: +${e.added} piezas listas al toque.`, 'info', 4000); break;
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

  // Duelos: cuando termina, se manda el puntaje (y se reintenta si no había conexión).
  useEffect(() => {
    const t = setInterval(() => {
      const st = ref.current;
      const d = st.duel;
      if (!d || !d.done || d.sent || d.sending) return;
      d.sending = true;
      rpc('bb_mt_duel_submit', { p_id: d.id, p_score: d.score }).then((r) => {
        d.sent = true; d.sending = false;
        if (r?.status === 'done') {
          if (r.won) { toast(`🏆 ¡Ganaste el duelo contra ${r.rival}! ${r.my_score} % a ${r.their_score} %`, 'info', 6000); social('duel', {}); say(`¡GANAMOS el duelo! ${r.my_score} % contra ${r.their_score} %. +30 puntos de Liga.`, { mood: 'happy' }); }
          else if (r.won === false) { toast(`⚔️ Perdiste el duelo contra ${r.rival}: ${r.my_score} % a ${r.their_score} %`, 'warn', 6000); say(`Esta vez ${r.rival} rindió más (${r.their_score} %). Tip: retirá las piezas apenas terminan y resolvé las fallas al toque.`, { mood: 'worried' }); }
          else toast(`⚔️ ¡Empate en el duelo! ${r.my_score} %`, 'info', 5000);
        } else toast('⚔️ Resultado enviado: ahora le toca a tu rival (tiene 24 h).', 'info', 5000);
        force();
      }).catch((e) => { d.sending = false; if (/no es tuyo|Ya jugaste/.test(e?.message || '')) d.sent = true; });
    }, 5000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // BATI encargado de planta: consejos según el estado del taller y el nivel de ayuda elegido.
  useEffect(() => {
    const seen = {};
    let last = Date.now();
    const EVERY = { principiante: 120000, normal: 300000, experto: 180000 };
    const t = setInterval(() => {
      const st = ref.current;
      if (st.tutorial.active || document.visibilityState !== 'visible' || lockedRef.current) return;
      const help = st.settings.batiHelp || 'normal';
      if (Date.now() - last < (EVERY[help] || 300000)) return;
      const tip = B.pickTip(st, help, seen);
      if (!tip) return;
      last = Date.now(); seen[tip.id] = Date.now();
      say(tip.text, { mood: tip.crit ? 'worried' : 'normal', ctas: tip.ctas });
    }, 20000);
    return () => clearInterval(t);
  }, [say]);

  // Arranque: tiempo offline desde la última vez.
  useEffect(() => {
    const st = ref.current;
    sfx.configure(st.settings.sound, st.settings.volume, st.settings.vol);
    setCurrency(st.settings.currency);
    // Si la última vez quedó de fondo, cuenta desde que se fue de la vista (no desde el último guardado).
    const since = st.hiddenSince && st.hiddenSince < (st.lastSeen || Infinity) ? st.hiddenSince : st.lastSeen;
    const gap = Date.now() - (since || Date.now());
    st.hiddenSince = null;
    if (gap > 60000) catchUp(gap);
    st.lastSeen = Date.now();
    lastTick.current = Date.now();
    const onInput = () => { lastInput.current = Date.now(); sfx.unlock(); };
    window.addEventListener('pointerdown', onInput, { passive: true });
    window.addEventListener('keydown', onInput);
    const onHide = () => { if (document.visibilityState === 'hidden') { ref.current.hiddenSince ||= lastTick.current; save(ref.current); } };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    const tick = () => {
      const now = Date.now();
      if (lockedRef.current) { lastTick.current = now; return; }
      // Pestaña de fondo: el taller se frena. Al volver se calcula como si hubieras estado afuera
      // (mismo rendimiento y tope que con el juego cerrado). Un ratito (menos de 1 min) cuenta normal.
      const stH = ref.current;
      if (document.visibilityState === 'hidden') {
        if (!stH.hiddenSince) stH.hiddenSince = lastTick.current;
        return;
      }
      if (stH.hiddenSince) {
        const away = now - stH.hiddenSince;
        stH.hiddenSince = null;
        lastTick.current = now;
        if (away > 60000) { catchUp(away); force(); return; }
        lastTick.current = now - away; // menos de un minuto: se simula normal
      }
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
    };
    let loop = null;
    const updateClock = () => {
      clearInterval(loop); loop = null;
      if (document.visibilityState !== 'hidden') { tick(); loop = setInterval(tick, 250); }
    };
    document.addEventListener('visibilitychange', updateClock);
    updateClock();
    let n = 0;
    const saver = setInterval(() => { if (document.visibilityState === 'hidden') return; n++; save(ref.current, n % 30 === 0); }, 10000);
    return () => {
      clearInterval(loop); clearInterval(saver);
      window.removeEventListener('pointerdown', onInput);
      window.removeEventListener('keydown', onInput);
      document.removeEventListener('visibilitychange', onHide);
      document.removeEventListener('visibilitychange', updateClock);
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
    // Lo que pasa al tocar un botón (cebar mate, retirar una pieza, resolver una falla…) también cuenta para los desafíos.
    if (ctx.out.length) { trackChallenges(ref.current, ctx.out); handle(ctx.out); }
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
    lotEscrow: (p) => act((st) => E.lotEscrow(st, p)),
    lotApply: (kind, arg, msg) => act((st) => {
      if (kind === 'published') E.lotPublished(st, arg);
      else if (kind === 'refund') { if (E.lotRefund(st, arg)) toast(`📦 No se pudo publicar el lote${msg ? `: ${msg}` : ''}. Volvió a tu taller.`, 'warn', 5000); }
      else if (kind === 'bought') { if (E.lotBought(st, arg)) { sfx.buy(); toast(arg.gift ? '🎁 ¡Recibiste un regalo de la comunidad!' : '📦 Lote comprado: ya está en tu taller.', 'info', 4000); } }
      else if (kind === 'paid') { if (E.lotPaid(st, arg)) { sfx.sale?.(); toast(`📦 Vendiste un lote a ${arg.buyer || 'un maker'}: +${money(Number(arg.price))}`, 'info', 5000); } }
      else if (kind === 'back') { if (E.lotBack(st, arg)) toast('📦 Un lote tuyo volvió a tu taller.', 'info', 4000); }
    }),
    startDuel: (d) => act((st) => {
      if (!E.startDuel(st, d)) return false;
      sfx.urgent();
      say(`⚔️ ¡Arranca el duelo ${E.DUEL_KINDS[d.kind].name.toLowerCase()}${d.rival ? ` contra ${d.rival}` : ''}! Tenés 10 minutos: retirá piezas, resolvé fallas al toque y cebá un mate.`, { mood: 'happy' });
      return true;
    }),
    leagueUp: (last) => act((st) => {
      const k = 'liga_' + last.week;
      if (st.seen[k]) return;
      st.seen[k] = 1;
      toast(`🏅 ¡Ascendiste a ${last.name} en la Liga Maker!`, 'info', 6000);
      if (B.giveAcc(st, 'corona')) toast('👑 BATI ganó un accesorio: Corona de liga', 'info', 5000);
      social('league', { name: last.name });
    }),
    startChapter: () => act((st) => { if (B.startChapter(st)) { sfx.accept(); const c = B.currentChapter(st); say(`📖 «${c.ch.title}»: ${c.ch.goal}`, { mood: 'happy' }); } }),
    finishChapter: (pick) => act((st) => { const out = []; if (B.finishChapter(st, pick, out)) handle(out); }),
    setBatiWear: (k) => act((st) => { st.bati = { ...B.batiOf(st), wear: k }; }),
    expoJoin: (picks, stand) => act((st) => { const ok = E.expoJoin(st, picks, stand); if (ok) { sfx.buy(); toast('🎪 ¡Inscripto en la Expo! Tenés 15 minutos para fabricar.', 'info', 5000); } return ok; }),
    installMod: (mid, k) => act((st) => { const ok = E.installMod(st, mid, k); if (ok) { sfx.buy(); toast(`🔧 Mod instalado: ${MODS[k].name}`); } return ok; }),
    removeMod: (mid, k) => act((st) => E.removeMod(st, mid, k)),
    markSeen: (key) => act((st) => { st.seen = st.seen || {}; st.seen[key] = 1; }),
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
    sellStoredMachine: (i) => act((st) => { const ok = E.sellStoredMachine(st, i); if (ok) sfx.click(); return ok; }),
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
    buySpace: () => act((st) => { const ok = E.buySpace(st); if (ok) { sfx.buy(); if (st.space >= 2) social('space', { name: SPACES[st.space].name }); } return ok; }),
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
    orderTurbo: (oid) => act((st, ctx) => { const ok = E.orderTurbo(st, oid, ctx); if (ok) sfx.buy(); return ok; }),
    storeMachine: (mid) => act((st) => { const ok = E.storeMachine(st, mid); if (ok) toast('📦 Máquina guardada en la bodega.', 'info', 3500); return ok; }),
    unstoreMachine: (i) => act((st) => { const ok = E.unstoreMachine(st, i); if (ok) toast('📦 Máquina de vuelta en el taller.', 'info', 3500); return ok; }),
    assignAll: (oid) => act((st) => E.assignAll(st, oid)),
    smartPick: () => act((st) => {
      const list = E.smartPick(st);
      if (list.length) { sfx.accept(); toast(`🧠 Acepté ${list.length === 1 ? 'el pedido que más conviene' : `${list.length} pedidos`}: ${list.join(' · ')}`, 'info', 6000); }
      else toast('🧠 Ningún pedido del tablero llega a tiempo con tus máquinas libres. Liberá máquinas o esperá pedidos nuevos.', 'warn', 6000);
      return list;
    }),
    setSpec: (id) => act((st) => { const ok = E.setSpec(st, id); if (ok) { sfx.buy(); toast(`${E.SPECS[id].icon} Tu empresa ahora es: ${E.SPECS[id].name}`, 'info', 5000); } return ok; }),
    acceptInvest: (i) => act((st) => { const ok = E.acceptInvest(st, i); if (ok) { sfx.accept(); toast('💼 Contrato de inversión aceptado: lo ves en Pedidos. ¡A cumplir a tiempo!', 'info', 5000); } return ok; }),
    claimLegacy: (id) => act((st) => { const ok = E.claimLegacy(st, id); if (ok) { sfx.achievement(); toast('🏛️ ¡Meta de legado cumplida! Sumaste Oficio.', 'info', 5000); } return ok; }),
    releaseAll: () => act((st) => { const n = E.releaseAllOrders(st); if (n) toast(`🔓 Liberé ${n} ${n === 1 ? 'máquina' : 'máquinas'}: ahora asignalas con + al pedido que quieras.`, 'info', 5000); return n; }),
    accept: (oid, quote = 'std') => act((st) => { const ok = E.acceptOrder(st, oid, quote); if (ok) sfx.accept(); return ok; }),
    decline: (oid) => act((st) => E.declineOrder(st, oid)),
    assign: (oid, d) => act((st) => E.assignMore(st, oid, d)),
    resolveGlobal: (opt) => act((st, ctx) => E.resolveGlobal(st, opt, ctx)),
    skipTutorial: () => act((st) => { skipTutorial(st); say('¡Dale! Te dejo las misiones arriba a la izquierda. Si me necesitás, tocame.', { mood: 'happy' }); }),
    setName: (name) => act((st) => { st.name = name.slice(0, 28); }),
    setting: (k, v) => act((st) => { st.settings[k] = v; sfx.configure(st.settings.sound, st.settings.volume, st.settings.vol); if (k === 'currency') setCurrency(v); }),
    setVol: (k, v) => act((st) => { st.settings.vol = { ...(st.settings.vol || {}), [k]: v }; sfx.configure(st.settings.sound, st.settings.volume, st.settings.vol); }),
    buyPerk: (id, PERKS) => act((st) => { const ok = E.buyPerk(st, id, PERKS); if (ok) sfx.buy(); return ok; }),
    move: (pid) => {
      // Copia de seguridad automática antes de mudarse.
      try { localStorage.setItem('mt3dbat.save.premove', E.serialize(ref.current)); } catch { /* sin espacio */ }
      const val = E.valuation(ref.current);
      const next = E.doMove(ref.current, pid);
      if (next && val.capital > 0) setTimeout(() => toast(`🏭 Vendiste tu etapa anterior: arrancás con ${money(val.capital)} de capital.`, 'info', 6000), 600); if (next) { sfx.achievement(); replace(next); say('¡Nueva sede! Arrancás de nuevo, pero con todo el oficio encima: tus piezas valen más para siempre.', { mood: 'happy' }); } return !!next; },
    reset: () => { const next = E.newGame(); try { localStorage.removeItem(BACKUP_KEY); } catch { /* sin acceso */ } replace(next); setBati([]); },
    downloadSave: () => {
      const st = ref.current;
      const blob = new Blob([E.serialize(st)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `maker-tycoon-${(st.name || 'partida').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },
    importJson: (txt) => {
      try { const obj = E.migrate(JSON.parse(txt)); if (!obj) return false; save(ref.current, true); obj.lastSeen = Date.now(); replace(obj); return true; } catch { return false; }
    },
    hasPreMove: () => { try { return !!localStorage.getItem('mt3dbat.save.premove'); } catch { return false; } },
    restorePreMove: () => {
      try { const obj = E.migrate(JSON.parse(localStorage.getItem('mt3dbat.save.premove'))); if (!obj) return false; obj.lastSeen = Date.now(); replace(obj); localStorage.removeItem('mt3dbat.save.premove'); return true; } catch { return false; }
    },
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
