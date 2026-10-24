// Ventanas (modales) del juego.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { MachineThumb, ProductThumb } from './Thumb.jsx';
import { BatiArt, CtaButtons } from './Bati.jsx';
import * as E from '../game/engine.js';
import {
  MACHINES, PRODUCTS, PRODUCT_ORDER, MACHINE_EVENTS, PERKS, LED_COLORS, SPACES, SIZE_NAME, MATERIALS,
  MASTERY_CHALLENGES, TOKEN_SHOP, BRAND_DISCLAIMER,
} from '../game/data.js';
import { ACHIEVEMENTS } from '../game/progress.js';
import { money, rate, dur, num, fmtText, SEASON } from '../game/format.js';
import { LINKS, IG_HANDLE, VERSION } from '../config.js';
import { FILACOLOR, fcUrl } from '../online/filacolor.js';

const FlagAR = () => (
  <svg className="flag" viewBox="0 0 18 12" width="18" height="12" aria-hidden="true">
    <rect width="18" height="12" rx="2" fill="#74ACDF" /><rect y="4" width="18" height="4" fill="#ffffff" /><circle cx="9" cy="6" r="1.4" fill="#F6B40E" />
  </svg>
);
const Globe = () => (
  <svg className="flag" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20" />
  </svg>
);
export function CurrencyToggle({ s, actions, compact = false }) {
  const cur = s.settings.currency || 'ARS';
  return (
    <div className={'view-toggle cur-toggle' + (compact ? ' compact' : '')} role="group" aria-label="Moneda">
      <button className={'seg' + (cur === 'ARS' ? ' active' : '')} onClick={() => actions.setting('currency', 'ARS')} title="Pesos argentinos"><FlagAR /> ARS</button>
      <button className={'seg' + (cur === 'USD' ? ' active' : '')} onClick={() => actions.setting('currency', 'USD')} title="Dólares (conversión de la temporada)"><Globe /> USD</button>
    </div>
  );
}

export function Modal({ title, icon, onClose, children, wide, className = '' }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '') + ' ' + className} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          {icon && <div className="card-icon"><Icon name={icon} /></div>}
          <h2>{title}</h2>
          <button className="icon-btn sm" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Mastery({ s, pid }) {
  const mi = E.masteryInfo(s, pid);
  return (
    <span className="mastery" title={`Experiencia: ${num(mi.count)} piezas hechas. Próximo nivel a las ${num(mi.next)}. Cada nivel: +12 % de precio.`}>
      Exp. {mi.lvl}<i><b style={{ width: `${Math.round(Math.max(0, Math.min(1, mi.frac)) * 100)}%` }} /></i>
    </span>
  );
}

// ---------- Panel de una máquina ----------
export function MachinePanel({ s, m, actions, onClose }) {
  const [sure, setSure] = useState(false);
  if (!m) return null;
  const M = MACHINES[m.model];
  const order = m.orderId && s.orders.active.find((o) => o.id === m.orderId);
  const refund = Math.round((m.paid || 0) * 0.5);
  const prods = PRODUCT_ORDER.filter((pid) => PRODUCTS[pid].tech === M.tech);
  return (
    <Modal title={`${M.brand} ${M.name}`} icon="printer" onClose={onClose} wide>
      <div className="mp-grid">
        <div className="mp-art"><MachineThumb model={m.model} /></div>
        <div>
          <p className="mp-flavor">{M.flavor}</p>
          <div className="rb-stats mp-stats">
            <div><span>Velocidad</span><b>×{E.machineSpeed(s, m).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</b></div>
            <div><span>Calidad</span><b>★{E.machineStars(s, m)}</b></div>
            <div><span>Cama</span><b>{SIZE_NAME[M.size]}</b></div>
            <div><span>Fallas</span><b>{Math.round(M.fail * 1000) / 10} %</b></div>
            <div><span>Ganancia</span><b>{rate(E.productRate(s, m, m.product))}</b></div>
          </div>
          <div className="shop-stats mp-tags">
            {M.enclosed && <span>Cerrada</span>}
            {E.isMulti(s, M) ? <span className="c-pink">Multicolor</span> : M.amsable && <span>Admite multicolor</span>}
            {M.autolevel && <span>Autonivelado</span>}
          </div>
          {order && (
            <div className="mp-order">
              📋 Trabajando para <b>{order.title}</b>. Después vuelve a su producto.
              <button className="chip-btn" onClick={() => actions.assign(order.id, -1)}>Liberar</button>
            </div>
          )}
        </div>
      </div>
      <div className="section-label">¿QUÉ FABRICA?</div>
      <div className="list prod-list">
        {prods.map((pid) => {
          const P = PRODUCTS[pid];
          const why = E.machineCantReason(s, m, pid);
          const can = !why;
          const active = m.product === pid;
          return (
            <button key={pid} className={'list-row' + (active ? ' active' : '') + (can ? '' : ' disabled')} disabled={!can} onClick={() => actions.setProduct(m.id, pid)}>
              {active ? <span className="dot" /> : <span className="dot off" />}
              <ProductThumb pid={pid} size={34} dim={!can} />
              <span className="meta"><b>{P.name}</b> · {MATERIALS[P.mat].name} · {P.size}{P.multi ? ' · multicolor' : ''}{E.trendActive(s, pid) ? ' · 📈 ×2' : ''}<br />
                {can ? <>{money(E.pieceValue(s, pid, E.machineStars(s, m)))} c/u · {dur(P.time / E.machineSpeed(s, m, false))} · <b className="c-cyan">{rate(E.productRate(s, m, pid))}</b></> : <><Icon name="lock" size={12} /> {why}</>}
              </span>
              {(s.mastery[pid] || 0) > 0 && <Mastery s={s} pid={pid} />}
            </button>
          );
        })}
      </div>
      <p className="hint">La <b>experiencia</b> de cada producto sube cuanto más lo fabricás y no se pierde al mudarte: cada nivel paga +12 %.</p>
      <div className="mp-sell">
        {s.settings.view !== 'lista' && <button className="chip-btn" onClick={() => { window.dispatchEvent(new CustomEvent('mt-focus', { detail: m.id })); onClose(); }}>🔍 Ver de cerca en el taller</button>}
        {s.machines.length > 1 && (!sure
          ? <button className="danger-btn" onClick={() => setSure(true)}><Icon name="trash" size={16} /> Vender (recuperás {money(refund)})</button>
          : <div className="confirm-row"><span>¿Seguro? La pieza en curso se pierde.</span>
            <button className="danger-btn solid" onClick={() => { actions.sellMachine(m.id); onClose(); }}>Sí, vender</button>
            <button className="chip-btn" onClick={() => setSure(false)}>No</button></div>)}
      </div>
    </Modal>
  );
}

// ---------- Resolver un problema ----------
function HoldButton({ label, onDone }) {
  const [p, setP] = useState(0);
  const t = useRef(null);
  const start = () => {
    const t0 = performance.now();
    clearInterval(t.current);
    t.current = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / 1200);
      setP(f);
      if (f >= 1) { clearInterval(t.current); onDone(); }
    }, 30);
  };
  const stop = () => { clearInterval(t.current); setP((x) => (x >= 1 ? x : 0)); };
  useEffect(() => () => clearInterval(t.current), []);
  return (
    <button className="btn-center hold-btn" onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(); }} onKeyUp={stop}>
      <i style={{ width: `${p * 100}%` }} /><span>{label}</span>
    </button>
  );
}
function TapsButton({ label, n, onDone }) {
  const [k, setK] = useState(0);
  return (
    <button className="btn-center taps-btn" onClick={() => { const nk = k + 1; setK(nk); if (nk >= n) onDone(); }}>
      <span className="taps">{Array.from({ length: n }).map((_, i) => <i key={i} className={i < k ? 'on' : ''} />)}</span>
      {label}
    </button>
  );
}
export function EventModal({ s, m, actions, onClose }) {
  if (!m || !m.event) return null;
  const ev = MACHINE_EVENTS[m.event.id];
  const M = MACHINES[m.model];
  const done = (i) => { actions.resolve(m.id, i); onClose(); };
  return (
    <Modal title={`${ev.icon} ${ev.name}`} onClose={onClose} className="ev-modal">
      <div className="ev-top">
        <BatiArt mood={ev.cute ? 'wink' : 'worried'} size={70} />
        <div>
          <p className="ev-text">{ev.text}</p>
          <small className="muted">{M.brand} {M.name}</small>
        </div>
      </div>
      <div className="ev-opts">
        {ev.options.map((o, i) => {
          if (o.act === 'hold') return <HoldButton key={i} label={o.label} onDone={() => done(i)} />;
          if (o.act === 'taps') return <TapsButton key={i} label={o.label} n={o.n} onDone={() => done(i)} />;
          return <button key={i} className={i === 0 ? 'btn-center' : 'btn-alt'} onClick={() => done(i)}>{o.label}</button>;
        })}
      </div>
      <p className="hint">Cómo evitarlo: <b>{ev.prevent}</b></p>
      {!ev.cute && <p className="hint fc-hint">¿Te pasa con tu impresora de verdad? <a href={fcUrl(FILACOLOR.links.servicio)} target="_blank" rel="noopener noreferrer">Servicio técnico de Filacolor ↗</a>, el proveedor oficial de la comunidad.</p>}
    </Modal>
  );
}

// ---------- Mientras no estabas ----------
export function OfflineModal({ r, onClose }) {
  if (!r) return null;
  return (
    <Modal title="Mientras no estabas" icon="clock" onClose={onClose} className="offline-modal">
      <div className="ev-top">
        <BatiArt mood="happy" size={80} />
        <p className="ev-text">Estuviste afuera <b>{dur(r.secs)}</b>. Yo me quedé cuidando el taller{r.fixed ? ` y resolví ${r.fixed} problema${r.fixed > 1 ? 's' : ''}` : ''}.</p>
      </div>
      <div className="off-big">+{money(r.earned)}</div>
      <div className="rb-stats off-stats">
        <div><span>Piezas</span><b>{num(r.pieces)}</b></div>
        <div><span>Rendimiento</span><b>{Math.round(r.eff * 100)} %</b></div>
        {r.spools > 0 && <div><span>Materiales comprados</span><b>{r.spools}</b></div>}
        {r.repGain > 0 && <div><span>Reputación (gestor)</span><b>+{num(r.repGain)}</b></div>}
      </div>
      {r.capped && <p className="o-warn soft">Conté solo {dur(r.counted)}: es el máximo que puedo cuidar solo. La <b>Cámara remota</b> lo amplía.</p>}
      {r.stopped.length > 0 && <p className="o-warn">Se terminó {r.stopped.map((k) => MATERIALS[k].name).join(' y ')} y algunas máquinas pararon. Dejá stock de más o contratá a Filacolor, el proveedor oficial (Mejoras).</p>}
      <p className="hint">Los pedidos se pausan mientras no estás: no se vence nada.</p>
      <button className="btn-center" onClick={onClose}>¡Cobrar y seguir!</button>
    </Modal>
  );
}

// ---------- Logros ----------
export function AchievementsModal({ s, onClose }) {
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  return (
    <Modal title={`Logros · ${got}/${ACHIEVEMENTS.length}`} icon="trophy" onClose={onClose} wide>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={'ach' + (s.achievements[a.id] ? ' got' : '')}>
            <span className="ach-ico">{s.achievements[a.id] ? '🏆' : <Icon name="lock" size={16} />}</span>
            <div><b>{a.name}</b><small>{fmtText(a.desc)}</small></div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------- Desafíos: diarios, semanal, maestría y fichas ----------
function ChallengeRow({ c, onClaim }) {
  const done = c.prog >= c.target;
  return (
    <div className={'ch-row' + (c.claimed ? ' claimed' : done ? ' ready' : '')}>
      <div className="ch-txt">
        <b>{c.money ? `Ganá ${money(c.target)}` : c.text}</b>
        <div className="ch-bar"><i style={{ width: `${Math.min(100, (c.prog / c.target) * 100)}%` }} /></div>
        <small>{c.money ? `${money(c.prog)} / ${money(c.target)}` : `${num(Math.floor(c.prog))} / ${num(c.target)}`}</small>
      </div>
      {c.claimed ? <span className="own">✔ Cobrado</span>
        : <button className="chip-btn" disabled={!done} onClick={onClaim}>+{c.reward} 🎟️</button>}
    </div>
  );
}
export function ChallengesModal({ s, actions, onClose }) {
  const [pick, setPick] = useState(null);
  const unlocked = E.challengesUnlocked(s);
  const cp = E.challengeProgress(s);
  const gain = E.canMove(s) ? E.oficioGain(s) : 0;
  return (
    <Modal title="Desafíos" icon="target" onClose={onClose} wide>
      <div className="tokens-top">
        <div><span className="hud-label">TUS FICHAS</span><b>🎟️ {s.tokens}</b></div>
        <p className="hint">Se ganan con desafíos y contratos de empresa. Se gastan en la tienda de fichas, abajo.</p>
      </div>
      <div className="section-label">DESAFÍOS DE HOY</div>
      {s.daily ? s.daily.list.map((c, i) => <ChallengeRow key={i} c={c} onClaim={() => actions.claim('daily', i)} />) : <p className="hint">Se generan después del tutorial.</p>}
      <div className="section-label">DESAFÍO DE LA SEMANA</div>
      {s.weekly && s.weekly.list.map((c, i) => <ChallengeRow key={i} c={c} onClaim={() => actions.claim('weekly', i)} />)}

      <div className="section-label">DESAFÍOS DE MAESTRÍA</div>
      {!unlocked && <p className="hint">Se desbloquean después de tu primera <b>Mudanza</b>. Son partidas con reglas especiales que dan premios para siempre.</p>}
      {cp && (
        <div className="field-box ch-active">
          <b>En curso: {cp.def.name}</b>
          <small>{cp.def.rule} Meta: {fmtText(cp.def.goalText)}</small>
          <button className="chip-btn" onClick={() => actions.abandonChallenge()}>Abandonar (seguís jugando sin las reglas)</button>
        </div>
      )}
      <div className="perk-grid">
        {Object.entries(MASTERY_CHALLENGES).map(([id, C]) => {
          const won = E.mastered(s, id);
          return (
            <div key={id} className={'perk ch-card' + (won ? ' own' : '')}>
              <b>{C.name}</b>
              <small><b className="c-pink">Regla:</b> {C.rule}<br /><b className="c-cyan">Meta:</b> {fmtText(C.goalText)}<br /><b>Premio:</b> {C.reward}</small>
              {won ? <span className="own">✔ Superado</span>
                : cp?.id === id ? <span className="own">En curso</span>
                  : pick === id
                    ? <div className="confirm-row"><span>Empieza una Mudanza con estas reglas{gain ? ` (ganás ${gain} de Oficio)` : ' (sin Oficio: todavía no alcanza)'}.</span>
                      <button className="btn-center inline" onClick={() => { actions.startChallenge(id); onClose(); }}>Empezar</button>
                      <button className="chip-btn" onClick={() => setPick(null)}>No</button></div>
                    : <button className="chip-btn wide" disabled={!unlocked || !!cp} onClick={() => setPick(id)}>Jugar este desafío</button>}
            </div>
          );
        })}
      </div>

      <div className="section-label">TIENDA DE FICHAS</div>
      <div className="perk-grid">
        {Object.entries(TOKEN_SHOP).map(([id, T]) => (
          <div key={id} className="perk">
            <b>{T.name}</b><small>{T.desc}</small>
            <button className="chip-btn wide" disabled={s.tokens < T.cost} onClick={() => actions.buyToken(id)}>{T.cost} 🎟️</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------- Oficio y Mudanza ----------
export function OficioModal({ s, actions, onClose }) {
  const gain = E.oficioGain(s);
  const can = E.canMove(s);
  const made = PRODUCT_ORDER.filter((p) => s.run.products[p]);
  const bestMade = [...made].sort((a, b) => PRODUCTS[b].price - PRODUCTS[a].price)[0];
  const [pick, setPick] = useState(bestMade || null);
  const [sure, setSure] = useState(false);
  const pr = s.prestige;
  return (
    <Modal title="Oficio y Mudanza" icon="award" onClose={onClose} wide>
      <div className="of-top">
        <div className="of-level">
          <span className="hud-label">NIVEL MAKER</span>
          <b>{E.makerTitle(pr.total)}</b>
          <small>{num(pr.total)} puntos de Oficio ganados · <b className="c-cyan">+{num(E.oficioPct(pr.total))} %</b> de ingresos para siempre</small>
        </div>
        <div className="of-points"><span className="hud-label">PARA GASTAR</span><b>{num(pr.points)}</b></div>
      </div>

      <div className="section-label">MUDANZA</div>
      <div className="field-box of-move">
        <p>Vendés el taller y arrancás uno nuevo. <b>El oficio no se pierde:</b> conservás logros, Vitrina, experiencia de cada producto, fichas, clientes frecuentes y todo tu Oficio.
          Se reinician la plata, las máquinas, las mejoras, el espacio y la reputación.</p>
        <div className="rb-stats">
          <div><span>Ganado en esta partida</span><b>{money(s.runEarned)}</b></div>
          <div><span>Oficio que ganás</span><b className="c-pink">+{num(gain)}</b></div>
        </div>
        {!can && <p className="hint">{gain < 1 ? `Necesitás ganar ${money(E.firstOficioAt())} en esta partida para el primer punto.` : `Disponible al abrir el ${SPACES[3].name} o al juntar 3 puntos (ganás ${gain}).`}</p>}
        {can && made.length > 0 && <>
          <div className="lbl">Elegí una pieza para la <b>Vitrina</b> (queda exhibida para siempre en tu local):</div>
          <div className="vit-pick">
            {made.slice(-12).map((p) => (
              <button key={p} className={'opt' + (pick === p ? ' active' : '')} onClick={() => setPick(p)}>
                <ProductThumb pid={p} size={24} /> {PRODUCTS[p].name}
              </button>
            ))}
          </div>
        </>}
        {can && (!sure
          ? <button className="btn-center" onClick={() => setSure(true)}><Icon name="truck" size={18} /> Mudarme y ganar {num(gain)} de Oficio</button>
          : <div className="confirm-row"><span>¿Confirmás la mudanza? No se puede deshacer.</span>
            <button className="btn-center inline" onClick={() => { actions.move(pick); onClose(); }}>Sí, a la nueva sede</button>
            <button className="chip-btn" onClick={() => setSure(false)}>Todavía no</button></div>)}
        <p className="hint">No es obligatorio: podés seguir creciendo en este taller todo lo que quieras.</p>
      </div>

      <div className="section-label">BANCO DE OFICIO (VENTAJAS PERMANENTES)</div>
      <div className="perk-grid">
        {Object.entries(PERKS).map(([id, P]) => {
          const own = pr.perks[id];
          return (
            <div key={id} className={'perk' + (own ? ' own' : '')}>
              <b>{P.name}</b><small>{fmtText(P.desc)}</small>
              {own ? <span className="own">✔ Tuya</span>
                : <button className="chip-btn wide" disabled={pr.points < P.cost} onClick={() => actions.buyPerk(id, PERKS)}>{num(P.cost)} de Oficio</button>}
            </div>
          );
        })}
      </div>

      {pr.vitrina.length > 0 && <>
        <div className="section-label">VITRINA</div>
        <div className="vitrina">
          {pr.vitrina.map((v, i) => (
            <div key={i} className="vit-item" title={`Mudanza ${v.move}`}>
              <ProductThumb pid={v.p} size={52} />
              <small>{PRODUCTS[v.p].name}</small>
            </div>
          ))}
        </div>
      </>}
    </Modal>
  );
}

// ---------- Comunidad ----------
export function CommunityModal({ s, onClose }) {
  const [copied, setCopied] = useState(false);
  const best = [...s.machines].sort((a, b) => MACHINES[b.model].cost - MACHINES[a.model].cost)[0];
  const text = `Mi taller «${s.name || 'sin nombre'}» ya tiene ${s.machines.length} máquinas (la mejor: ${best ? MACHINES[best.model].brand + ' ' + MACHINES[best.model].name : '—'}) en 3DBAT: Maker Tycoon 🦇🖨️ ${IG_HANDLE}`;
  const share = async () => {
    const url = window.location.href.split('#')[0].split('?')[0];
    try {
      if (navigator.share) { await navigator.share({ title: '3DBAT: Maker Tycoon', text, url }); return; }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    } catch { /* cancelado */ }
  };
  return (
    <Modal title="Comunidad 3DBAT" icon="users" onClose={onClose}>
      <div className="ev-top">
        <BatiArt mood="wink" size={80} />
        <p className="ev-text">Este juego es de <b>3DBAT IMPRESIONES</b>. Si te gusta imprimir (o te dio curiosidad), sumate: compartimos trucos, herramientas gratis y el día a día del taller real.</p>
      </div>
      <CtaButtons list={['instagram', 'comunidad', 'batbox']} />
      <div className="section-label">COMPARTÍ TU TALLER</div>
      <p className="hint">{text}</p>
      <button className="btn-center" onClick={share}><Icon name="share" size={18} /> {copied ? '¡Copiado! Pegalo donde quieras' : 'Compartir'}</button>
    </Modal>
  );
}

// ---------- Ajustes ----------
export function SettingsModal({ s, actions, onClose, online, open }) {
  const [code, setCode] = useState('');
  const [imp, setImp] = useState('');
  const [msg, setMsg] = useState('');
  const [reset, setReset] = useState(0);
  const st = s.settings;
  return (
    <Modal title="Ajustes" icon="settings" onClose={onClose}>
      <div className="section-label">MONEDA</div>
      <CurrencyToggle s={s} actions={actions} />
      <p className="hint">La economía del juego es en pesos argentinos. En USD solo cambia cómo se muestran los importes: {SEASON.name}, US$ 1 = AR$ {SEASON.usdRate.toLocaleString('es-AR')} (fijo durante la temporada).</p>

      <div className="section-label">GRÁFICOS</div>
      <div className="view-toggle">
        {[['auto', 'Auto'], ['alta', 'Calidad (PC)'], ['media', 'Equilibrado'], ['baja', 'Rendimiento']].map(([k, l]) => (
          <button key={k} className={'seg' + (st.quality === k ? ' active' : '')} onClick={() => actions.setting('quality', k)}>{l}</button>
        ))}
      </div>
      <p className="hint">«Calidad» suma sombras de contacto, reflejos y antialias (ideal en PC). En el celular, «Equilibrado» o «Rendimiento» mantienen la estética con menos efectos.</p>
      <div className="view-toggle">
        {[['3d', 'Taller en 3D'], ['lista', 'Vista de lista']].map(([k, l]) => (
          <button key={k} className={'seg' + (st.view === k ? ' active' : '')} onClick={() => actions.setting('view', k)}>{l}</button>
        ))}
      </div>

      <div className="section-label">SONIDO</div>
      <label className="toggle-row"><input type="checkbox" checked={st.sound} onChange={(e) => actions.setting('sound', e.target.checked)} /><span className="switch" /><span>Sonido activado</span></label>
      <div className="vol-grid">
        <label>General<input type="range" min="0" max="1" step="0.05" value={st.volume} onChange={(e) => actions.setting('volume', Number(e.target.value))} /></label>
        {[['music', 'Música'], ['ambient', 'Ambiente'], ['machines', 'Máquinas'], ['fx', 'Efectos']].map(([k, l]) => (
          <label key={k}>{l}<input type="range" min="0" max="1" step="0.05" value={st.vol?.[k] ?? 0.5} onChange={(e) => actions.setVol(k, Number(e.target.value))} /></label>
        ))}
      </div>

      <div className="section-label">ANIMACIONES</div>
      <div className="view-toggle">
        {[['full', 'Completas'], ['soft', 'Suaves'], ['min', 'Mínimas']].map(([k, l]) => (
          <button key={k} className={'seg' + (st.anim === k ? ' active' : '')} onClick={() => actions.setting('anim', k)}>{l}</button>
        ))}
      </div>
      <p className="hint">Con «Mínimas» las máquinas no se mueven, pero las piezas igual crecen y las barras avanzan.</p>

      <div className="section-label">LUCES DEL TALLER</div>
      <div className="face-grid led-grid">
        {Object.entries(LED_COLORS).map(([k, L]) => {
          const ok = !L.unlock || s.achievements[L.unlock];
          return (
            <button key={k} className={'opt sm' + (st.led === k ? ' active' : '')} disabled={!ok} onClick={() => actions.setting('led', k)} title={ok ? '' : 'Se desbloquea con un logro'}>
              <i className="led-dot" style={{ background: L.color }} /> {L.name}{!ok && ' 🔒'}
            </button>
          );
        })}
      </div>

      <div className="section-label">TU PARTIDA</div>
      <p className="hint">{online?.user
        ? <>Se guarda en este navegador y en la nube ({online.user.email}). Desde otro dispositivo, entrá con la misma cuenta de Google.</>
        : <>Se guarda sola en este navegador. <button className="link-btn" onClick={() => open?.('online', null, 'perfil')}>Ingresá con Google</button> para tenerla en la nube, o pasala con un código:</>}</p>
      <div className="two-col">
        <button className="chip-btn wide" onClick={() => { setCode(actions.exportCode()); setMsg(''); }}><Icon name="download" size={14} /> Generar código</button>
        <button className="chip-btn wide" disabled={!code} onClick={async () => { try { await navigator.clipboard.writeText(code); setMsg('Código copiado.'); } catch { setMsg('Seleccioná el código y copialo a mano.'); } }}>Copiar</button>
      </div>
      {code && <textarea className="code-box" readOnly value={code} onFocus={(e) => e.target.select()} rows={3} />}
      <div className="pink-input"><textarea className="code-in" rows={2} placeholder="Pegá acá un código para cargar esa partida" value={imp} onChange={(e) => setImp(e.target.value)} /></div>
      <button className="chip-btn wide" disabled={!imp.trim()} onClick={() => { const ok = actions.importCode(imp); setMsg(ok ? '¡Partida cargada!' : 'Ese código no es válido.'); if (ok) setImp(''); }}><Icon name="upload" size={14} /> Cargar partida</button>
      {msg && <p className="hint"><b>{msg}</b></p>}

      <div className="section-label">EMPEZAR DE CERO</div>
      {reset === 0 && <button className="danger-btn" onClick={() => setReset(1)}><Icon name="trash" size={16} /> Borrar la partida</button>}
      {reset === 1 && <div className="confirm-row"><span>Se borra TODO (también el Oficio y los logros).</span><button className="danger-btn" onClick={() => setReset(2)}>Entiendo, seguir</button><button className="chip-btn" onClick={() => setReset(0)}>Cancelar</button></div>}
      {reset === 2 && <div className="confirm-row"><span>Última confirmación.</span><button className="danger-btn solid" onClick={() => { actions.reset(); onClose(); }}>Borrar definitivamente</button><button className="chip-btn" onClick={() => setReset(0)}>Cancelar</button></div>}

      <p className="hint credits">3DBAT: Maker Tycoon v{VERSION} · Un juego de <a href={LINKS.web} target="_blank" rel="noopener noreferrer">3DBAT IMPRESIONES</a> · <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer">{IG_HANDLE}</a></p>
      <p className="hint disclaimer">{BRAND_DISCLAIMER}</p>
    </Modal>
  );
}

// ---------- Pestaña "Más" (celular) ----------
export function MorePanel({ s, open, online }) {
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  return (
    <section className="card more-card">
      <div className="card-head"><div className="card-icon"><Icon name="more" /></div><h2>Más</h2></div>
      <div className="more-list">
        <button className="item-card" onClick={() => open('online', null, 'perfil')}><span className="item-ico">🌐</span><span className="item-txt"><strong>Online: ranking, retos y granjas</strong><small>{online?.user ? (online.me?.player ? `${online.me.player.nick} · ${online.me.points ?? 0} pts` : 'Creá tu perfil') : 'Guardá tu partida en la nube con Google'}</small></span></button>
        <button className="item-card fc-item" onClick={() => open('online', null, 'filacolor')}><span className="item-ico">🧵</span><span className="item-txt"><strong>Filacolor · Proveedor oficial</strong><small>Filamentos, impresoras y servicio técnico</small></span></button>
        <button className="item-card" onClick={() => open('oficio')}><span className="item-ico">🏅</span><span className="item-txt"><strong>Oficio y Mudanza</strong><small>{E.canMove(s) ? '¡Ya podés mudarte!' : `Nivel Maker: ${E.makerTitle(s.prestige.total)}`}</small></span></button>
        <button className="item-card" onClick={() => open('logros')}><span className="item-ico">🏆</span><span className="item-txt"><strong>Logros</strong><small>{got}/{ACHIEVEMENTS.length}</small></span></button>
        <button className="item-card" onClick={() => open('comunidad')}><span className="item-ico">🦇</span><span className="item-txt"><strong>Comunidad 3DBAT</strong><small>Instagram, BATBOX y la Comunidad Makers</small></span></button>
        <button className="item-card" onClick={() => open('ajustes')}><span className="item-ico">⚙️</span><span className="item-txt"><strong>Ajustes</strong><small>Gráficos, sonido y tu partida</small></span></button>
      </div>
      <div className="section-label">TU TALLER</div>
      <div className="rb-stats more-stats">
        <div><span>Piezas totales</span><b>{num(s.stats.pieces)}</b></div>
        <div><span>Pedidos</span><b>{num(s.stats.orders)}</b></div>
        <div><span>Ganado en total</span><b>{money(s.totalEarned)}</b></div>
        <div><span>Mates</span><b>{num(s.stats.mates)}</b></div>
      </div>
      <p className="hint disclaimer">{BRAND_DISCLAIMER}</p>
    </section>
  );
}
