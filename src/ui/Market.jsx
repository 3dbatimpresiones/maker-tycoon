// Tienda de equipos usados: un mercado público y en vivo entre jugadores.
// Idea de la comunidad (SHUNE3D): vender las máquinas usadas a otros makers
// más baratas que nuevas; las usadas vienen con desgaste y fallan más.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from './Panels.jsx';
import Icon from './Icon.jsx';
import { MachineThumb } from './Thumb.jsx';
import { Avatar } from './Online.jsx';
import * as E from '../game/engine.js';
import { MACHINES, TECHS } from '../game/data.js';
import { money } from '../game/format.js';

function ago(iso) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}
function left(iso) {
  const s = Math.max(0, (Date.parse(iso) - Date.now()) / 1000);
  if (s < 3600) return `queda ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `quedan ${Math.floor(s / 3600)} h`;
  return `quedan ${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`;
}
const pct1 = (x) => (Math.round(x * 1000) / 10).toLocaleString('es-AR');
// Valor aproximado de una oferta de canje (para orientarse): máquinas + plata + fichas.
const tokenValue = (model) => Math.round((MACHINES[model]?.cost || 0) * E.TRADE_TOKEN_PCT);
const offerValue = (items, cash, tokens, model) => (items || []).reduce((a, x) => a + E.itemValue(x), 0) + (Number(cash) || 0) + (tokens || 0) * tokenValue(model);
const offerText = (o) => [(o.items || []).map((x) => MACHINES[x.model]?.name || x.model).join(' + '), Number(o.money) > 0 ? money(o.money) : '', o.tokens ? `${o.tokens} ficha${o.tokens > 1 ? 's' : ''}` : ''].filter(Boolean).join(' + ');

// Ofrecer un canje por una máquina de Usados: tus máquinas + plata + fichas.
function OfferModal({ s, it, mk, onClose, onDone }) {
  const M = MACHINES[it.model];
  const [pick, setPick] = useState([]);
  const [cash, setCash] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const maxCash = Math.max(0, Math.min(Math.floor(s.money), it.price));
  const maxTok = Math.min(s.tokens || 0, E.OFFER_MAX_TOKENS);
  const why = E.offerReason(s, it, pick, cash, tokens);
  const items = s.machines.filter((m) => pick.includes(m.id)).map((m) => ({ model: m.model, wear: m.wear }));
  const val = offerValue(items, cash, tokens, it.model);
  const toggle = (id) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= E.TRADE_MAX ? p : [...p, id]));
  const send = async () => {
    setBusy(true); setErr('');
    try { await mk.offer(it, pick, cash, tokens); onDone(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return createPortal(
    <Modal title={`Ofrecer canje · ${M.brand} ${M.name}`} icon="cart" onClose={onClose} wide>
      <div className="tr-top">
        <div className="tr-art"><MachineThumb model={it.model} /></div>
        <div>
          <p className="hint">Ofrecele a <b>{it.seller?.name || 'su dueño'}</b> hasta {E.TRADE_MAX} máquinas tuyas, plata y fichas a cambio de su {M.name} (desgaste {Math.round(it.wear * 100)} %). Lo que ofrecés queda <b>apartado</b>: si no acepta en 48 h, te vuelve todo.</p>
          <div className="tr-sum">
            <span>Pide</span><b>{money(it.price)}</b>
            <span>Tu oferta vale aprox.</span><b className={'tr-pay' + (val >= it.price ? '' : ' low')}>{money(val)}</b>
          </div>
        </div>
      </div>
      <div className="section-label">TUS MÁQUINAS ({pick.length}/{E.TRADE_MAX})</div>
      <div className="tr-list">
        {s.machines.map((m) => {
          const X = MACHINES[m.model];
          const on = pick.includes(m.id);
          return (
            <button key={m.id} className={'tr-item' + (on ? ' on' : '')} onClick={() => toggle(m.id)}>
              <span className="tr-check">{on ? '✔' : ''}</span>
              <MachineThumb model={m.model} />
              <span className="tr-name"><b>{X.name}</b><WearBar wear={m.wear} compact /></span>
              <span className="tr-val">≈ {money(E.itemValue(m))}</span>
            </button>
          );
        })}
      </div>
      <div className="tr-extra">
        <label className="tr-field"><span>Plata</span>
          <input type="range" min={0} max={maxCash} step={Math.max(1, Math.round(maxCash / 200))} value={Math.min(cash, maxCash)} onChange={(e) => setCash(Number(e.target.value))} disabled={!maxCash} />
          <b>{money(cash)}</b></label>
        <div className="tr-field"><span>Fichas (tenés {s.tokens || 0})</span>
          <div className="tr-step">
            <button className="icon-btn sm" disabled={tokens <= 0} onClick={() => setTokens((t) => Math.max(0, t - 1))}><Icon name="minus" size={14} /></button>
            <b>🎟️ {tokens}</b>
            <button className="icon-btn sm" disabled={tokens >= maxTok} onClick={() => setTokens((t) => Math.min(maxTok, t + 1))}><Icon name="plus" size={14} /></button>
          </div>
          <small>cada ficha ≈ {money(tokenValue(it.model))}</small></div>
      </div>
      {err && <p className="ol-err">{err}</p>}
      <button className={'buy-btn' + (!why ? ' ok' : '')} disabled={!!why || busy} onClick={send}>
        {busy ? 'Mandando…' : !why ? `Mandar la oferta de canje` : why}
      </button>
    </Modal>,
    document.body,
  );
}

// Una oferta que te hicieron por una máquina tuya.
function OfferCard({ o, s, mk, onMsg }) {
  const [busy, setBusy] = useState(false);
  const run = async (accept) => {
    setBusy(true);
    try { await mk.answer(o, accept); onMsg('ok', accept ? '¡Canje aceptado! En unos segundos te llega todo.' : 'Oferta rechazada: al otro maker le vuelve lo que ofreció.'); }
    catch (e) { onMsg('err', e.message); } finally { setBusy(false); }
  };
  const val = offerValue(o.items, o.money, o.tokens, o.model);
  return (
    <div className="mk-offer">
      <div className="mk-offer-head"><b>🔁 {o.buyer}</b> te ofrece <small>· {left(o.ends)}</small></div>
      <div className="mk-offer-items">
        {(o.items || []).map((x, i) => (
          <span key={i} className="mk-offer-m"><MachineThumb model={x.model} /><span>{MACHINES[x.model]?.name}<WearBar wear={x.wear} compact /></span></span>
        ))}
        {Number(o.money) > 0 && <span className="mk-offer-x">💵 {money(o.money)}</span>}
        {o.tokens > 0 && <span className="mk-offer-x">🎟️ {o.tokens} ficha{o.tokens > 1 ? 's' : ''}</span>}
      </div>
      <small className="hint">Vale aprox. <b>{money(val)}</b> · vos pedías {money(o.price)}</small>
      <div className="mk-offer-btns">
        <button className="buy-btn ok" disabled={busy} onClick={() => run(true)}>Aceptar el canje</button>
        <button className="chip-btn" disabled={busy} onClick={() => run(false)}>Rechazar</button>
      </div>
    </div>
  );
}

export function WearBar({ wear, compact }) {
  const p = Math.round(Math.max(0, Math.min(1, Number(wear) || 0)) * 100);
  return (
    <span className={'wear' + (compact ? ' compact' : '')} title={`Desgaste ${p} %: cuanto más gastada, más falla. Se repara en Tienda → Mejoras.`}>
      <span className="wear-bar"><i className={p >= 60 ? 'hi' : p >= 30 ? 'mid' : ''} style={{ width: `${Math.max(2, p)}%` }} /></span>
      <span>Desgaste {p} %</span>
    </span>
  );
}

function Item({ s, it, logged, onBuy, onCancel, onLogin, onOffer, onCancelOffer, fresh, busy }) {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return undefined; const t = setTimeout(() => setSure(false), 4000); return () => clearTimeout(t); }, [sure]);
  const M = MACHINES[it.model];
  if (!M) return null;
  const shopPrice = E.machineCost(s, it.model);
  const off = Math.max(0, Math.round((1 - it.price / shopPrice) * 100));
  const why = E.buyUsedReason(s, it);
  let btn;
  if (it.mine) btn = <button className="chip-btn mk-own" disabled={busy} onClick={onCancel}>Es tuya · Sacarla de la venta</button>;
  else if (!logged) btn = <button className="buy-btn" onClick={onLogin}>Ingresá con Google para comprar · {money(it.price)}</button>;
  else if (why) btn = (
    <button className="buy-btn" disabled>
      {why === 'Te falta plata'
        ? <><span className="bb-price">Precio <b>{money(it.price)}</b></span><small className="bb-miss">Faltan {money(it.price - s.money)}</small></>
        : why}
    </button>
  );
  else btn = (
    <button className={'buy-btn ok' + (sure ? ' sure' : '')} disabled={busy} onClick={() => (sure ? onBuy() : setSure(true))}>
      {busy ? 'Comprando…' : sure ? `¿Seguro? Tocá de nuevo · ${money(it.price)}` : `Comprar usada · ${money(it.price)}`}
    </button>
  );
  return (
    <div className={'shop-item mk-item' + (fresh ? ' fresh' : '') + (it.mine ? ' mine' : '')}>
      <div className="shop-art"><MachineThumb model={it.model} /><span className="used-tag">USADA</span></div>
      <div className="shop-txt">
        <span className="brand-tag">{M.brand}</span>
        <b>{M.name}</b>
        <WearBar wear={it.wear} />
        <div className="shop-stats">
          <span>Fallas {pct1(M.fail * E.wearFailMult(it))} %</span>
          <span className="c-green">{off > 0 ? `−${off} % que en la tienda` : 'Precio de tienda'}</span>
          <span>Nueva: {money(shopPrice)}</span>
        </div>
        <div className="mk-seller">
          <Avatar name={it.seller?.name} frame={it.seller?.frame} src={it.seller?.avatar} size={22} />
          <span><b>{it.mine ? 'Vos' : it.seller?.name || 'Un maker'}</b> · {ago(it.at)} · {left(it.ends)}</span>
        </div>
        {btn}
        {/* El canje entre makers aparece cuando la base ya lo tiene (migración 032: la lista trae "offers"). */}
        {!it.mine && logged && it.offers != null && (it.my_offer
          ? <button className="chip-btn tr-btn" disabled={busy} onClick={onCancelOffer}>🔁 Tu oferta de canje está esperando · Retirarla</button>
          : <button className="chip-btn tr-btn" onClick={onOffer}>🔁 Ofrecer canje (máquinas, plata o fichas)</button>)}
        {it.offers > 0 && <span className="mk-offers">{it.offers} oferta{it.offers > 1 ? 's' : ''} de canje</span>}
      </div>
    </div>
  );
}

function SellForm({ s, mk, preselect, onDone }) {
  const sellable = s.machines.length > 1 ? s.machines : [];
  const [mid, setMid] = useState(preselect ?? null);
  const m = s.machines.find((x) => x.id === mid) || null;
  const wear = m ? Math.round(E.wearOf(m) * 1000) / 1000 : 0;
  const min = m ? E.usedMin(m.model) : 0;
  const max = m ? E.usedMax(m.model, wear) : 0;
  const [price, setPrice] = useState(m ? E.usedSuggest(m.model, wear) : 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (m) setPrice(E.usedSuggest(m.model, wear)); setErr(''); }, [mid]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = (mk.mine?.listed?.length || 0) + (s.market?.outbox?.length || 0);
  if (!sellable.length) return <p className="hint">Para vender en Usados necesitás al menos 2 máquinas (una se queda siempre en el taller).</p>;
  const p = Math.max(min, Math.min(max, Math.round(price)));
  const go = async () => {
    setBusy(true); setErr('');
    try { await mk.publish(m.id, p); setMid(null); onDone?.(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="mk-sell">
      <div className="section-label">1 · ELEGÍ LA MÁQUINA</div>
      <div className="mk-pick">
        {sellable.map((x) => {
          const X = MACHINES[x.model];
          return (
            <button key={x.id} className={'mk-pick-btn' + (x.id === mid ? ' active' : '')} onClick={() => setMid(x.id)} title={`${X.brand} ${X.name}`}>
              <MachineThumb model={x.model} />
              <span>{X.name}</span>
              <WearBar wear={x.wear} compact />
            </button>
          );
        })}
      </div>
      {m && (
        <>
          <div className="section-label">2 · PONELE PRECIO</div>
          <div className="mk-price">
            <b className="mk-price-v">{money(p)}</b>
            <input type="range" min={min} max={max} step={Math.max(1, Math.round((max - min) / 200))} value={p} onChange={(e) => setPrice(Number(e.target.value))} aria-label="Precio" />
            <div className="mk-price-ref">
              <span>Mín. {money(min)}</span>
              <button className="link-btn" onClick={() => setPrice(E.usedSuggest(m.model, wear))}>Precio sugerido</button>
              <span>Máx. {money(max)}</span>
            </div>
            <p className="hint">Nueva en la tienda: {money(E.machineCost(s, m.model))}. Vendida a la tienda te dan {money(Math.round((m.paid || 0) * 0.5))}. Cuanto más gastada, más bajo es el tope.</p>
          </div>
          {err && <p className="ol-err">{err}</p>}
          <button className="buy-btn ok" disabled={busy || active >= 5} onClick={go}>
            {busy ? 'Publicando…' : active >= 5 ? 'Ya tenés 5 publicadas' : `Publicar en Usados · ${money(p)}`}
          </button>
          <p className="hint">La máquina sale de tu taller al publicarla (la pieza en curso se pierde). Si en 3 días nadie la compra, vuelve sola. La plata de la venta va a tu caja, pero no suma Puntos Maker.</p>
        </>
      )}
    </div>
  );
}

export default function Market({ s, online, mk, open, preselect, clearPreselect }) {
  const [view, setView] = useState(preselect != null ? 'vender' : 'comprar');
  const [tech, setTech] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [fresh, setFresh] = useState(() => new Set());
  const seen = useRef(null);
  const items = mk.market?.items || [];

  useEffect(() => { mk.setWatching(true); return () => mk.setWatching(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (preselect != null) setView('vender'); }, [preselect]);
  // Las que aparecen mientras mirás se marcan como nuevas unos segundos.
  useEffect(() => {
    const ids = items.map((i) => i.id);
    if (seen.current) {
      const n = ids.filter((id) => !seen.current.has(id));
      if (n.length) { setFresh(new Set(n)); setTimeout(() => setFresh(new Set()), 6000); }
    }
    seen.current = new Set([...(seen.current || []), ...ids]);
  }, [mk.market]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (kind, text) => { setMsg({ kind, text }); setTimeout(() => setMsg(null), 6000); };
  const login = () => (online.session ? open('online', null, 'perfil') : online.signIn());
  const buy = async (it) => {
    setBusyId(it.id);
    try { await mk.buy(it); say('ok', `¡Listo! La ${MACHINES[it.model].name} ya está en tu taller.`); } catch (e) { say('err', e.message); mk.loadList(); } finally { setBusyId(null); }
  };
  const [offerFor, setOfferFor] = useState(null);
  const cancelOffer = async (id) => {
    setBusyId('o' + id);
    try { await mk.cancelOffer(id); say('ok', 'Retiraste la oferta: te vuelve todo lo que habías ofrecido.'); } catch (e) { say('err', e.message); } finally { setBusyId(null); }
  };
  const cancel = async (id) => {
    setBusyId(id);
    try { await mk.cancel(id); say('ok', 'Sacaste la publicación: la máquina vuelve a tu taller.'); } catch (e) { say('err', e.message); } finally { setBusyId(null); }
  };

  if (mk.available === false) {
    return (
      <div className="shop-list">
        <div className="mk-soon"><Icon name="cart" size={28} /><b>Tienda de usados</b><p>Se está terminando de instalar. ¡Muy pronto vas a poder comprar y vender máquinas usadas con otros makers!</p></div>
      </div>
    );
  }
  const st = mk.market?.stats;
  const shown = items.filter((it) => MACHINES[it.model] && (tech === 'all' || MACHINES[it.model].tech === tech));
  const mineListed = mk.mine?.listed || [];
  const outbox = s.market?.outbox || [];
  const waiting = mk.mine?.todo || [];
  return (
    <div className="shop-list mk">
      <div className="mk-live">
        <i className="mk-dot" /> <b>En vivo</b>
        {st ? <span> · {st.active} a la venta · {st.sold24} vendidas hoy</span> : <span> · cargando…</span>}
      </div>
      <div className="view-toggle mk-tabs">
        <button className={'seg' + (view === 'comprar' ? ' active' : '')} onClick={() => setView('comprar')}>Comprar</button>
        <button className={'seg' + (view === 'vender' ? ' active' : '')} onClick={() => setView('vender')}>
          Vender las mías{mineListed.length + outbox.length > 0 ? ` (${mineListed.length + outbox.length})` : ''}
        </button>
      </div>
      {msg && <p className={msg.kind === 'err' ? 'ol-err' : 'mk-ok'}>{msg.text}</p>}
      {offerFor && <OfferModal s={s} it={offerFor} mk={mk} onClose={() => setOfferFor(null)} onDone={() => { setOfferFor(null); say('ok', '¡Oferta mandada! Lo que ofreciste queda apartado hasta que te respondan.'); }} />}
      {waiting.length > 0 && (
        <p className="o-warn soft">📦 Tenés {waiting.length === 1 ? 'una máquina' : waiting.length + ' máquinas'} esperando lugar en el taller. Hacé lugar (vendé una o agrandá el taller) y entran solas.</p>
      )}

      {view === 'comprar' && (
        <>
          <p className="hint">Máquinas que otros makers ponen a la venta, siempre más baratas que nuevas. Vienen con <b>desgaste</b>: fallan más hasta que las reparás en <b>Mejoras → Taller de reparación</b>. También podés <b>ofrecer un canje</b>: tus máquinas, plata o fichas a cambio.</p>
          {(mk.mine?.offers_out?.length || 0) > 0 && (
            <div className="mk-myoffers">
              <div className="section-label">TUS OFERTAS DE CANJE (ESPERANDO RESPUESTA)</div>
              {mk.mine.offers_out.map((o) => (
                <div key={o.id} className="mk-row">
                  <MachineThumb model={o.model} />
                  <span><b>{MACHINES[o.model]?.name} de {o.seller}</b><small>Ofreciste {offerText(o)} · {left(o.ends)}</small></span>
                  <button className="chip-btn" disabled={busyId === 'o' + o.id} onClick={() => cancelOffer(o.id)}>Retirar</button>
                </div>
              ))}
            </div>
          )}
          {(mk.market?.recent?.length || 0) > 0 && (
            <div className="mk-recent">
              {mk.market.recent.slice(0, 3).map((r) => (
                <div key={r.id}>{r.trade ? '🔁' : '🤝'} <b>{r.buyer || 'Un maker'}</b> {r.trade ? 'se llevó por canje' : 'compró'} una {MACHINES[r.model]?.name || 'máquina'}{r.trade ? '' : <> a <b>{money(r.price)}</b></>} <small>{ago(r.at)}</small></div>
              ))}
            </div>
          )}
          <div className="tech-tabs">
            <button className={'opt sm' + (tech === 'all' ? ' active' : '')} onClick={() => setTech('all')}>Todas</button>
            {Object.values(TECHS).map((T) => <button key={T.id} className={'opt sm' + (tech === T.id ? ' active' : '')} onClick={() => setTech(T.id)}>{T.short}</button>)}
          </div>
          {!mk.market && <p className="hint">Buscando máquinas usadas…</p>}
          {mk.market && !shown.length && (
            <div className="mk-empty">
              <p>Todavía no hay usadas{tech !== 'all' ? ' de este tipo' : ''} a la venta.</p>
              <button className="chip-btn" onClick={() => setView('vender')}>¡Publicá la primera!</button>
            </div>
          )}
          {shown.map((it) => (
            <Item key={it.id} s={s} it={it} logged={mk.logged} fresh={fresh.has(it.id)} busy={busyId === it.id}
              onBuy={() => buy(it)} onCancel={() => cancel(it.id)} onLogin={login}
              onOffer={() => setOfferFor(it)} onCancelOffer={() => cancelOffer(it.my_offer)} />
          ))}
        </>
      )}

      {view === 'vender' && (
        !online.session ? (
          <div className="mk-empty">
            <p>Para vender (y comprar) en Usados entrá con tu cuenta de Google: así sabemos de quién es cada máquina.</p>
            <button className="buy-btn ok" onClick={() => online.signIn()}>Ingresar con Google</button>
          </div>
        ) : !online.me?.player ? (
          <div className="mk-empty">
            <p>Primero creá tu perfil de jugador (tu apodo es lo que ven los demás).</p>
            <button className="buy-btn ok" onClick={() => open('online', null, 'perfil')}>Crear mi perfil</button>
          </div>
        ) : (
          <>
            {(mineListed.length > 0 || outbox.length > 0) && (
              <>
                <div className="section-label">TUS PUBLICACIONES</div>
                {outbox.map((e) => (
                  <div key={e.nonce} className="mk-row"><MachineThumb model={e.model} /><span><b>{MACHINES[e.model]?.name}</b><small>{money(e.price)} · publicando… (se confirma apenas haya conexión)</small></span></div>
                ))}
                {mineListed.map((x) => {
                  const offers = (mk.mine?.offers_in || []).filter((o) => o.listing === x.id);
                  return (
                    <div key={x.id} className="mk-listing">
                      <div className="mk-row">
                        <MachineThumb model={x.model} />
                        <span><b>{MACHINES[x.model]?.name}</b><small>{money(x.price)} · {left(x.ends)}{offers.length ? ` · ${offers.length} oferta${offers.length > 1 ? 's' : ''} de canje` : ''}</small></span>
                        <button className="chip-btn" disabled={busyId === x.id} onClick={() => cancel(x.id)}>Sacar</button>
                      </div>
                      {offers.map((o) => <OfferCard key={o.id} o={o} s={s} mk={mk} onMsg={say} />)}
                    </div>
                  );
                })}
              </>
            )}
            <SellForm s={s} mk={mk} preselect={preselect} onDone={() => { clearPreselect?.(); say('ok', '¡Publicada! Ya la ven todos los que están jugando.'); }} />
            {(mk.mine?.history?.length || 0) > 0 && (
              <details className="done-list">
                <summary>Historial ({mk.mine.history.length})</summary>
                {mk.mine.history.map((h) => (
                  <div key={h.id} className="done-row">
                    {h.trade ? '🔁 Canjeaste' : h.kind === 'venta' ? (h.status === 'sold' ? '💸 Vendiste' : '📦 Volvió') : '🛒 Compraste'} {MACHINES[h.model]?.name}
                    {h.status === 'sold' && <> · {h.trade ? '' : money(h.price)}{h.who ? ` · ${h.kind === 'venta' ? 'con' : 'de'} ${h.who}` : ''}</>}
                  </div>
                ))}
              </details>
            )}
          </>
        )
      )}
    </div>
  );
}
