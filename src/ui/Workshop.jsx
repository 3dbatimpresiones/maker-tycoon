// El taller: escena que cambia con cada espacio + impresoras + barra de ingreso.
import Icon from './Icon.jsx';
import MachineArt from './MachineArt.jsx';
import { PieceIcon } from './Pieces.jsx';
import * as E from '../game/engine.js';
import { MACHINES, PRODUCTS, SPACES, MATERIALS, MACHINE_EVENTS, GLOBAL_EVENTS, LED_COLORS } from '../game/data.js';
import { money, rate, dur, clock } from '../game/format.js';
import { currentMission } from '../game/progress.js';

function Stars({ n }) {
  return <span className="stars" aria-label={`Calidad ${n} de 5`}>{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;
}

function bayStatus(s, m) {
  const blackout = s.global?.id === 'corte';
  if (m.waitStart) return { k: 'start', t: '▶ Imprimir' };
  if (m.event) return { k: 'event', t: `${MACHINE_EVENTS[m.event.id].icon} ${MACHINE_EVENTS[m.event.id].name}` };
  if (m.state === 'done') return { k: 'done', t: '¡Lista! Tocá para retirar' };
  if (m.state === 'nofil') return { k: 'nofil', t: `Sin ${PRODUCTS[m.product]?.mat || 'filamento'}` };
  if (blackout && m.state === 'printing') return { k: 'event', t: '🔌 Sin luz' };
  if (m.pauseUntil > s.time) return { k: 'pause', t: `Secando bobina · ${Math.ceil(m.pauseUntil - s.time)} s` };
  if (m.state === 'printing') {
    const left = (m.need - m.progress) / E.machineSpeed(s, m);
    return { k: 'print', t: `Imprimiendo · ${dur(left)}` };
  }
  return { k: 'idle', t: 'Sin trabajo' };
}

function Bay({ s, m, floats, onTap, onGear, glow }) {
  const M = MACHINES[m.model];
  const st = bayStatus(s, m);
  const run = st.k === 'print' && s.settings.anim !== 'min';
  const pid = m.cur || m.product;
  const P = PRODUCTS[pid];
  const p = m.state === 'done' ? 1 : m.need ? m.progress / m.need : 0;
  const order = m.orderId && s.orders.active.find((o) => o.id === m.orderId);
  return (
    <div className={`bay st-${st.k}` + (glow ? ' tut-glow' : '')}>
      <button className="bay-hit" onClick={() => onTap(m, st.k)} aria-label={`${M.name}: ${st.t}`}>
        <MachineArt m={m} run={run} ev={m.event?.id} />
        {st.k === 'start' && <span className="bay-start">▶ Imprimir</span>}
        {st.k === 'event' && m.event && <span className="bay-alert">!</span>}
      </button>
      <button className="bay-gear" onClick={() => onGear(m)} aria-label="Configurar impresora" title="Configurar"><Icon name="settings" size={16} /></button>
      {order && <span className="bay-order" title={order.title}>📋 Pedido</span>}
      <div className="bay-info">
        <div className="bay-name"><b>{M.name}</b><Stars n={E.machineStars(s, m)} /></div>
        <div className="bay-prod">{P && <PieceIcon shape={P.shape} color={P.color} size={18} />}<span>{P?.name || '—'}</span></div>
        <div className="bay-bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
        <div className={'bay-status s-' + st.k}>{st.t}</div>
      </div>
      {floats.map((f) => <span key={f.id} className={'float float-' + f.kind}>{f.text}</span>)}
    </div>
  );
}

// Decoración del espacio (cambia con cada mudanza).
function Deco({ space }) {
  return (
    <svg className="scene-deco" viewBox="0 0 800 200" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      {space === 0 && <>
        <rect x="200" y="8" width="64" height="30" rx="5" fill="rgba(247,142,182,.12)" stroke="rgba(247,142,182,.35)" />
        <text x="232" y="28" textAnchor="middle" fontSize="13" fontWeight="800" fill="rgba(247,142,182,.7)">MAKE</text>
        <circle cx="300" cy="22" r="4" fill="rgba(93,218,219,.4)" /><circle cx="316" cy="26" r="3" fill="rgba(247,142,182,.4)" />
        <path d="M60 30 L100 70 L80 74 Z" fill="rgba(255,214,140,.35)" />
        <line x1="80" y1="0" x2="80" y2="30" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
        <path d="M40 74 L120 74 L160 190 L0 190 Z" fill="rgba(255,214,140,.05)" />
      </>}
      {space === 1 && <>
        <rect className="led-strip" x="0" y="6" width="800" height="4" />
        <rect x="560" y="40" width="200" height="12" rx="3" fill="rgba(52,55,162,.5)" />
        <rect x="560" y="100" width="200" height="12" rx="3" fill="rgba(52,55,162,.5)" />
      </>}
      {space === 2 && <>
        <rect className="led-strip" x="0" y="6" width="800" height="4" />
        <rect x="40" y="30" width="260" height="130" rx="8" fill="rgba(52,55,162,.22)" stroke="rgba(255,255,255,.08)" />
        {Array.from({ length: 6 }).map((_, r) => Array.from({ length: 12 }).map((__, c) => <circle key={r + '-' + c} cx={60 + c * 20} cy={48 + r * 20} r="2" fill="rgba(255,255,255,.12)" />))}
        <path d="M80 70 l30 0 l0 8 l-30 0 z M150 60 l6 50 l-12 0 z M200 64 a14 14 0 1 0 1 0 z" fill="rgba(93,218,219,.35)" />
        <circle cx="700" cy="70" r="40" fill="rgba(19,29,71,.7)" stroke="rgba(255,255,255,.15)" strokeWidth="3" />
        <g className="deco-fan" style={{ transformOrigin: '700px 70px' }}><path d="M700 34 L708 70 L692 70 Z M700 106 L692 70 L708 70 Z M664 70 L700 62 L700 78 Z M736 70 L700 78 L700 62 Z" fill="rgba(93,218,219,.4)" /></g>
      </>}
      {space === 3 && <>
        <rect className="led-strip" x="0" y="6" width="800" height="4" />
        <rect x="30" y="24" width="300" height="150" rx="10" fill="rgba(93,218,219,.05)" stroke="rgba(93,218,219,.3)" strokeWidth="2" />
        <line x1="180" y1="24" x2="180" y2="174" stroke="rgba(93,218,219,.2)" strokeWidth="2" />
        <text className="neon" x="600" y="100" textAnchor="middle" fontSize="54" fontWeight="800">3DBAT</text>
        <text x="600" y="130" textAnchor="middle" fontSize="13" fontWeight="700" fill="rgba(93,218,219,.75)" letterSpacing="4">IMPRESIONES</text>
      </>}
    </svg>
  );
}

function SpoolShelf({ s }) {
  const mats = Object.keys(MATERIALS).filter((m) => E.materialUnlocked(s, m) || s.fil[m] > 0);
  return (
    <div className="shelf" aria-hidden="true">
      {mats.map((mat) => {
        const n = Math.min(6, Math.ceil(s.fil[mat] / 1000));
        const lastFrac = s.fil[mat] <= 0 ? 0 : ((s.fil[mat] - 1) % 1000 + 1) / 1000;
        return Array.from({ length: Math.max(n, 0) }).map((_, i) => {
          const f = i === n - 1 ? lastFrac : 1;
          return (
            <svg key={mat + i} className="spool" viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="11" fill="#1a2560" stroke="rgba(255,255,255,.25)" />
              <circle cx="12" cy="12" r={4 + 6 * f} fill={MATERIALS[mat].color} opacity=".9" />
              <circle cx="12" cy="12" r="3" fill="#0d1433" />
            </svg>
          );
        });
      })}
    </div>
  );
}

function GlobalBanner({ s, actions }) {
  const g = s.global;
  if (!g) return null;
  const G = GLOBAL_EVENTS[g.id];
  const left = Math.max(0, g.since + 60 - s.time);
  let buttons = null;
  if (g.id === 'corte') {
    const wait = Math.max(0, g.since + 8 - s.time);
    buttons = <button className="btn-apply" disabled={wait > 0} onClick={() => actions.resolveGlobal(0)}>{wait > 0 ? `Esperando la luz… ${Math.ceil(wait)} s` : (E.has(s, 'ups') ? 'Reanudar (sin perder nada)' : 'Reanudar (las piezas se reinician)')}</button>;
  } else if (g.id === 'cambio') {
    const o = s.orders.active.find((x) => x.id === g.oid);
    buttons = <><button className="btn-apply" onClick={() => actions.resolveGlobal(0)}>Aceptar: +30 % piezas, +40 % pago</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>Rechazar</button>{o && <small className="g-note">Pedido: {o.title}</small>}</>;
  } else if (g.id === 'favor') {
    buttons = <><button className="btn-apply" onClick={() => actions.resolveGlobal(0)}>Hacerlo (+1 ⭐)</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>«Estoy a full»</button></>;
  } else if (g.id === 'viral') {
    buttons = <button className="btn-apply" onClick={() => actions.resolveGlobal(0)}>¡Aprovechar! Precios x2 por 3 min</button>;
  } else if (g.id === 'misteriosa') {
    buttons = <><button className="btn-apply" disabled={s.money < g.price} onClick={() => actions.resolveGlobal(0)}>Comprar 2 bobinas por {money(g.price)}</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>Paso</button><small className="g-note">Ojo: 10 min con el doble de problemas.</small></>;
  }
  return (
    <div className={'g-banner g-' + g.id} role="alert">
      <div className="g-ico">{G.icon}</div>
      <div className="g-txt"><b>{G.name}</b><span>{G.text}</span></div>
      <div className="g-btns">{buttons}</div>
      {g.id !== 'corte' && <div className="g-timer"><i style={{ width: `${(left / 60) * 100}%` }} /></div>}
    </div>
  );
}

export default function Workshop({ s, actions, floats, onMachine, onEvent, goShop, glow }) {
  const sp = SPACES[s.space];
  const free = sp.slots - s.machines.length;
  const mission = currentMission(s);
  const led = LED_COLORS[s.settings.led]?.color || LED_COLORS.cyan.color;
  const mateReady = s.time >= s.mate.ready;
  const mateOn = E.mateActive(s);
  const trendOn = s.trend.p && s.time < s.trend.until;
  const r = E.incomeRate(s);
  const onTap = (m, k) => {
    if (k === 'start') actions.start(m.id);
    else if (k === 'done') actions.retrieve(m.id);
    else if (k === 'event') onEvent(m);
    else onMachine(m);
  };
  return (
    <section className="card main-card" data-tab="taller">
      <div className="card-head">
        <div className="card-icon"><Icon name="factory" /></div>
        <div className="head-txt"><h2>{sp.name}</h2><small>{sp.blurb}</small></div>
        <span className="slots-chip">{s.machines.length}/{sp.slots} lugares</span>
      </div>
      {mission.id !== 'libre' && (
        <div className={'mission-strip' + (s.tutorial.active ? ' tut' : '')}>
          <Icon name="target" size={16} /><span><b>{s.tutorial.active ? 'TUTORIAL' : 'MISIÓN'}</b> {mission.text}</span>
          {mission.reward && <em>{mission.reward.money ? '+' + money(mission.reward.money) : '+1 bobina'}</em>}
        </div>
      )}
      <div className={`scene sp-${sp.id} anim-${s.settings.anim}`} style={{ '--led': led }}>
        <Deco space={s.space} />
        <SpoolShelf s={s} />
        <GlobalBanner s={s} actions={actions} />
        <div className={`bays cols-${sp.slots}`}>
          {s.machines.map((m) => (
            <Bay key={m.id} s={s} m={m} floats={floats.filter((f) => f.mid === m.id)} onTap={onTap} onGear={onMachine}
              glow={glow === 'machine' && (m.waitStart || m.state === 'done' || m.event)} />
          ))}
          {Array.from({ length: Math.max(0, free) }).map((_, i) => (
            <button key={'free' + i} className={'bay bay-empty' + (glow === 'shop-machines' && i === 0 ? ' tut-glow' : '')} onClick={() => goShop('machines')}>
              <Icon name="plus" size={26} /><span>Lugar libre</span><small>Comprar impresora</small>
            </button>
          ))}
        </div>
      </div>
      <div className="result-bar">
        <div className="rb-status">
          <span className="result-label">INGRESO</span>
          <span className="result-main">{rate(r)}</span>
        </div>
        <div className="rb-stats">
          <div><span>Piezas</span><b>{s.run.pieces.toLocaleString('es-AR')}</b></div>
          <div><span>Velocidad</span><b>×{E.speedMult(s, 'kit').toLocaleString('es-AR', { maximumFractionDigits: 2 })}</b></div>
          {trendOn && <div className="trend"><span>Tendencia ×2</span><b>{PRODUCTS[s.trend.p].name} · {clock(s.trend.until - s.time)}</b></div>}
          {s.time < s.boost.viral && <div className="trend"><span>Viral ×2</span><b>{clock(s.boost.viral - s.time)}</b></div>}
        </div>
        <div className="rb-actions">
          <button className={'btn-apply mate-btn' + (mateOn ? ' on' : '') + (glow === 'mate' && mateReady ? ' tut-glow' : '')}
            disabled={!mateReady} onClick={actions.mate} title="Atajo: M">
            🧉 {mateOn ? `Mate activo · ${Math.ceil(s.mate.until - s.time)} s` : mateReady ? 'Cebar mate (+50 %)' : `Mate en ${clock(s.mate.ready - s.time)}`}
          </button>
        </div>
      </div>
    </section>
  );
}
