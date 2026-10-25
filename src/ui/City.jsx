// Ciudad: mapa de demanda por zonas, talleres rivales y Expo Maker.
import { useState } from 'react';
import { Modal } from './Panels.jsx';
import { ProductThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { ZONES, RIVALS, PRODUCTS, EXPO_STANDS, EXPO_REP, DEMAND_HOT, DEMAND_COLD } from '../game/data.js';
import { money, clock, num } from '../game/format.js';

const TABS = [['mapa', '🗺️ Mapa'], ['rivales', '🏁 Rivales'], ['expo', '🎪 Expo Maker']];

function MapTab({ s }) {
  const c = s.city;
  if (!c?.hot?.length) return <p className="hint">El mapa se arma en unos segundos…</p>;
  return (
    <>
      <p className="hint">Cada zona de la ciudad compra cosas distintas. Cada 30 minutos cambia la demanda: lo que vendas de las zonas 🔥 se paga <b>×{String(DEMAND_HOT).replace('.', ',')}</b> y lo de la zona ❄️, <b>×{String(DEMAND_COLD).replace('.', ',')}</b>. Cambia en <b>{clock(Math.max(0, c.until - s.time))}</b>.</p>
      <div className="city-map">
        {ZONES.map((z) => {
          const st = E.zoneState(s, z.id);
          return (
            <div key={z.id} className={'zone' + (st > 0 ? ' hot' : st < 0 ? ' cold' : '')}>
              <div className="zone-head"><span className="zone-ic">{z.icon}</span><b>{z.name}</b>
                <em>{st > 0 ? `🔥 Mucha demanda ×${String(DEMAND_HOT).replace('.', ',')}` : st < 0 ? `❄️ Floja ×${String(DEMAND_COLD).replace('.', ',')}` : 'Normal'}</em></div>
              <small>{z.blurb}</small>
              <div className="zone-prods">
                {z.products.filter((p) => PRODUCTS[p]).map((p) => (
                  <span key={p} className={'zp' + (E.productUnlocked(s, p) ? '' : ' off')} title={PRODUCTS[p].name + (E.productUnlocked(s, p) ? '' : ' (todavía no lo tenés)')}><ProductThumb pid={p} size={24} /></span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="hint">Tip: poné las máquinas a fabricar productos de las zonas 🔥 (en el ⚙ de cada máquina ves la marca 🔥).</p>
    </>
  );
}

function RivalsTab({ s }) {
  const rows = E.fameTable(s);
  const beaten = s.city?.rivals || {};
  return (
    <>
      <p className="hint">Tu <b>fama local</b> sube con la reputación, los pedidos entregados, los proyectos y las Expos. Cada rival que superás por primera vez te da <b>3 fichas y reputación</b>. Ojo: si dejás vencer un pedido, a veces se lo lleva uno de ellos.</p>
      <div className="rival-list">
        {rows.map((r, i) => (
          <div key={r.id} className={'rival' + (r.me ? ' me' : '')}>
            <span className="rv-pos">#{i + 1}</span>
            <span className="rv-ic">{r.icon}</span>
            <span className="rv-txt">
              <b>{r.name}{r.me ? ' (vos)' : ''}</b>
              {r.rival && <small>{r.rival.style} <i>{r.rival.quote}</i></small>}
              {r.rival && beaten[r.id]?.beaten && <small className="rv-beaten">✔ Ya lo superaste una vez</small>}
            </span>
            <span className="rv-fame">{num(r.fame)}<small>fama</small></span>
          </div>
        ))}
      </div>
      {(s.city?.stolen || 0) > 0 && <p className="hint">Pedidos que se llevaron los rivales: <b>{s.city.stolen}</b>.</p>}
    </>
  );
}

function ExpoTab({ s, actions }) {
  const c = s.city || {};
  const e = c.expo;
  const [picks, setPicks] = useState([]);
  const [stand, setStand] = useState(0);
  if (!E.expoUnlocked(s)) return <p className="hint">La Expo Maker se abre desde <b>Reputación {EXPO_REP}</b>. Es el gran evento de la ciudad: preparás stock, armás tu stand y competís con los talleres rivales por premios.</p>;
  const last = c.lastExpo;
  const lastBox = last && (
    <div className="expo-last">
      <div className="section-label">ÚLTIMA EXPO · PUESTO {last.place}</div>
      {last.table.map((x, i) => <div key={x.id} className={'expo-row' + (x.me ? ' me' : '')}><span>#{i + 1}</span><span>{x.icon} {x.name}</span><b>{num(x.score)}</b></div>)}
      {(last.cash > 0 || last.tokens > 0) && <small>Premio: {last.cash ? money(last.cash) : ''}{last.tokens ? ` · ${last.tokens} 🎟️` : ''}</small>}
    </div>
  );
  if (!e) return (<><p className="hint">No hay ninguna Expo ahora. La próxima se anuncia en <b>{clock(Math.max(0, c.expoT ?? 0))}</b> de juego. Cuando se anuncie, tenés 5 minutos para inscribirte.</p>{lastBox}<p className="hint">Expos ganadas: <b>{c.expoWins || 0}</b> de {c.expos || 0}.</p></>);
  if (e.state === 'joined') {
    const pr = E.expoProgress(s);
    return (
      <>
        <div className="expo-live">
          <b>🎪 Preparando la Expo · quedan {clock(Math.max(0, e.ends - s.time))}</b>
          <span>Puntaje: <b>{num(pr.score)}</b> · Stand: {EXPO_STANDS[e.stand].icon} {EXPO_STANDS[e.stand].name} (×{String(EXPO_STANDS[e.stand].mult).replace('.', ',')})</span>
        </div>
        <div className="expo-picks">
          {e.picks.map((p) => <span key={p} className="expo-pick"><ProductThumb pid={p} size={28} /><b>{PRODUCTS[p].name}</b><small>{num(pr.units[p])} hechos</small></span>)}
        </div>
        <p className="hint">Cada unidad que fabriques de estos productos (venta o pedido) suma puntos; los productos más caros valen más y llevar variedad da bonus. Poné tus máquinas a hacerlos.</p>
        <div className="section-label">LOS RIVALES TRAEN</div>
        {e.rivals.map((r) => <div key={r.id} className="expo-row"><span>{r.icon}</span><span>{r.name}</span><b>~{num(r.score)}</b></div>)}
      </>
    );
  }
  // Abierta: elegir productos y stand
  const feasible = Object.keys(PRODUCTS).filter((p) => E.productUnlocked(s, p) && s.machines.some((m) => E.canPrint(s, m, p)));
  const toggle = (p) => setPicks((l) => (l.includes(p) ? l.filter((x) => x !== p) : l.length >= 3 ? l : [...l, p]));
  const why = E.expoJoinReason(s, picks, stand);
  return (
    <>
      <div className="expo-live open"><b>🎪 ¡Expo Maker abierta! Inscribite en {clock(Math.max(0, e.closes - s.time))}</b><span>Elegí hasta 3 productos para mostrar. Tenés 15 minutos para fabricar todo lo que puedas.</span></div>
      <div className="section-label">PRODUCTOS ({picks.length}/3)</div>
      <div className="expo-choose">
        {feasible.map((p) => (
          <button key={p} className={'expo-opt' + (picks.includes(p) ? ' on' : '')} onClick={() => toggle(p)} title={PRODUCTS[p].name}>
            <ProductThumb pid={p} size={30} /><small>{PRODUCTS[p].name}</small>
          </button>
        ))}
      </div>
      <div className="section-label">STAND</div>
      <div className="expo-stands">
        {EXPO_STANDS.map((x) => (
          <button key={x.id} className={'expo-stand' + (stand === x.id ? ' on' : '')} onClick={() => setStand(x.id)}>
            <span>{x.icon}</span><b>{x.name}</b><small>×{String(x.mult).replace('.', ',')} · {x.cost ? money(E.standCost(s, x.id)) : 'gratis'}</small>
          </button>
        ))}
      </div>
      <button className="btn-center" disabled={!!why} onClick={() => actions.expoJoin(picks, stand)}>{why || '¡Inscribirme en la Expo!'}</button>
      {lastBox}
    </>
  );
}

export default function CityModal({ s, actions, tab: tab0, onClose }) {
  const [tab, setTab] = useState(tab0 || (s.city?.expo ? 'expo' : 'mapa'));
  return (
    <Modal title="Ciudad" icon="home" onClose={onClose} wide className="city-modal">
      <div className="view-toggle city-tabs">{TABS.map(([k, l]) => <button key={k} className={'seg' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{l}{k === 'expo' && s.city?.expo ? ' •' : ''}</button>)}</div>
      {tab === 'mapa' && <MapTab s={s} />}
      {tab === 'rivales' && <RivalsTab s={s} />}
      {tab === 'expo' && <ExpoTab s={s} actions={actions} />}
    </Modal>
  );
}

// Tira en el taller: Expo abierta o en preparación.
export function ExpoStrip({ s, open }) {
  const e = s.city?.expo;
  if (!e || !E.expoUnlocked(s)) return null;
  const pr = e.state === 'joined' ? E.expoProgress(s) : null;
  return (
    <button className={'expo-strip' + (e.state === 'open' ? ' open' : '')} onClick={() => open('ciudad', null, 'expo')}>
      🎪 {e.state === 'open' ? <><b>¡Expo Maker abierta!</b> Inscribite · {clock(Math.max(0, e.closes - s.time))}</> : <><b>Expo:</b> {clock(Math.max(0, e.ends - s.time))} · {num(pr.score)} puntos</>}
    </button>
  );
}

