// Tablero de pedidos: ofertas para aceptar y pedidos en curso.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { ProductThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { PRODUCTS, MACHINES, TECHS } from '../game/data.js';
import { money, clock, dur } from '../game/format.js';

function Items({ o }) {
  return (
    <div className="o-items">
      {o.items.map((it) => {
        const P = PRODUCTS[it.p];
        return (
          <span key={it.p} className="o-item" title={P.name}>
            <ProductThumb pid={it.p} size={22} />
            <b>{it.done ? `${it.done}/${it.qty}` : `${it.qty}×`}</b> {P.name}
          </span>
        );
      })}
    </div>
  );
}

// Quién es el cliente: confianza, cómo le fue la última vez y qué presupuesto prefiere.
export function ClientLine({ s, name, full = false }) {
  const c = E.clientOf(s, name);
  if (!c.reviews && !full) return <small className="cl-line">{name} · Cliente nuevo</small>;
  const tier = E.clientTier(c.trust);
  const avg = c.reviews ? c.stars / c.reviews : 0;
  const Q = E.QUOTES[c.pref];
  return (
    <small className={'cl-line t-' + tier.name.toLowerCase()} title={`Confianza ${c.trust}/100 · ${c.done} entregados${c.reviews ? ` · reseñas ${avg.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ⭐` : ''}`}>
      {name} · <b>{tier.name}</b>
      <span className="cl-bar"><i style={{ width: `${c.trust}%` }} /></span>
      {c.last != null && <span className="cl-rev">{'★'.repeat(c.last)}<em>{'★'.repeat(5 - c.last)}</em></span>}
      {E.clientKnown(s, name) && <span className="cl-pref" title={`Le gusta el presupuesto ${Q.name.toLowerCase()}: si lo elegís, la confianza sube más`}>prefiere {Q.icon} {Q.name.toLowerCase()}</span>}
    </small>
  );
}

// Botón que repite mientras lo mantenés apretado, cada vez más rápido (trrr).
function HoldBtn({ onStep, disabled, children, ...rest }) {
  const t = useRef(null);
  const stop = () => { clearTimeout(t.current); t.current = null; };
  useEffect(() => stop, []);
  useEffect(() => { if (disabled) stop(); }, [disabled]);
  const start = (e) => {
    if (disabled || (e.button != null && e.button !== 0)) return;
    e.preventDefault();
    onStep();
    let wait = 350;
    const loop = () => { t.current = setTimeout(() => { onStep(); wait = Math.max(25, wait * 0.78); loop(); }, wait); };
    loop();
  };
  return (
    <button {...rest} disabled={disabled} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStep(); } }}>{children}</button>
  );
}

// Puntitos de las etapas del proyecto
function ProjectSteps({ p }) {
  return (
    <div className="o-steps" title={`Etapa ${p.stage + 1} de ${p.n}`}>
      {Array.from({ length: p.n }).map((_, i) => <i key={i} className={i < p.stage ? 'ok' : i === p.stage ? 'cur' : ''} />)}
      {p.earned > 0 && <small>cobrado {money(p.earned)}</small>}
    </div>
  );
}

function Offer({ s, o, actions, glow }) {
  const [qid, setQid] = useState('std');
  const quoting = E.quotable(s, o);
  const qf = quoting ? E.quoteFor(s, o, qid) : null;
  const sug = E.suggestAssign(s, qf && !qf.why ? { ...o, minStars: qf.minStars } : o);
  const canDo = sug.machines.length > 0 && !(qf && qf.why);
  const show = qf && !qf.why ? qf : { reward: o.reward, time: o.time, rep: o.rep, minStars: o.minStars };
  const left = o.expires - s.time;
  let reason = '';
  if (!canDo) {
    const anyCompat = E.orderCompatibleMachines(s, o).length > 0;
    reason = qf?.why ? `${qf.why}. Elegí otro presupuesto.` : anyCompat ? 'Todas tus máquinas compatibles están ocupadas en otros pedidos' : o.minStars > 1 ? `Necesitás una máquina con calidad ★${o.minStars}` : 'Ninguna de tus máquinas puede hacerlo';
  }
  return (
    <div className={'order offer' + (o.urgent ? ' urgent' : '') + (o.contract ? ' contract' : '') + (glow ? ' tut-glow' : '')}>
      {o.contract && <span className="o-badge">{o.project ? 'PROYECTO GRANDE' : o.combo ? 'PEDIDO COMBINADO' : 'CONTRATO DE EMPRESA'}</span>}
      {o.project && <ProjectSteps p={o.project} />}
      <div className="o-head">
        <div className="o-title"><b>{o.title}</b>{o.urgent || o.tpl === 'exposicion' ? <small>{o.client}</small> : <ClientLine s={s} name={o.client} />}</div>
        <button className="o-x" onClick={() => actions.decline(o.id)} aria-label="Rechazar pedido" title="Rechazar"><Icon name="x" size={16} /></button>
      </div>
      {o.flavor && <p className="o-flavor">{o.flavor}</p>}
      <Items o={o} />
      {quoting && (
        <div className="o-quotes" role="radiogroup" aria-label="Presupuesto">
          {E.QUOTE_ORDER.map((k) => {
            const Q = E.QUOTES[k];
            const f = E.quoteFor(s, o, k);
            const pref = E.clientKnown(s, o.client) && E.clientOf(s, o.client).pref === k;
            return (
              <button key={k} role="radio" aria-checked={qid === k} className={'oq' + (qid === k ? ' on' : '') + (f.why ? ' no' : '') + (pref ? ' pref' : '')}
                onClick={() => setQid(k)} title={`${Q.name}: ${Q.blurb}${f.why ? ` (${f.why})` : ''}${pref ? ' · ¡Es el que prefiere este cliente!' : ''}`}>
                <span>{Q.icon}</span>{Q.name}{pref && <i>♥</i>}
              </button>
            );
          })}
        </div>
      )}
      {quoting && qid !== 'std' && <p className="o-qnote">{E.QUOTES[qid].blurb}</p>}
      <div className="o-meta">
        <span title="Plazo una vez aceptado"><Icon name="clock" size={14} /> {dur(show.time)}</span>
        {show.minStars > 1 && <span>Calidad ★{show.minStars}</span>}
        <span className="o-reward">{o.reward ? money(show.reward) : '$0'} · +{show.rep} ⭐{o.tokens ? ` · +${o.tokens} 🎟️` : ''}</span>
      </div>
      {canDo ? (
        <button className="btn-center" onClick={() => actions.accept(o.id, quoting ? qid : 'std')}>
          <Icon name="check" size={18} /> Aceptar{quoting && qid !== 'std' ? ` ${E.QUOTES[qid].name.toLowerCase()}` : ''}{sug.machines.length > 1 ? ` (usa ${sug.machines.length} impresoras)` : ''}
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
  const technologies = Object.values(TECHS).filter((tech) => o.items.some((it) => PRODUCTS[it.p].tech === tech.id));
  const inFlight = s.machines.filter((m) => m.curOrder === o.id && m.state !== 'idle' && m.state !== 'nofil');
  const printing = inFlight.filter((m) => m.state === 'printing').length;
  const ready = inFlight.filter((m) => m.state === 'done').length;
  const covered = o.items.every((it) => it.done + inFlight.filter((m) => m.cur === it.p).length >= it.qty);
  const freeCompat = covered ? 0 : s.machines.filter((m) => !m.orderId && E.orderCompatibleMachines(s, o).includes(m)).length;
  const sug = E.suggestAssign(s, o, left);
  const late = !sug.enough && left < o.time * 0.6;
  return (
    <div className={'order active' + (o.urgent ? ' urgent' : '') + (o.contract ? ' contract' : '')}>
      {o.project && <ProjectSteps p={o.project} />}
      <div className="o-head">
        <div className="o-title"><b>{o.title}</b><small>{o.client}{o.quote && o.quote !== 'std' ? ` · ${E.QUOTES[o.quote].icon} ${E.QUOTES[o.quote].name}` : ''}</small></div>
        <span className={'o-clock' + (left < 60 ? ' hot' : '')}><Icon name="clock" size={14} /> {clock(left)}</span>
      </div>
      <Items o={o} />
      {o.items.length > 1 && <p className="o-hint-sm">Las reservas sobrantes se liberan. Las piezas ya iniciadas siguen perteneciendo a este pedido.</p>}
      <div className="o-time"><i style={{ width: `${Math.max(0, left / o.time) * 100}%` }} /></div>
      <div className="o-assign">
        <span>Reservadas: <b>{mine}</b></span>
        <HoldBtn className="mini-btn" disabled={mine <= 0} onStep={() => actions.assign(o.id, -1)} aria-label="Sacar una impresora" title="Mantené apretado para sacar varias"><Icon name="minus" size={14} /></HoldBtn>
        <HoldBtn className="mini-btn" disabled={freeCompat <= 0} onStep={() => actions.assign(o.id, 1)} aria-label="Sumar una impresora" title="Mantené apretado para sumar varias"><Icon name="plus" size={14} /></HoldBtn>
        {freeCompat > 1 && <button className="mini-btn all-btn" onClick={() => actions.assignAll(o.id)} title="Asignar todas las máquinas libres que sirven para este pedido">Todas ({freeCompat})</button>}
        <span className="o-reward">{o.reward ? money(o.reward) : '$0'} · +{o.rep} ⭐{o.tokens ? ` · +${o.tokens} 🎟️` : ''}</span>
      </div>
      <div className="o-tech-reservations" aria-label="Máquinas reservadas por tecnología">
        {technologies.map((tech) => {
          const count = s.machines.filter((m) => m.orderId === o.id && MACHINES[m.model].tech === tech.id).length;
          return <span key={tech.id} className={count ? '' : 'free'}>{tech.short}: <b>{count}</b>{count === 0 && ' · libres de este pedido'}</span>;
        })}
      </div>
      {inFlight.length > 0 && <p className="o-hint-sm">En proceso: <b>{printing}</b> · Listas para retirar: <b>{ready}</b></p>}
      {!o.turbo && (late || left < o.time * 0.35) && (
        <button className="chip-btn o-turbo" disabled={!!E.orderTurboReason(s, o)} onClick={() => actions.orderTurbo(o.id)}
          title="Suma de golpe el 25 % de las piezas del pedido (una vez por pedido). Idea de SHUNE3D.">⚡ Turbo de pedido · {E.ORDER_TURBO_TOKENS} 🎟️{s.tokens < E.ORDER_TURBO_TOKENS ? ' (te faltan fichas)' : ''}</button>
      )}
      {mine === 0 && !covered && (freeCompat > 0
        ? <p className="o-warn">Sin impresoras asignadas: tocá + (o «Todas») para sumarle.</p>
        : <p className="o-warn">Sin impresoras asignadas: {E.assignBlockReason(s, o)}.</p>)}
      {mine === 0 && covered && <p className="o-hint-sm">No necesita reservar más máquinas: las unidades pendientes ya están en proceso o listas para retirar.</p>}
      {mine > 0 && !covered && freeCompat === 0 && s.machines.some((m) => !m.orderId) && <p className="o-hint-sm">No podés sumar más: {E.assignBlockReason(s, o).toLowerCase()}.</p>}
      {mine > 0 && late && <p className="o-warn soft">Viene justo: sumá otra impresora o cebá un mate.</p>}
    </div>
  );
}

// Mis clientes: los que ya atendiste, ordenados por confianza.
function ClientsList({ s }) {
  const [open, setOpen] = useState(false);
  const list = Object.keys(s.orders.clients || {}).sort((a, b) => E.clientOf(s, b).trust - E.clientOf(s, a).trust);
  return (
    <div className="cl-list">
      <button className="chip-btn" onClick={() => setOpen(!open)}>🤝 Mis clientes ({list.length}) {open ? '▲' : '▼'}</button>
      {open && list.map((n) => {
        const c = E.clientOf(s, n);
        return (
          <div key={n} className="cl-row">
            <ClientLine s={s} name={n} full />
            <small className="cl-stats">{c.done} entregados{E.clientGone(s, n) ? ' · 😠 se fue con otro taller por un rato' : ''}</small>
          </div>
        );
      })}
    </div>
  );
}

export default function Orders({ s, actions, glow, open }) {
  const size = E.boardSize(s);
  const used = s.orders.offers.filter((o) => !o.contract).length + s.orders.active.filter((o) => !o.contract).length;
  const busyMachines = s.machines.filter((m) => m.orderId).length;
  return (
    <section className="card orders-card">
      <div className="card-head">
        <div className="card-icon"><Icon name="clipboard" /></div>
        <h2>Pedidos</h2>
        <span className="slots-chip">{used}/{size}</span>
      </div>
      {/* Controles: liberar todas las máquinas y prender/apagar la aceptación automática */}
      {(busyMachines > 0 || E.has(s, 'gestor') || s.orders.offers.length > 0 || E.investUnlocked(s)) && (
        <div className="o-ctrl">
          {E.investUnlocked(s) && <button className="chip-btn o-inv" onClick={() => open?.('ciudad', null, 'empresa')} title="Contratos de inversión y especialización de tu empresa">💼 Inversiones</button>}
          {s.orders.offers.length > 0 && s.machines.some((m) => !m.orderId) && (
            <button className="chip-btn o-smart" onClick={actions.smartPick} title="Analiza los pedidos del tablero (tiempo con tus máquinas libres, material, plata por minuto) y acepta los que más convienen y llegan a tiempo">🧠 Elegir los mejores</button>
          )}
          {busyMachines > 0 && <button className="chip-btn" onClick={actions.releaseAll} title="Saca todas las máquinas de los pedidos para que las asignes vos">🔓 Liberar máquinas ({busyMachines})</button>}
          {E.has(s, 'gestor') && (
            <label className="ch-toggle o-auto" title="Si lo apagás, el Gestor no acepta pedidos solo: los elegís vos (así no se te pasa ningún pedido especial)">
              <input type="checkbox" checked={s.settings.autoOrders !== false} onChange={(e) => actions.setting('autoOrders', e.target.checked)} />
              <span>🤖 Aceptar pedidos solo</span>
            </label>
          )}
        </div>
      )}
      <div className="o-tech-reservations" aria-label="Máquinas disponibles para otros pedidos">
        <small>Disponibles para asignar:</small>
        {Object.values(TECHS).filter((tech) => s.machines.some((m) => MACHINES[m.model].tech === tech.id)).map((tech) => (
          <span key={tech.id}>{tech.short}: <b>{s.machines.filter((m) => !m.orderId && MACHINES[m.model].tech === tech.id).length}</b></span>
        ))}
      </div>
      {/* Los pedidos tienen su propio scroll: la página no se estira hacia abajo */}
      <div className="orders-scroll">
      {s.orders.active.length > 0 && <div className="section-label">EN CURSO</div>}
      <div className="order-list">
        {s.orders.active.map((o) => <Active key={o.id} s={s} o={o} actions={actions} />)}
      </div>
      {s.orders.offers.length > 0 && <div className="section-label">NUEVOS</div>}
      <div className="order-list">
        {s.orders.offers.map((o, i) => <Offer key={o.id} s={s} o={o} actions={actions} glow={glow === 'orders' && i === 0} />)}
      </div>
      {used === 0 && s.orders.offers.length + s.orders.active.length === 0 && (
        <div className="list-empty">
          {s.tutorial.active && !s.tutorial.orders ? 'Los pedidos llegan en un ratito.' : 'Esperando clientes… llegan solos cada tanto.'}
        </div>
      )}
      </div>
      {used >= size && s.orders.offers.length === 0 && <p className="hint">El tablero está lleno: terminá un pedido para recibir más.</p>}
      <p className="hint">Los pedidos pagan <b>×1,5 a ×5</b> y suman reputación. {E.quotesUnlocked(s) ? <>Elegí el <b>presupuesto</b> (económico, rápido o premium) y cuidá a tus <b>clientes</b>: con más confianza vuelven más seguido y pagan mejor. </> : 'Desde Reputación 3 podés elegir el presupuesto de cada pedido. '}Desde Reputación 5 llegan <b>contratos de empresa</b> que además dan fichas. Mientras no estás, se pausan.</p>
      {Object.keys(s.orders.clients || {}).length > 0 && <ClientsList s={s} />}
    </section>
  );
}
