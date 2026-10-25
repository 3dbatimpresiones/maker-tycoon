// Tienda de equipos usados: un mercado público y en vivo entre jugadores.
// Idea de la comunidad (SHUNE3D): vender las máquinas usadas a otros makers
// más baratas que nuevas; las usadas vienen con desgaste y fallan más.
import { useEffect, useRef, useState } from 'react';
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

export function WearBar({ wear, compact }) {
  const p = Math.round(Math.max(0, Math.min(1, Number(wear) || 0)) * 100);
  return (
    <span className={'wear' + (compact ? ' compact' : '')} title={`Desgaste ${p} %: cuanto más gastada, más falla. Se repara en Tienda → Mejoras.`}>
      <span className="wear-bar"><i className={p >= 60 ? 'hi' : p >= 30 ? 'mid' : ''} style={{ width: `${Math.max(2, p)}%` }} /></span>
      <span>Desgaste {p} %</span>
    </span>
  );
}

function Item({ s, it, logged, onBuy, onCancel, onLogin, fresh, busy }) {
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
  else if (why) btn = <button className="buy-btn" disabled>{why === 'Te falta plata' ? `Faltan ${money(it.price - s.money)}` : why}</button>;
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
      {waiting.length > 0 && (
        <p className="o-warn soft">📦 Tenés {waiting.length === 1 ? 'una máquina' : waiting.length + ' máquinas'} esperando lugar en el taller. Hacé lugar (vendé una o agrandá el taller) y entran solas.</p>
      )}

      {view === 'comprar' && (
        <>
          <p className="hint">Máquinas que otros makers ponen a la venta, siempre más baratas que nuevas. Vienen con <b>desgaste</b>: fallan más hasta que las reparás en <b>Mejoras → Taller de reparación</b>.</p>
          {(mk.market?.recent?.length || 0) > 0 && (
            <div className="mk-recent">
              {mk.market.recent.slice(0, 3).map((r) => (
                <div key={r.id}>🤝 <b>{r.buyer || 'Un maker'}</b> compró una {MACHINES[r.model]?.name || 'máquina'} a <b>{money(r.price)}</b> <small>{ago(r.at)}</small></div>
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
              onBuy={() => buy(it)} onCancel={() => cancel(it.id)} onLogin={login} />
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
                {mineListed.map((x) => (
                  <div key={x.id} className="mk-row">
                    <MachineThumb model={x.model} />
                    <span><b>{MACHINES[x.model]?.name}</b><small>{money(x.price)} · {left(x.ends)}</small></span>
                    <button className="chip-btn" disabled={busyId === x.id} onClick={() => cancel(x.id)}>Sacar</button>
                  </div>
                ))}
              </>
            )}
            <SellForm s={s} mk={mk} preselect={preselect} onDone={() => { clearPreselect?.(); say('ok', '¡Publicada! Ya la ven todos los que están jugando.'); }} />
            {(mk.mine?.history?.length || 0) > 0 && (
              <details className="done-list">
                <summary>Historial ({mk.mine.history.length})</summary>
                {mk.mine.history.map((h) => (
                  <div key={h.id} className="done-row">
                    {h.kind === 'venta' ? (h.status === 'sold' ? '💸 Vendiste' : '📦 Volvió') : '🛒 Compraste'} {MACHINES[h.model]?.name}
                    {h.status === 'sold' && <> · {money(h.price)}{h.who ? ` · ${h.kind === 'venta' ? 'a' : 'de'} ${h.who}` : ''}</>}
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
