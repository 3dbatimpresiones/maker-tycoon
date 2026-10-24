// Modo online: cuenta de Google, partida en la nube, perfil, presencia y puntos.
// Regla de oro: NUNCA se pierde una partida. Antes de reemplazar la de este
// navegador por la de la nube se guarda una copia local, y si las dos tienen
// progreso distinto se le pregunta al jugador cuál usar.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getClient, rpc, clientId, saveOnExit, decideSync, summaryOf, isMissing } from './api.js';
import { INSIDE_BATBOX, GAME_IN_BATBOX, SAVE_KEY } from '../config.js';
import { setSeason } from '../game/format.js';
import * as E from '../game/engine.js';

const META_KEY = 'mt3dbat.cloud';
const PUSH_EVERY = 60000;
const PING_EVERY = 45000;
const LIVE_EVERY = 60000;
const DEV_NO_ONLINE = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo');

const readMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch { return null; } };
const writeMeta = (m) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* sin acceso */ } };
const device = () => {
  const ua = navigator.userAgent || '';
  const kind = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Celular' : 'Compu';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${kind} · ${br}`;
};

export function useOnline(opts) {
  // Funciones del juego, siempre las de la última vez que se dibujó.
  const ext = useRef(opts);
  ext.current = opts;
  const getState = useCallback(() => ext.current.getState(), []);
  const toast = useCallback((...a) => ext.current.toast(...a), []);
  const say = useCallback((...a) => ext.current.say(...a), []);
  const isLocked = () => !!ext.current.isLocked?.();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);          // ya se sabe si hay sesión
  // ¿La base tiene el modo online (migración 026)? null = todavía no se sabe.
  const [available, setAvailable] = useState(null);
  const [me, setMe] = useState(null);
  const [cloud, setCloud] = useState({ status: 'off', at: null }); // off · checking · ok · saving · error · conflict
  const [conflict, setConflict] = useState(null);     // { cloud, local }
  const [live, setLive] = useState(null);
  const [podium, setPodium] = useState(null); // top 3 de la temporada (cuadro de honor del taller)
  const [sessionPoints, setSessionPoints] = useState(0);
  const sessionRef = useRef(null);
  const syncedRef = useRef(false);                     // ya se decidió qué partida usar
  const pushing = useRef(false);
  const stopPing = useRef(false);

  // ---------- Perfil ----------
  const refreshMe = useCallback(async () => {
    if (!sessionRef.current) { setMe(null); return null; }
    try {
      const m = await rpc('bb_mt_me');
      setMe(m);
      setAvailable(true);
      if (m?.season) setSeason(m.season.name, m.season.usd_rate);
      // Premios ganados → la partida los recuerda (para el taller 3D, también sin conexión).
      const st = getState();
      if (m?.unlocks && st) {
        st.cosmetics = st.cosmetics || { unlocked: [], decor: [], skin: null, effect: null };
        st.cosmetics.unlocked = [...new Set([...(st.cosmetics.unlocked || []), ...m.unlocks])];
        if (!st.seen.decor_auto && m.unlocks.includes('d_cartel3dbat')) { st.seen.decor_auto = 1; st.cosmetics.decor = [...new Set([...(st.cosmetics.decor || []), 'd_cartel3dbat'])]; }
      }
      return m;
    } catch (e) {
      if (e.missing) setAvailable(false);
      return null;
    }
  }, [getState]);

  // ---------- Guardar en la nube ----------
  const push = useCallback(async (force = false) => {
    const ses = sessionRef.current;
    if (!ses || !syncedRef.current || pushing.current || isLocked()) return null;
    const st = getState();
    if (!st || st.tutorial?.active) return null;
    pushing.current = true;
    setCloud((c) => ({ ...c, status: 'saving' }));
    try {
      const meta = readMeta();
      const rev = meta?.uid === ses.user.id ? meta.rev : null;
      const data = JSON.parse(E.serialize(st));
      const r = await rpc('bb_mt_save_put', { p_data: data, p_rev: rev, p_device: device(), p_force: force });
      if (r?.conflict) {
        const c = await rpc('bb_mt_save_get');
        setConflict({ cloud: c, local: summaryOf(st), reason: 'cloudNewer' });
        setCloud({ status: 'conflict', at: null });
        return r;
      }
      if (r?.busy) { setCloud((c) => ({ ...c, status: 'ok' })); return r; }
      writeMeta({ uid: ses.user.id, rev: r.rev });
      setCloud({ status: 'ok', at: Date.now() });
      const sc = r.score;
      if (sc?.points > 0) setSessionPoints((p) => p + sc.points);
      if (sc?.completed?.length) {
        for (const t of sc.completed) toast(`🏆 Reto cumplido: ${t}`, 'info', 5000);
        say(`¡Cumpliste «${sc.completed[0]}»! El premio ya está en tu perfil online.`, { mood: 'happy' });
        refreshMe();
      } else if (sc?.points > 0 && Math.random() < 0.2) refreshMe();
      return r;
    } catch (e) {
      if (e.missing) setAvailable(false);
      setCloud((c) => ({ ...c, status: 'error' }));
      return null;
    } finally { pushing.current = false; }
  }, [getState, refreshMe, say, toast]);

  // ---------- Al conectar la cuenta: ¿qué partida se usa? ----------
  const syncOnLogin = useCallback(async (ses) => {
    syncedRef.current = false;
    setCloud({ status: 'checking', at: null });
    try {
      const c = await rpc('bb_mt_save_get');
      const local = getState();
      const meta = readMeta();
      const d = decideSync({ uid: ses.user.id, cloud: c, meta, local });
      if (d.action === 'useCloud') {
        loadCloudSave(c, ses, d.silent);
        return;
      }
      if (d.action === 'adopt' || d.fixRev != null) writeMeta({ uid: ses.user.id, rev: c.rev });
      if (d.action === 'ask') {
        setConflict({ cloud: c, local: summaryOf(local), reason: d.reason });
        setCloud({ status: 'conflict', at: null });
        return;
      }
      syncedRef.current = true;
      if (d.action === 'upload' || d.action === 'inSync') await push(false);
      else setCloud({ status: 'ok', at: Date.now() });
    } catch (e) {
      if (e.missing) setAvailable(false);
      setCloud({ status: 'error', at: null });
    }
  }, [getState, push]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reemplaza la partida de este navegador por la de la nube (con copia local antes).
  function loadCloudSave(c, ses, silent) {
    try { const prev = localStorage.getItem(SAVE_KEY); if (prev) localStorage.setItem(SAVE_KEY + '.antes-nube', prev); } catch { /* sin acceso */ }
    const ok = ext.current.adoptSave(JSON.parse(JSON.stringify(c.data)));
    if (ok) {
      writeMeta({ uid: ses.user.id, rev: c.rev });
      syncedRef.current = true;
      setCloud({ status: 'ok', at: Date.now() });
      if (!silent) toast('☁️ Cargaste la partida de la nube.', 'info');
      else say('¡Hola de nuevo! Traje tu taller desde la nube, tal cual lo dejaste.', { mood: 'happy' });
    } else {
      setCloud({ status: 'error', at: null });
      toast('No se pudo leer la partida de la nube.', 'err');
    }
  }

  const resolveConflict = useCallback(async (choice) => {
    const ses = sessionRef.current;
    if (!ses || !conflict) return;
    if (choice === 'cloud') {
      loadCloudSave(conflict.cloud, ses, false);
    } else {
      syncedRef.current = true;
      await push(true);
      toast('☁️ Listo: en la nube quedó la partida de este dispositivo.', 'info');
    }
    setConflict(null);
  }, [conflict, push, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Sesión ----------
  useEffect(() => {
    if (DEV_NO_ONLINE) { setReady(true); return undefined; }
    let unsub = null;
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    const start = async () => {
      const sb = await getClient();
      if (!alive) return;
      const { data } = sb.auth.onAuthStateChange((event, ses) => {
        if (event === 'SIGNED_OUT') { sessionRef.current = null; setSession(null); setMe(null); syncedRef.current = false; setCloud({ status: 'off', at: null }); return; }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setReady(true);
          const prevUid = sessionRef.current?.user?.id;
          sessionRef.current = ses; setSession(ses);
          if (ses && ses.user.id !== prevUid) {
            // Limpia ?code / ?login de la URL al volver de Google.
            const url = new URL(window.location.href);
            let dirty = false;
            for (const k of ['code', 'login', 'error', 'error_description', 'error_code']) if (url.searchParams.has(k)) { url.searchParams.delete(k); dirty = true; }
            if (dirty) window.history.replaceState(null, '', url.pathname + url.search + url.hash);
            setTimeout(async () => { await refreshMe(); syncOnLogin(ses); }, 0);
          }
          if (!ses && params.has('login') && INSIDE_BATBOX) signIn();
          return;
        }
        if (ses) { sessionRef.current = ses; setSession(ses); }
      });
      unsub = data.subscription;
    };
    // Si se vuelve de Google, se arranca enseguida; si no, un ratito después de mostrar el juego.
    const t = setTimeout(start, params.has('code') || params.has('login') ? 0 : 800);
    return () => { alive = false; clearTimeout(t); unsub?.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async () => {
    // La versión suelta del juego no está habilitada para volver de Google: se inicia
    // sesión desde la copia de BATBOX en el MISMO sitio (comparten la partida del navegador).
    const local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!INSIDE_BATBOX && !local) { window.location.href = GAME_IN_BATBOX + '?login=1'; return; }
    const sb = await getClient();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname, queryParams: { prompt: 'select_account' } },
    });
  }, []);

  const signOut = useCallback(async () => {
    await push(false);
    const sb = await getClient();
    await sb.auth.signOut({ scope: 'local' });
  }, [push]);

  // ---------- Guardado periódico + al salir ----------
  useEffect(() => {
    if (!session) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') push(false); }, PUSH_EVERY);
    const onHide = () => {
      if (document.visibilityState !== 'hidden' || !syncedRef.current || isLocked()) return;
      const st = getState();
      const meta = readMeta();
      if (!st || st.tutorial?.active || meta?.uid !== session.user.id) return;
      saveOnExit(sessionRef.current, { p_data: JSON.parse(E.serialize(st)), p_rev: meta.rev, p_device: device(), p_force: false });
      // La versión sube en 1 si la nube aceptó: al volver se confirma con un guardado normal.
      writeMeta({ uid: session.user.id, rev: meta.rev + 1, pending: true });
    };
    const onShow = async () => {
      if (document.visibilityState !== 'visible' || !syncedRef.current) return;
      const meta = readMeta();
      if (!meta?.pending) return;
      // ¿La nube recibió el guardado de salida? Si no, se vuelve a la versión anterior.
      try {
        const c = await rpc('bb_mt_save_get');
        writeMeta({ uid: session.user.id, rev: c?.rev ?? meta.rev - 1 });
      } catch { writeMeta({ uid: session.user.id, rev: meta.rev - 1 }); }
    };
    document.addEventListener('visibilitychange', onHide);
    document.addEventListener('visibilitychange', onShow);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onHide); document.removeEventListener('visibilitychange', onShow); };
  }, [session, push, getState]);

  // ---------- Presencia y contador en vivo (también sin cuenta) ----------
  useEffect(() => {
    if (DEV_NO_ONLINE) return undefined;
    const cid = clientId();
    const ping = () => {
      if (stopPing.current || !cid || document.visibilityState !== 'visible') return;
      rpc('bb_live_ping', { p_client: cid, p_app: 'juego' }).catch((e) => { if (isMissing(e) || e.missing) stopPing.current = true; });
    };
    const counts = () => {
      if (document.visibilityState !== 'visible') return;
      rpc('bb_live_counts').then((d) => { setLive(d); setAvailable(true); }).catch((e) => { if (e.missing) setAvailable(false); });
    };
    const top = () => {
      if (document.visibilityState !== 'visible') return;
      rpc('bb_mt_ranking', { p_kind: 'global', p_limit: 3 }).then((d) => setPodium({ rows: d?.rows || [], season: null })).catch(() => {});
    };
    const t0 = setTimeout(() => { ping(); counts(); top(); }, 900);
    const t3 = setInterval(top, 5 * 60000);
    const t1 = setInterval(ping, PING_EVERY);
    const t2 = setInterval(counts, LIVE_EVERY);
    return () => { clearTimeout(t0); clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [session]);

  return {
    ready, available, session, user: session?.user || null, me, cloud, conflict, live, sessionPoints, podium,
    signIn, signOut, refreshMe, push, resolveConflict,
  };
}
