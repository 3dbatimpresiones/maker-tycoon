// Chat en vivo: Global, la Granja y Grupos. Solo con la cuenta de Google iniciada.
// Con el chat abierto se consulta cada 2,5 s (en vivo); cerrado, cada 15 s
// (para los no leídos y los avisos de mención).
import { useCallback, useEffect, useRef, useState } from 'react';
import { rpc } from './api.js';
import { sfx } from '../ui/sfx.js';

const OPEN_EVERY = 2500;
const CLOSED_EVERY = 15000;
const HIDDEN_EVERY = 30000;
const DEV_NO_ONLINE = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo');

// La misma regla que la base: cualquier dirección web (solo el equipo de BATBOX puede mandar links).
export const LINK_RE = /(https?:|ftp:|www\.|discord\.gg|t\.me\/|wa\.me\/|bit\.ly|[a-z0-9-]\s*(\.|\[\.\]|\(\.\)|\[dot\]|\(dot\))\s*(com|net|org|ar|io|gg|ly|xyz|info|app|site|online|link|click|ru|cn|tk|store|shop|top|live|dev|page|biz|tv)([^a-z0-9]|$))/i;

const PREFS_KEY = 'mt3dbat.chat';
// Avisos: cada uno elige. Por defecto avisa de todo en el juego (los del navegador se activan aparte).
export const DEFAULT_PREFS = { notify: false, muted: [], msgGlobal: true, msgFarm: true, msgGroup: true, mentions: true, sound: true, showEvents: true, shareEvents: true, farmOnly: false };
export const REACTIONS = ['🖨️', '🔥', '🧉', '⚡', '🏆', '😱'];
const readPrefs = () => { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return { ...DEFAULT_PREFS }; } };
const roomLabel = (r) => (r.kind === 'farm' ? `la granja ${r.name}` : r.kind === 'group' ? `el grupo ${r.name}` : 'Global');
function browserNotify(title, body, tag) {
  if (document.visibilityState === 'visible' || !readPrefs().notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { new Notification(title, { body: (body || '').slice(0, 140), tag }); } catch { /* sin avisos */ }
}
const writePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* sin acceso */ } };

export function useChat({ online, toast }) {
  const ext = useRef(null);
  ext.current = { online, toast };
  const [open, setOpenRaw] = useState(false);
  const [min, setMin] = useState(false); // achicado a un botón redondo (como Spotify)
  const setOpen = useCallback((v) => { setOpenRaw(v); if (!v) setMin(false); }, []);
  const shown = open && !min;            // el chat se está viendo
  const [room, setRoom] = useState('global');
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [info, setInfo] = useState({ staff: false, muted_until: null, mute_reason: null, profile: null });
  const [available, setAvailable] = useState(null);
  const [prefs, setPrefsState] = useState(readPrefs);
  const roomRef = useRef(room);
  roomRef.current = room;
  const openRef = useRef(shown);
  openRef.current = shown;
  const lastId = useRef({});      // último mensaje recibido por sala
  const readId = useRef({});      // último marcado como leído por sala
  const notified = useRef(0);     // última mención avisada
  const seenLast = useRef({});    // último mensaje ya visto/avisado por sala
  const initDone = useRef(false); // la primera consulta no avisa lo viejo
  const globalInit = useRef(false);
  const busy = useRef(false);
  const again = useRef(false);    // llegó un pedido mientras había otro en curso: se repite al terminar
  const logged = !!online.session && !!online.me?.player;

  const setPrefs = useCallback((patch) => setPrefsState((p) => { const n = { ...p, ...patch }; writePrefs(n); return n; }), []);

  const notifyMentions = useCallback((list) => {
    const fresh = (list || []).filter((m) => m.id > notified.current);
    if (!fresh.length) return;
    notified.current = Math.max(...fresh.map((m) => m.id));
    const muted = readPrefs().muted || [];
    const shown = fresh.filter((m) => !muted.includes((m.nick || '').toLowerCase()));
    const watching = openRef.current && document.visibilityState === 'visible';
    const p = readPrefs();
    if (p.mentions !== false) {
      for (const m of shown.slice(-3)) {
        const here = watching && m.room === roomRef.current;
        if (p.sound !== false) sfx.mention?.();
        if (!here) ext.current.toast(`💬 ${m.nick} te mencionó en ${m.room_name}: «${(m.body || '').slice(0, 70)}»`, 'info', 7000);
        browserNotify(`${m.nick} te mencionó · Maker Tycoon`, m.body, 'mt-chat-' + m.id);
      }
    }
    rpc('bb_mt_chat_read', { p_room: null, p_last_id: null, p_mention_seen: notified.current }).catch(() => {});
  }, []);

  // Avisa los mensajes nuevos de las salas que no estás mirando (según lo que elegiste).
  const notifyRooms = useCallback((list) => {
    const p = readPrefs();
    const watching = openRef.current && document.visibilityState === 'visible';
    const muted = p.muted || [];
    const fresh = [];
    for (const r of list) {
      const last = r.last;
      if (!last) continue;
      const prev = seenLast.current[r.room] ?? (initDone.current ? 0 : undefined);
      seenLast.current[r.room] = Math.max(seenLast.current[r.room] || 0, last.id);
      if (prev === undefined || last.id <= prev || last.mine || last.me_mentioned) continue;
      if (watching && r.room === roomRef.current) continue;
      const on = r.kind === 'global' ? p.msgGlobal : r.kind === 'farm' ? p.msgFarm : p.msgGroup;
      if (on === false || muted.includes((last.nick || '').toLowerCase())) continue;
      fresh.push({ r, last });
    }
    initDone.current = true;
    if (!fresh.length) return;
    if (p.sound !== false) sfx.chatMsg?.();
    if (fresh.length === 1) {
      const { r, last } = fresh[0];
      ext.current.toast(`💬 ${last.nick} en ${roomLabel(r)}: «${(last.body || '').slice(0, 70)}»`, 'info', 5000);
      browserNotify(`${last.nick} en ${roomLabel(r)} · Maker Tycoon`, last.body, 'mt-room-' + r.room);
    } else {
      const names = fresh.map((x) => roomLabel(x.r)).join(', ');
      ext.current.toast(`💬 Mensajes nuevos en ${names}`, 'info', 5000);
      browserNotify('Mensajes nuevos · Maker Tycoon', names, 'mt-rooms');
    }
  }, []);

  const poll = useCallback(async () => {
    if (!ext.current.online.session) return;
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    const r0 = openRef.current ? roomRef.current : null;
    try {
      const after = r0 ? lastId.current[r0] ?? null : null;
      const d = await rpc('bb_mt_chat_poll', { p_room: r0, p_after: after });
      setAvailable(true);
      if (!d?.profile) { setInfo((x) => ({ ...x, profile: false })); return; }
      setInfo({ profile: true, staff: !!d.staff, muted_until: d.muted_until, mute_reason: d.mute_reason });
      setRooms(d.rooms || []);
      // Primera vez en Global: se cuenta como leído lo de antes, así el contador arranca desde ahora.
      const g = (d.rooms || []).find((x) => x.kind === 'global');
      if (g && g.read == null && !globalInit.current) { globalInit.current = true; rpc('bb_mt_chat_read', { p_room: 'global', p_last_id: g.last_id || 0, p_mention_seen: null }).catch(() => { globalInit.current = false; }); }
      // Si te sacaron del grupo o dejaste la granja, se vuelve a Global.
      if (r0 && !(d.rooms || []).some((x) => x.room === r0)) { setRoom('global'); return; }
      if (r0 && r0 === roomRef.current && openRef.current) {
        const msgs = d.messages || [];
        if (after == null) setMessages(msgs);
        else if (msgs.length || (d.deleted || []).length || (d.updated || []).length) {
          const del = new Set(d.deleted || []);
          const upd = new Map((d.updated || []).map((m) => [m.id, m])); // reacciones nuevas en mensajes ya vistos
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const next = prev.map((m) => (del.has(m.id) ? { ...m, deleted: true, body: null } : upd.get(m.id) || m)).concat(msgs.filter((m) => !seen.has(m.id)));
            return next.slice(-200);
          });
        }
        const top = msgs.length ? msgs[msgs.length - 1].id : null;
        if (top != null) lastId.current[r0] = Math.max(lastId.current[r0] || 0, top);
        else if (after == null) lastId.current[r0] = 0;
        const newest = lastId.current[r0] || 0;
        if (document.visibilityState === 'visible' && newest > (readId.current[r0] || 0)) {
          readId.current[r0] = newest;
          rpc('bb_mt_chat_read', { p_room: r0, p_last_id: newest, p_mention_seen: null }).catch(() => {});
          setRooms((rs) => rs.map((x) => (x.room === r0 ? { ...x, unread: 0, mentions: 0 } : x)));
        }
      }
      notifyRooms(d.rooms || []);
      notifyMentions(d.mentions);
    } catch (e) {
      if (e.missing) setAvailable(false);
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; setTimeout(() => pollRef.current(), 0); }
    }
  }, [notifyMentions, notifyRooms]);
  const pollRef = useRef(poll);
  pollRef.current = poll;

  // Bucle que nunca se corta: rápido con el chat abierto, lento cerrado o en segundo plano.
  // wake() lo despierta ya mismo (al abrir el chat o cambiar de sala) y arranca con el ritmo nuevo.
  const wakeRef = useRef(() => {});
  useEffect(() => {
    if (!logged || DEV_NO_ONLINE) return undefined;
    let alive = true;
    let t = null;
    let gen = 0;
    const loop = async (g) => {
      try { await pollRef.current(); } catch { /* sigue */ }
      if (!alive || g !== gen) return;
      const ms = document.visibilityState !== 'visible' ? HIDDEN_EVERY : openRef.current ? OPEN_EVERY : CLOSED_EVERY;
      t = setTimeout(() => loop(g), ms);
    };
    wakeRef.current = () => { gen++; clearTimeout(t); loop(gen); };
    const onVis = () => { if (document.visibilityState === 'visible') wakeRef.current(); };
    document.addEventListener('visibilitychange', onVis);
    t = setTimeout(() => loop(gen), 1200);
    return () => { alive = false; clearTimeout(t); wakeRef.current = () => {}; document.removeEventListener('visibilitychange', onVis); };
  }, [logged]);

  // Al abrir el chat o cambiar de sala: carga enseguida.
  useEffect(() => {
    if (!logged) return;
    if (shown) { lastId.current[room] = undefined; setMessages([]); }
    wakeRef.current();
  }, [shown, room, logged]);

  const send = useCallback(async (body) => {
    const text = String(body || '').trim();
    if (!text) return null;
    if (!info.staff && LINK_RE.test(text)) throw new Error('Por seguridad no se pueden mandar links (solo el equipo de BATBOX puede).');
    const m = await rpc('bb_mt_chat_send', { p_room: roomRef.current, p_body: text });
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m].slice(-200)));
    lastId.current[roomRef.current] = Math.max(lastId.current[roomRef.current] || 0, m.id);
    readId.current[roomRef.current] = Math.max(readId.current[roomRef.current] || 0, m.id);
    return m;
  }, [info.staff]);

  // Reacciones y denuncias (migración 035)
  const react = useCallback(async (id, emoji) => {
    const m = await rpc('bb_mt_chat_react', { p_id: id, p_emoji: emoji });
    if (m) setMessages((prev) => prev.map((x) => (x.id === id ? m : x)));
  }, []);
  const report = useCallback((id, reason) => rpc('bb_mt_chat_report', { p_id: id, p_reason: reason || null }), []);
  // Mensajes que solo ve uno (respuestas de BATI y de los comandos)
  const [local, setLocal] = useState([]);
  const addLocal = useCallback((body, kind = 'bati') => {
    setLocal((l) => [...l.slice(-20), { id: 'l' + Date.now() + Math.random(), local: true, kind, body, at: new Date().toISOString(), room: roomRef.current, nick: 'BATI' }]);
  }, []);

  const remove = useCallback(async (id) => {
    await rpc('bb_mt_chat_delete', { p_id: id });
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, body: null } : m)));
  }, []);

  const people = useCallback((q, r = roomRef.current) => rpc('bb_mt_chat_people', { p_q: q || '', p_room: r }).catch(() => []), []);
  const createGroup = useCallback(async (name, nicks) => {
    const d = await rpc('bb_mt_chat_group_create', { p_name: name, p_nicks: nicks });
    // Se agrega ya a la lista (el próximo pedido la confirma) para no rebotar a Global.
    setRooms((rs) => (rs.some((x) => x.room === d.room) ? rs : [...rs, { room: d.room, kind: 'group', name: d.name, owner: true, unread: 0, mentions: 0 }]));
    roomRef.current = d.room;
    setRoom(d.room);
    return d;
  }, []);
  const gid = (r) => (r || '').replace(/^group:/, '');
  const groupMembers = useCallback((r) => rpc('bb_mt_chat_group_members', { p_group: gid(r) }), []);
  const groupAdd = useCallback((r, nick) => rpc('bb_mt_chat_group_add', { p_group: gid(r), p_nick: nick }), []);
  const groupRemove = useCallback((r, nick) => rpc('bb_mt_chat_group_remove', { p_group: gid(r), p_nick: nick }), []);
  const groupRename = useCallback(async (r, name) => { await rpc('bb_mt_chat_group_rename', { p_group: gid(r), p_name: name }); poll(); }, [poll]);
  const groupLeave = useCallback(async (r) => { await rpc('bb_mt_chat_group_leave', { p_group: gid(r) }); setRoom('global'); poll(); }, [poll]);

  const muteLocal = useCallback((nick, on = true) => {
    const k = (nick || '').toLowerCase();
    const cur = readPrefs().muted || [];
    setPrefs({ muted: on ? [...new Set([...cur, k])] : cur.filter((x) => x !== k) });
  }, [setPrefs]);
  const enableNotify = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setPrefs({ notify: p === 'granted' });
    return p === 'granted';
  }, [setPrefs]);

  // Avisos automáticos de logros (los manda el juego; la base arma el texto y pone topes)
  useEffect(() => {
    const on = (e) => {
      const { kind, data } = e.detail || {};
      if (!logged || readPrefs().shareEvents === false || !kind) return;
      rpc('bb_mt_chat_event', { p_kind: kind, p_data: data || {} }).catch(() => {});
    };
    window.addEventListener('mt-social', on);
    return () => window.removeEventListener('mt-social', on);
  }, [logged]);

  const unread = rooms.reduce((a, x) => a + (x.unread || 0), 0);
  const mentions = rooms.reduce((a, x) => a + (x.mentions || 0), 0);
  return {
    open, setOpen, min, setMin, shown,
    // Botón del encabezado: abre; si ya está abierto, lo achica o lo vuelve a mostrar (como Spotify).
    toggle: () => { if (!open) { setOpenRaw(true); setMin(false); } else setMin((m) => !m); },
    room, setRoom, rooms, messages, info, available, logged, unread, mentions,
    prefs, setPrefs, muteLocal, enableNotify, send, remove, people, react, report, local, addLocal, createGroup, groupMembers, groupAdd, groupRemove, groupRename, groupLeave,
  };
}
