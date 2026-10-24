// Tablero de pedidos: ofertas para aceptar y pedidos en curso.
import Icon from './Icon.jsx';
import { PieceIcon } from './Pieces.jsx';
import * as E from '../game/engine.js';
import { PRODUCTS } from '../game/data.js';
import { money, clock, dur } from '../game/format.js';

function Items({ o }) {
  return (
    <div className="o-items">
      {o.items.map((it) => {
        const P = PRODUCTS[it.p];
        return (
          <span key={it.p} className="o-item" title={P.name}>
            <PieceIcon shape={P.shape} color={P.color} size={20} />
            <b>{it.done ? `${it.done}/${it.qty}` : `${it.qty}×`}</b> {P.name}
          </span>
        );
      })}
    </div>
  );
}

function Offer({ s, o, actions, glow }) {
  const sug = E.suggestAssign(s, o);
  const canDo = sug.machines.length > 0;
  const left = o.expires - s.time;
  let reason = '';
  if (!canDo) {
    const anyCompat = E.orderCompatibleMachines(s, o).length > 0;
    reason = anyCompat ? 'Todas tus impresoras compatibles están ocupadas en otros pedidos' : o.minStars > 1 ? `Necesitás una impresora con calidad ★${o.minStars}` : 'Ninguna impresora puede hacerlo';
  }
  return (
    <div className={'order offer' + (o.urgent ? ' urgent' : '') + (glow ? ' tut-glow' : '')}>
      <div className="o-head">
        <div className="o-title"><b>{o.title}</b><small>{o.client}{o.frequent ? ' · Cliente frecuente' : ''}</small></div>
        <button className="o-x" onClick={() => actions.decline(o.id)} aria-label="Rechazar pedido" title="Rechazar"><Icon name="x" size={16} /></button>
      </div>
      {o.flavor && <p className="o-flavor">{o.flavor}</p>}
      <Items o={o} />
      <div className="o-meta">
        <span title="Plazo una vez aceptado"><Icon name="clock" size={14} /> {dur(o.time)}</span>
        {o.minStars > 1 && <span>Calidad ★{o.minStars}</span>}
        <span className="o-reward">{o.reward ? money(o.reward) : '$0'} · +{o.rep} ⭐</span>
      </div>
      {canDo ? (
        <button className="btn-center" onClick={() => actions.accept(o.id)}>
          <Icon name="check" size={18} /> Aceptar{sug.machines.length > 1 ? ` (usa ${sug.machines.length} impresoras)` : ''}
        </button>
      ) : <p className="o-warn">{reason}</p>}
      {canDo && !sug.enough && <p className="o-warn soft">Ajustado: con tus impresoras libres quizás no llegás.</p>}
      <div className="o-expire" title="Tiempo para aceptarlo"><i style={{ width: `${Math.max(0, Math.min(1, left / (o.urgent ? 90 : 240))) * 100}%` }} /></div>
    </div>
  );
}

function Active({ s, o, actions }) {
  const left = o.deadline - s.time;
  const mine = s.machines.filter((m) => m.orderId === o.id).length;
  const freeCompat = s.machines.filter((m) => !m.orderId && E.orderCompatibleMachines(s, o).includes(m)).length;
  const sug = E.suggestAssign(s, o, left);
  const late = !sug.enough && left < o.time * 0.6;
  return (
    <div className={'order active' + (o.urgent ? ' urgent' : '')}>
      <div className="o-head">
        <div className="o-title"><b>{o.title}</b><small>{o.client}</small></div>
        <span className={'o-clock' + (left < 60 ? ' hot' : '')}><Icon name="clock" size={14} /> {clock(left)}</span>
      </div>
      <Items o={o} />
      <div className="o-time"><i style={{ width: `${Math.max(0, left / o.time) * 100}%` }} /></div>
      <div className="o-assign">
        <span>Impresoras: <b>{mine}</b></span>
        <button className="mini-btn" disabled={mine <= 0} onClick={() => actions.assign(o.id, -1)} aria-label="Sacar una impresora"><Icon name="minus" size={14} /></button>
        <button className="mini-btn" disabled={freeCompat <= 0} onClick={() => actions.assign(o.id, 1)} aria-label="Sumar una impresora"><Icon name="plus" size={14} /></button>
        <span className="o-reward">{o.reward ? money(o.reward) : '$0'} · +{o.rep} ⭐</span>
      </div>
      {mine === 0 && <p className="o-warn">Sin impresoras asignadas: tocá + para sumar una.</p>}
      {mine > 0 && late && <p className="o-warn soft">Viene justo: sumá otra impresora o cebá un mate.</p>}
    </div>
  );
}

export default function Orders({ s, actions, glow }) {
  const size = E.boardSize(s);
  const used = s.orders.offers.length + s.orders.active.length;
  return (
    <section className="card orders-card">
      <div className="card-head">
        <div className="card-icon"><Icon name="clipboard" /></div>
        <h2>Pedidos</h2>
        <span className="slots-chip">{used}/{size}</span>
      </div>
      {s.orders.active.length > 0 && <div className="section-label">EN CURSO</div>}
      <div className="order-list">
        {s.orders.active.map((o) => <Active key={o.id} s={s} o={o} actions={actions} />)}
      </div>
      {s.orders.offers.length > 0 && <div className="section-label">NUEVOS</div>}
      <div className="order-list">
        {s.orders.offers.map((o, i) => <Offer key={o.id} s={s} o={o} actions={actions} glow={glow === 'orders' && i === 0} />)}
      </div>
      {used === 0 && (
        <div className="list-empty">
          {s.tutorial.active && !s.tutorial.orders ? 'Los pedidos llegan en un ratito.' : 'Esperando clientes… llegan solos cada tanto.'}
        </div>
      )}
      {used >= size && s.orders.offers.length === 0 && <p className="hint">El tablero está lleno: terminá un pedido para recibir más.</p>}
      <p className="hint">Los pedidos pagan <b>x1,5 a x5</b> y suman reputación. Mientras no estás, se pausan.</p>
    </section>
  );
}
