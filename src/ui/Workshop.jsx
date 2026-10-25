// El taller: vista 3D (o lista) + eventos globales + barra de ingreso.
import { useState } from 'react';
import Icon from './Icon.jsx';
import Scene3D from './Scene3D.jsx';
import { MachineThumb, ProductThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { MACHINES, PRODUCTS, SPACES, MACHINE_EVENTS, GLOBAL_EVENTS, FLOORS, FLOOR_SLOTS } from '../game/data.js';
import FloorTabs from './FloorTabs.jsx';
import { ExpoStrip } from './City.jsx';
import { money, rate, dur, clock, fmtText } from '../game/format.js';
import { currentMission } from '../game/progress.js';

function Stars({ n }) {
  return <span className="stars" aria-label={`Calidad ${n} de 5`}>{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;
}

function bayStatus(s, m) {
  if (m.waitStart) return { k: 'start', t: '▶ Imprimir' };
  if (m.event) return { k: 'event', t: `${MACHINE_EVENTS[m.event.id].icon} ${MACHINE_EVENTS[m.event.id].name}` };
  if (m.state === 'done') return { k: 'done', t: '¡Lista! Tocá para retirar' };
  if (m.state === 'nofil') return { k: 'nofil', t: `Sin ${PRODUCTS[m.product]?.mat || 'material'}` };
  if (s.global?.id === 'corte' && m.state === 'printing') return { k: 'event', t: '🔌 Sin luz' };
  if (m.pauseUntil > s.time) return { k: 'pause', t: `En pausa · ${Math.ceil(m.pauseUntil - s.time)} s` };
  if (m.state === 'printing') return { k: 'print', t: `Trabajando · ${dur((m.need - m.progress) / E.machineSpeed(s, m))}` };
  return { k: 'idle', t: 'Sin trabajo' };
}

function Bay({ s, m, floats, onTap, onGear, glow }) {
  const M = MACHINES[m.model];
  const st = bayStatus(s, m);
  const pid = m.cur || m.product;
  const p = m.state === 'done' ? 1 : m.need ? m.progress / m.need : 0;
  return (
    <div className={`bay st-${st.k}` + (glow ? ' tut-glow' : '')}>
      <button className="bay-hit" onClick={() => onTap(m)} aria-label={`${M.brand} ${M.name}: ${st.t}`}>
        <MachineThumb model={m.model} />
        {st.k === 'start' && <span className="bay-start">▶ Imprimir</span>}
        {st.k === 'event' && m.event && <span className="bay-alert">!</span>}
      </button>
      <button className="bay-gear" onClick={() => onGear(m)} aria-label="Configurar máquina" title="Configurar"><Icon name="settings" size={16} /></button>
      {m.orderId && <span className="bay-order">📋 Pedido</span>}
      <div className="bay-info">
        <div className="bay-name"><b>{M.brand} {M.name}</b><Stars n={E.machineStars(s, m)} /></div>
        <div className="bay-prod"><ProductThumb pid={pid} size={20} /><span>{PRODUCTS[pid]?.name || '—'}</span></div>
        <div className="bay-bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
        <div className={'bay-status s-' + st.k}>{st.t}</div>
      </div>
      {floats.map((f) => <span key={f.id} className={'float float-' + f.kind}>{f.text}</span>)}
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
    buttons = <button className="btn-apply" disabled={wait > 0} onClick={() => actions.resolveGlobal(0)}>{wait > 0 ? `Esperando la luz… ${Math.ceil(wait)} s` : (E.upsActive(s) ? 'Reanudar (sin perder nada)' : 'Reanudar (las piezas se reinician)')}</button>;
  } else if (g.id === 'cambio') {
    const o = s.orders.active.find((x) => x.id === g.oid);
    buttons = <><button className="btn-apply" onClick={() => actions.resolveGlobal(0)}>Aceptar: +30 % piezas, +40 % pago</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>Rechazar</button>{o && <small className="g-note">Pedido: {o.title}</small>}</>;
  } else if (g.id === 'favor') {
    buttons = <><button className="btn-apply" onClick={() => actions.resolveGlobal(0)}>Hacerlo (+1 ⭐)</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>«Estoy a full»</button></>;
  } else if (g.id === 'viral') {
    buttons = <button className="btn-apply" onClick={() => actions.resolveGlobal(0)}>¡Aprovechar! Precios ×2 por 3 min</button>;
  } else if (g.id === 'misteriosa') {
    buttons = <><button className="btn-apply" disabled={s.money < g.price} onClick={() => actions.resolveGlobal(0)}>Comprar 2 bobinas por {money(g.price)}</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>Paso</button><small className="g-note">Ojo: 10 min con el doble de problemas.</small></>;
  } else if (g.id === 'feria') {
    buttons = <><button className="btn-apply" disabled={s.money < g.price} onClick={() => actions.resolveGlobal(0)}>Armar el stand ({money(g.price)})</button><button className="btn-export" onClick={() => actions.resolveGlobal(1)}>Este finde no</button></>;
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

function ChallengeStrip({ s, open }) {
  const cp = E.challengeProgress(s);
  if (!cp) return null;
  return (
    <button className="challenge-strip" onClick={() => open('desafios')}>
      <span className="cs-tag">DESAFÍO</span>
      <b>{cp.def.name}</b>
      <span className="cs-rule">{cp.def.rule}</span>
      <span className="cs-goal">Meta: {fmtText(cp.def.goalText)}{cp.parts.map((p) => (p.frac != null && !p.done ? ` (${Math.floor(p.frac * 100)} %)` : '')).join('')}</span>
    </button>
  );
}

export default function Workshop({ s, actions, floats, onMachine, onEvent, goShop, glow, open, podium, gifts }) {
  const sp = SPACES[s.space];
  const floors = E.hasFloors(s);
  const floor = floors ? (s.settings.floor || 'fdm') : null;
  const shown = floors ? E.floorMachines(s, floor) : s.machines;
  const cap = floors ? FLOOR_SLOTS : sp.slots;
  const free = cap - shown.length;
  const mission = currentMission(s);
  const [fail3d, setFail3d] = useState(false);
  const view = fail3d ? 'lista' : s.settings.view === 'lista' ? 'lista' : '3d';
  const mateReady = s.time >= s.mate.ready && !E.rule(s, 'sinmate');
  const mateOn = E.mateActive(s);
  const trendOn = s.trend.p && s.time < s.trend.until;
  const r = E.incomeRate(s);
  const onTap = (m) => {
    if (m.waitStart) actions.start(m.id);
    else if (m.state === 'done') actions.retrieve(m.id);
    else if (m.event) onEvent(m);
    else onMachine(m);
  };
  return (
    <section className="card main-card" data-tab="taller">
      <div className="card-head">
        <div className="card-icon"><Icon name="factory" /></div>
        <div className="head-txt"><h2>{sp.name}</h2><small>{sp.blurb}</small></div>
        <div className="view-toggle mini-toggle">
          <button className={'seg' + (view === '3d' ? ' active' : '')} disabled={fail3d} onClick={() => actions.setting('view', '3d')}>3D</button>
          <button className={'seg' + (view === 'lista' ? ' active' : '')} onClick={() => actions.setting('view', 'lista')}>Lista</button>
        </div>
        <span className="slots-chip" title={floors ? `Piso ${FLOORS.find((f) => f.id === floor).long} · ${s.machines.length} máquinas en toda la nave` : ''}>{shown.length}/{cap}</span>
      </div>
      <ChallengeStrip s={s} open={open} />
      <ExpoStrip s={s} open={open} />
      {mission.id !== 'libre' && (
        <div className={'mission-strip' + (s.tutorial.active ? ' tut' : '')}>
          <Icon name="target" size={16} /><span><b>{s.tutorial.active ? 'TUTORIAL' : 'MISIÓN'}</b> {fmtText(mission.text)}</span>
          {mission.reward && <em>{mission.reward.money ? '+' + money(mission.reward.money) : mission.reward.tokens ? `+${mission.reward.tokens} 🎟️` : '+1 ' + (mission.reward.spool === 'PLA' || mission.reward.spool === 'PETG' ? 'bobina' : 'unidad')}</em>}
        </div>
      )}
      <div className="scene-wrap">
        <GlobalBanner s={s} actions={actions} />
        {view === '3d' ? (
          <Scene3D s={s} actions={actions} floats={floats} onTap={onTap} onEmpty={() => goShop('machines')} onFail={() => setFail3d(true)} glow={glow} onFeedback={() => open('sugerencias')} podium={podium} gifts={gifts} />
        ) : (
          <>
          <button className="scene-fb static" title="Mandanos una idea o contanos si algo anda mal" onClick={() => open('sugerencias')}><Icon name="message" size={16} /> Sugerencias</button>
          <div className="bays">
            {shown.map((m) => (
              <Bay key={m.id} s={s} m={m} floats={floats.filter((f) => f.mid === m.id)} onTap={onTap} onGear={onMachine}
                glow={glow === 'machine' && (m.waitStart || m.state === 'done' || m.event)} />
            ))}
            {Array.from({ length: Math.max(0, free) }).map((_, i) => (
              <button key={'free' + i} className={'bay bay-empty' + (glow === 'shop-machines' && i === 0 ? ' tut-glow' : '')} onClick={() => goShop('machines')}>
                <Icon name="plus" size={26} /><span>Lugar libre</span><small>Comprar máquina</small>
              </button>
            ))}
          </div>
          </>
        )}
      </div>
      <FloorTabs s={s} actions={actions} />
      {view === '3d' && shown.length > 0 && (
        <div className={'machine-strip' + (s.settings.stripHidden ? ' hid' : '')}>
          {/* Ojito: muestra u oculta todos los accesos a las máquinas de una */}
          <button className="chip-m strip-eye" onClick={() => actions.setting('stripHidden', !s.settings.stripHidden)}
            title={s.settings.stripHidden ? 'Mostrar la lista de máquinas' : 'Ocultar la lista de máquinas'}>
            <Icon name={s.settings.stripHidden ? 'eyeOff' : 'eye'} size={14} />
            {s.settings.stripHidden ? `Mostrar máquinas (${shown.length})` : 'Ocultar'}
          </button>
          {!s.settings.stripHidden && shown.map((m) => {
            const st = bayStatus(s, m);
            const M = MACHINES[m.model];
            return (
              <button key={m.id} className={'chip-m st-' + st.k} onClick={() => onMachine(m)} title="Configurar">
                <i />{M.brand === 'Bambu Lab' ? 'Bambu' : M.brand} {M.name}<Icon name="settings" size={12} />
              </button>
            );
          })}
        </div>
      )}
      <div className="result-bar">
        <div className="rb-status">
          <span className="result-label">INGRESO</span>
          <span className="result-main">{rate(r)}</span>
        </div>
        <div className="rb-stats">
          <div><span>Piezas</span><b>{s.run.pieces.toLocaleString('es-AR')}</b></div>
          {trendOn && <div className="trend"><span>Tendencia ×2</span><b>{PRODUCTS[s.trend.p].name} · {clock(s.trend.until - s.time)}</b></div>}
          {s.time < s.boost.viral && <div className="trend"><span>Viral ×2</span><b>{clock(s.boost.viral - s.time)}</b></div>}
          {s.time < s.boost.turbo && <div className="trend"><span>Turbo ×2</span><b>{clock(s.boost.turbo - s.time)}</b></div>}
          {s.time < s.boost.feria && <div className="trend"><span>Feria ×1,5</span><b>{clock(s.boost.feria - s.time)}</b></div>}
        </div>
        <div className="rb-actions">
          <button className="btn-apply stats-btn" onClick={() => open('stats')} title="Estadísticas del taller">📊</button>
          <button className={'btn-apply mate-btn' + (mateOn ? ' on' : '') + (glow === 'mate' && mateReady ? ' tut-glow' : '')}
            disabled={!mateReady} onClick={actions.mate} title="Atajo: M">
            🧉 {E.rule(s, 'sinmate') ? 'Sin mate (desafío)' : mateOn ? `Mate activo · ${Math.ceil(s.mate.until - s.time)} s` : mateReady ? `Cebar mate (+${Math.round((E.mateBoost(s) - 1) * 100)} %)` : `Mate en ${clock(s.mate.ready - s.time)}`}
          </button>
        </div>
      </div>
    </section>
  );
}
