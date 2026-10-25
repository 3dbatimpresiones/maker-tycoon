// Mercado comunitario de lotes: material y fichas entre jugadores, y donaciones a los nuevos (migración 038).
import { useCallback, useEffect, useRef, useState } from 'react';
import { rpc } from '../online/api.js';
import * as E from '../game/engine.js';
import { MATERIALS, MATERIAL_ORDER } from '../game/data.js';
import { money, num } from '../game/format.js';

const miss = (e) => e?.missing || /Could not find the function|PGRST202/i.test(e?.message || '');
const isDbError = (e) => !!e?.code; // la base rechazó (no es un corte de conexión)
const qtyTxt = (l) => (l.kind === 'tokens' ? `${num(l.qty)} 🎟️ fichas` : MATERIALS[l.mat] ? `${(Number(l.qty) / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${MATERIALS[l.mat].unitName === 'bobina' || MATERIALS[l.mat].unitName === 'litro' ? 'kg' : 'u'} de ${MATERIALS[l.mat].name}` : l.mat);
const nonce = () => 'lt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Sincroniza en segundo plano: publica lo pendiente, cobra ventas y recupera lo que vuelve.
export function useLotsSync({ online, actions }) {
  const busy = useRef(false);
  const [available, setAvailable] = useState(null);
  const sync = useCallback(async () => {
    if (busy.current || !online.user || !online.me?.player) return;
    busy.current = true;
    try {
      const st = actions.getState();
      for (const p of [...E.lotsOf(st).pending]) {
        try { await rpc('bb_mt_lot_publish', { p_nonce: p.nonce, p_kind: p.kind, p_mat: p.mat, p_qty: p.qty, p_price: p.price, p_for_nick: p.nick }); actions.lotApply('published', p.nonce); }
        catch (e) { if (miss(e)) throw e; if (isDbError(e)) actions.lotApply('refund', p.nonce, e.message); }
      }
      const mine = await rpc('bb_mt_lots_mine');
      setAvailable(true);
      for (const l of mine.payouts || []) { actions.lotApply('paid', l); await rpc('bb_mt_lot_ack', { p_id: l.id }).catch(() => {}); }
      for (const l of mine.returns || []) { actions.lotApply('back', l); await rpc('bb_mt_lot_ack', { p_id: l.id }).catch(() => {}); }
    } catch (e) { if (miss(e)) setAvailable(false); } finally { busy.current = false; }
  }, [online.user, online.me?.player]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    sync();
    const t = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 60000);
    return () => clearInterval(t);
  }, [sync]);
  return { available, sync };
}

export default function Lots({ s, actions, online, lots }) {
  const [list, setList] = useState(null);
  const [mine, setMine] = useState(null);
  const [err, setErr] = useState('');
  const [kind, setKind] = useState('mat');
  const [mat, setMat] = useState('PLA');
  const [kg, setKg] = useState(1);
  const [price, setPrice] = useState('');
  const [gift, setGift] = useState(false);
  const [nick, setNick] = useState('');
  const [busy, setBusy] = useState(false);
  const logged = !!online.user && !!online.me?.player;
  const load = useCallback(async () => {
    try { setList(await rpc('bb_mt_lots_list')); setMine(await rpc('bb_mt_lots_mine')); setErr(''); } catch (e) { setErr(miss(e) ? 'missing' : e.message); }
  }, []);
  useEffect(() => { if (logged) load(); }, [logged, load]);
  if (!logged) return <p className="hint">Iniciá sesión con Google y creá tu perfil para usar el mercado de lotes.</p>;
  if (err === 'missing' || lots?.available === false) return <p className="hint">El mercado de lotes se activa con la migración 038 de BATBOX.</p>;
  const qty = kind === 'mat' ? Math.round(Number(kg) * 1000) : Math.round(Number(kg));
  const ref = E.lotRefPrice(s, kind, mat, qty);
  const why = E.lotReason(s, kind, mat, qty, Number(price), gift);
  const mats = MATERIAL_ORDER.filter((m) => E.materialUnlocked(s, m) || (s.mat[m] || 0) > 0);
  const publish = async () => {
    setBusy(true); setErr('');
    const n = nonce();
    const ok = actions.lotEscrow({ nonce: n, kind, mat, qty, price: Number(price), nick: gift ? nick.trim() : null });
    if (!ok) { setBusy(false); return; }
    try { await rpc('bb_mt_lot_publish', { p_nonce: n, p_kind: kind, p_mat: kind === 'mat' ? mat : null, p_qty: qty, p_price: gift ? 0 : Math.round(Number(price)), p_for_nick: gift ? nick.trim() : null }); actions.lotApply('published', n); setPrice(''); setNick(''); }
    catch (e) { if (isDbError(e)) { actions.lotApply('refund', n); setErr(e.message); } else setErr('Sin conexión: lo publico apenas vuelva internet (ya quedó apartado).'); }
    finally { setBusy(false); load(); }
  };
  const buy = async (l) => {
    setErr('');
    const w = E.lotBuyReason(s, l);
    if (w) { setErr(w); return; }
    try { const r = await rpc('bb_mt_lot_buy', { p_id: l.id }); actions.lotApply('bought', { ...l, ...r }); } catch (e) { setErr(e.message); }
    load();
  };
  const cancel = async (l) => {
    setErr('');
    try { await rpc('bb_mt_lot_cancel', { p_id: l.id }); actions.lotApply('back', l); } catch (e) { setErr(e.message); }
    load();
  };
  return (
    <div className="shop-list lots">
      <p className="hint">Vendé material o fichas que te sobran, comprá lotes de otros makers o doná a un jugador nuevo para darle una mano. La plata que cobrás no suma puntos. Si nadie compra tu lote en 3 días, vuelve solo.</p>
      <div className="lot-form">
        <div className="tech-tabs">
          <button className={'opt sm' + (kind === 'mat' ? ' active' : '')} onClick={() => { setKind('mat'); setKg(1); }}>🧵 Material</button>
          <button className={'opt sm' + (kind === 'tokens' ? ' active' : '')} onClick={() => { setKind('tokens'); setKg(3); }}>🎟️ Fichas</button>
        </div>
        <div className="lot-row">
          {kind === 'mat' && <select value={mat} onChange={(e) => setMat(e.target.value)}>{mats.map((m) => <option key={m} value={m}>{MATERIALS[m].name} (tenés {(s.mat[m] / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })})</option>)}</select>}
          <label>Cantidad <input type="number" min={kind === 'mat' ? 0.1 : 1} step={kind === 'mat' ? 0.5 : 1} value={kg} onChange={(e) => setKg(e.target.value)} /> {kind === 'mat' ? (MATERIALS[mat].unitName === 'bobina' || MATERIALS[mat].unitName === 'litro' ? 'kg' : 'unidades') : 'fichas'}</label>
        </div>
        <label className="ch-toggle"><input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} /><span>🎁 Donarlo a un jugador nuevo</span></label>
        <div className="lot-row">
          {gift ? <label>Apodo <input value={nick} maxLength={24} onChange={(e) => setNick(e.target.value)} placeholder="Apodo exacto" /></label>
            : <label>Precio <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(Math.round(ref))} /> <small>(tienda: {money(ref)})</small></label>}
        </div>
        <button className="btn-center" disabled={busy || !!why || (gift && nick.trim().length < 2)} onClick={publish}>{why || (gift ? '🎁 Donar' : '📦 Publicar lote')}</button>
      </div>
      {err && err !== 'missing' && <p className="o-warn soft">{err}</p>}
      {mine?.listed?.length > 0 && (
        <>
          <div className="section-label">MIS LOTES</div>
          {mine.listed.map((l) => <div key={l.id} className="lot"><span>{qtyTxt(l)}{l.gift ? ` · 🎁 para ${l.for_nick}` : ''}</span><b>{l.gift ? 'Regalo' : money(Number(l.price))}</b><button className="chip-btn" onClick={() => cancel(l)}>Sacar</button></div>)}
        </>
      )}
      <div className="section-label">LOTES DE LA COMUNIDAD</div>
      {!list && <div className="ol-empty"><div className="spinner" /></div>}
      {list && list.filter((l) => !l.mine).length === 0 && <p className="ol-empty">Todavía no hay lotes. ¡Publicá el primero!</p>}
      {list && list.filter((l) => !l.mine).map((l) => (
        <div key={l.id} className={'lot' + (l.for_me ? ' gift' : '')}>
          <span>{l.for_me ? '🎁 ' : ''}{qtyTxt(l)}<small> · de {l.seller}</small></span>
          <b>{l.gift ? 'Regalo' : money(Number(l.price))}</b>
          <button className="chip-btn" onClick={() => buy(l)}>{l.for_me ? 'Recibir' : 'Comprar'}</button>
        </div>
      ))}
    </div>
  );
}
