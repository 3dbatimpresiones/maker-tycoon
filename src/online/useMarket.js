// Tienda de usados: las máquinas que otros makers ponen a la venta, en vivo.
// Regla de oro: nunca se pierde ni se duplica una máquina o una venta.
//   * Publicar: la máquina sale del taller y queda anotada en la partida (outbox)
//     hasta que la base confirma. Si la base la rechaza, vuelve tal cual estaba.
//   * Comprar / cobrar / recuperar: se aplica en la partida, se guarda, y recién
//     ahí se le confirma a la base. Cada movimiento queda anotado (done) para
//     que nunca se aplique dos veces, aunque se corte internet en el medio.
import { useCallback, useEffect, useRef, useState } from 'react';
import { rpc } from './api.js';
import * as E from '../game/engine.js';

const LIST_EVERY = 8000;   // con la pestaña Usados abierta
const MINE_EVERY = 20000;  // cobrar ventas, recibir compras, recuperar publicaciones
const DEV_NO_ONLINE = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo');

// Error de la base (rechazo definitivo) o de conexión (se reintenta).
const definitive = (e) => !!(e?.missing || e?.code);
const newNonce = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export function useMarket({ online, getState, actions, isLocked }) {
  const ext = useRef(null);
  ext.current = { online, getState, actions, isLocked };
  const [market, setMarket] = useState(null);     // { items, recent, stats, now }
  const [mine, setMine] = useState(null);         // { listed, todo, history }
  const [available, setAvailable] = useState(null);
  const [watching, setWatching] = useState(false);
  const busy = useRef(false);
  const logged = !!online.session && !!online.me?.player;

  const loadList = useCallback(async () => {
    try {
      const d = await rpc('bb_mt_market_list', {});
      setMarket(d);
      setAvailable(true);
      return d;
    } catch (e) {
      if (e.missing) setAvailable(false);
      return null;
    }
  }, []);

  const sync = useCallback(async () => {
    const { online: on, getState: gs, actions: ac, isLocked: lk } = ext.current;
    if (!on.session || !on.me?.player || busy.current || lk?.()) return null;
    busy.current = true;
    try {
      // 1) Publicaciones que quedaron sin confirmar (por ejemplo, se cortó internet).
      for (const e of [...(gs()?.market?.outbox || [])]) {
        try {
          await rpc('bb_mt_market_publish', { p_nonce: e.nonce, p_model: e.model, p_wear: e.wear, p_price: e.price });
          ac.marketConfirm(e.nonce);
        } catch (err) {
          if (definitive(err)) ac.marketReject(e.nonce, err.message);
        }
      }
      // 2) Cobros, compras y devoluciones pendientes.
      const d = await rpc('bb_mt_market_mine');
      setAvailable(true);
      const wait = [];
      let changed = false;
      for (const it of d?.todo || []) {
        const r = ac.marketApply(it);
        if (r === 'wait') { wait.push(it); continue; }
        if (r === 'applied') changed = true;
        try { await rpc('bb_mt_market_ack', { p_id: it.id }); } catch { /* se confirma la próxima vez */ }
      }
      setMine({ ...d, todo: wait });
      if (changed) on.push?.(false);
      return d;
    } catch (e) {
      if (e.missing) setAvailable(false);
      return null;
    } finally {
      busy.current = false;
    }
  }, []);

  // Cobros y compras pendientes: al entrar y cada tanto.
  useEffect(() => {
    if (!logged || DEV_NO_ONLINE) return undefined;
    const t0 = setTimeout(sync, 1500);
    const t = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, MINE_EVERY);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [logged, sync]);

  // Lista en vivo mientras se mira la pestaña Usados.
  useEffect(() => {
    if (!watching || DEV_NO_ONLINE) return undefined;
    loadList();
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadList(); }, LIST_EVERY);
    return () => clearInterval(t);
  }, [watching, loadList]);

  const buy = useCallback(async (it) => {
    const { getState: gs, actions: ac, online: on } = ext.current;
    const why = E.buyUsedReason(gs(), it);
    if (why) throw new Error(why);
    const r = await rpc('bb_mt_market_buy', { p_id: it.id });
    const res = ac.marketApply({ ...r, kind: 'bought', who: r.seller });
    if (res !== 'wait') rpc('bb_mt_market_ack', { p_id: r.id }).catch(() => {});
    on.push?.(false);
    loadList();
    return r;
  }, [loadList]);

  const publish = useCallback(async (mid, price) => {
    const { actions: ac, online: on } = ext.current;
    const nonce = newNonce();
    const e = ac.marketList(mid, price, nonce);
    if (!e) throw new Error('No se pudo publicar esa máquina.');
    try {
      await rpc('bb_mt_market_publish', { p_nonce: nonce, p_model: e.model, p_wear: e.wear, p_price: e.price });
      ac.marketConfirm(nonce);
    } catch (err) {
      if (definitive(err)) { ac.marketReject(nonce, err.message); throw err; }
      throw new Error('Sin conexión: la publico apenas vuelva internet (la máquina ya está apartada).');
    }
    on.push?.(false);
    loadList();
    sync();
    return e;
  }, [loadList, sync]);

  const cancel = useCallback(async (id) => {
    await rpc('bb_mt_market_cancel', { p_id: id });
    if (!(await sync())) setTimeout(sync, 2500);
    loadList();
  }, [loadList, sync]);

  return { market, mine, available, logged, setWatching, loadList, sync, buy, publish, cancel };
}
