// Juego online: cuenta, perfil, ranking, retos, granjas y el proveedor oficial (Filacolor).
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { Modal } from './Panels.jsx';
import { BatiArt } from './Bati.jsx';
import { rpc, getSetting } from '../online/api.js';
import { REWARDS, EMBLEMS, FARM_COLORS, FARM_SECTORS, farmLevel, metricLabel, rewardName, titleName, frameClass } from '../online/rewards.js';
import { FILACOLOR, SCORE_LABELS, fcUrl } from '../online/filacolor.js';
import { SPACES } from '../game/data.js';
import { money, num, SEASON } from '../game/format.js';
import { LINKS } from '../config.js';
import fcLogo from '../assets/filacolor-logo.png';
import fcIcon from '../assets/filacolor-icon.png';

// ---------- Piezas chicas ----------
export const GoogleG = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export function Avatar({ name, frame, size = 40 }) {
  const ch = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return <span className={'av ' + frameClass(frame)} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">{ch}</span>;
}
export function Emblem({ emblem = 'nozzle', color = '#5DDADB', size = 40 }) {
  const E = EMBLEMS[emblem] || EMBLEMS.nozzle;
  return (
    <span className="emblem" style={{ width: size, height: size, background: color + '26', borderColor: color + '88', color }} aria-hidden="true">
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={E.path} /></svg>
    </span>
  );
}
const ago = (t) => {
  if (!t) return '';
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} días`;
};
const fmtProgress = (metric, v) => (metric === 'earned' ? money(v) : num(Math.floor(v)));
function timeLeft(c) {
  if (c.ends_at) return 'Hasta el ' + new Date(c.ends_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  if (c.recur === 'day') return 'Se renueva todos los días';
  if (c.recur === 'week') return 'Se renueva cada lunes';
  return 'Toda la temporada';
}
function Spinner() { return <div className="ol-empty"><div className="spinner" /></div>; }
function Err({ e }) { return e ? <p className="ol-err">{e}</p> : null; }

// ---------- Encabezado ----------
export function CloudPill({ online, s, open }) {
  if (online.available !== true) return <div className="pill">Se guarda en este navegador</div>;
  if (!online.user) {
    return (
      <button className="pill pill-btn" onClick={() => open('online', null, 'perfil')} title="Guardá tu partida en la nube con tu cuenta de Google">
        Partida en este navegador · <span className="c-pink">Guardala en la nube</span>
      </button>
    );
  }
  const st = online.cloud.status;
  const txt = st === 'saving' ? 'Guardando en la nube…' : st === 'checking' ? 'Conectando…' : st === 'conflict' ? 'Elegí qué partida usar'
    : st === 'error' ? 'Sin conexión · se guarda en este navegador' : s.tutorial.active ? 'Terminá el tutorial y se guarda en la nube'
    : online.cloud.at ? `☁️ Guardada en la nube · ${ago(online.cloud.at)}` : '☁️ Partida en la nube';
  return <button className={'pill pill-btn' + (st === 'error' ? ' warn' : '')} onClick={() => open('online', null, 'perfil')}>{txt}</button>;
}

export function AccountChip({ online, open }) {
  if (online.available !== true) return null;
  if (!online.user) {
    return <button className="acct-chip" onClick={() => open('online', null, 'perfil')} title="Ingresar con Google"><GoogleG size={16} /><span>Ingresar</span></button>;
  }
  const p = online.me?.player;
  const name = p?.nick || online.user.user_metadata?.full_name?.split(' ')[0] || 'Mi cuenta';
  return (
    <button className="acct-chip in" onClick={() => open('online', null, 'perfil')} title="Tu perfil online">
      <Avatar name={name} frame={p?.frame} size={26} />
      <span className="acct-txt"><b>{name}</b>{online.me?.points != null && p && <small>{num(online.me.points)} pts</small>}</span>
    </button>
  );
}

export function LiveChip({ live, open }) {
  if (!live) return null;
  return (
    <button className="live-chip" onClick={() => open('online', null, 'ranking')} title={`${num(live.online)} en BATBOX · ${num(live.playing)} jugando · ${num(live.farms)} granjas activas`}>
      <i className="live-dot" /> <b>{num(live.playing)}</b> fabricando ahora
    </button>
  );
}

// ---------- Ventana principal ----------
const TABS = [['perfil', 'Perfil', 'user'], ['ranking', 'Ranking', 'trophy'], ['retos', 'Retos', 'target'], ['granja', 'Granja', 'factory'], ['filacolor', 'Filacolor', 'spool']];

export function OnlineModal({ s, actions, online, tab: tab0, onClose, open }) {
  const [tab, setTab] = useState(tab0 || 'perfil');
  return (
    <Modal title="Maker Tycoon online" icon="users" onClose={onClose} wide className="ol-modal">
      <div className="view-toggle ol-tabs" role="tablist">
        {TABS.map(([k, l, ic]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={'seg' + (tab === k ? ' active' : '') + (k === 'filacolor' ? ' fc-seg' : '')} onClick={() => setTab(k)}>
            {k === 'filacolor' ? <img src={fcIcon} alt="" width="16" height="16" /> : <Icon name={ic} size={15} />} <span>{l}</span>
          </button>
        ))}
      </div>
      {online.available === false && tab !== 'filacolor' ? <Soon /> : (
        <>
          {tab === 'perfil' && <ProfileTab s={s} actions={actions} online={online} />}
          {tab === 'ranking' && <RankingTab online={online} />}
          {tab === 'retos' && <ChallengesTab online={online} open={open} />}
          {tab === 'granja' && <FarmTab online={online} />}
          {tab === 'filacolor' && <FilacolorTab />}
        </>
      )}
    </Modal>
  );
}

function Soon() {
  return (
    <div className="ol-soon">
      <BatiArt mood="wink" size={80} />
      <p><b>El juego online está por arrancar.</b> Muy pronto vas a poder guardar tu partida en la nube, entrar al ranking, armar una granja con otros makers y jugar los retos de la comunidad.</p>
      <p className="hint">Mientras tanto tu partida se sigue guardando en este navegador, como siempre.</p>
    </div>
  );
}

function SignInBox({ online }) {
  return (
    <div className="signin">
      <div className="ev-top">
        <BatiArt mood="happy" size={76} />
        <div>
          <p className="ev-text"><b>Jugás gratis y sin límites, con o sin cuenta.</b></p>
          <p className="hint">Si entrás con Google (la misma cuenta de BATBOX y del Cotizador), además:</p>
        </div>
      </div>
      <ul className="benefits">
        <li>☁️ Tu partida queda en la nube: seguís desde la compu o el celular.</li>
        <li>🏆 Entrás al ranking de la temporada y al semanal.</li>
        <li>🏭 Armás una Granja Maker con otros makers.</li>
        <li>🎯 Jugás los retos de la comunidad y ganás premios para tu taller.</li>
      </ul>
      <button className="btn-google" onClick={online.signIn}><GoogleG size={20} /> Ingresar con Google</button>
      <p className="hint">No hace falta ser del Makers Club. Tu partida de este navegador no se pierde: al entrar se sube a la nube (o, si ya tenías una, te preguntamos cuál usar).</p>
    </div>
  );
}

// ---------- Perfil ----------
function ProfileTab({ s, actions, online }) {
  if (!online.ready) return <Spinner />;
  if (!online.user) return <SignInBox online={online} />;
  if (!online.me) return <Spinner />;
  if (!online.me.player) return <CreateProfile online={online} />;
  return <ProfileView s={s} actions={actions} online={online} />;
}

const PRIVACY = [
  ['public', 'Público', 'Tu apodo aparece en el ranking y en tu granja.'],
  ['farm', 'Solo mi granja', 'En el ranking salís como «Maker anónimo».'],
  ['hidden', 'Oculto', 'Nadie ve tu apodo (salís como «Maker anónimo»).'],
];
const cleanNick = (v) => (v || '').replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]/g, '').slice(0, 20);

// ---------- Bienvenida: primero la cuenta, después el perfil ----------
const GATE_KEY = 'mt3dbat.gate';
const skipped = (k) => { try { return sessionStorage.getItem(GATE_KEY + k) === '1'; } catch { return false; } };
const skip = (k) => { try { sessionStorage.setItem(GATE_KEY + k, '1'); } catch { /* sin storage */ } };

export function useGate(online) {
  const [, force] = useState(0);
  const need = online.available === true && online.ready;
  const login = need && !online.user && !skipped('login');
  const profile = need && !!online.user && online.me && online.me.player === null && !skipped('perfil');
  return { login, profile, skipLogin: () => { skip('login'); force((x) => x + 1); }, skipProfile: () => { skip('perfil'); force((x) => x + 1); } };
}

export function WelcomeGate({ online, onSkip }) {
  return (
    <div className="modal-back gate-back">
      <div className="modal gate" role="dialog" aria-modal="true" aria-label="Bienvenida">
        <div className="gate-top">
          <BatiArt mood="happy" size={92} />
          <div>
            <div className="section-label">3DBAT MAKER TYCOON</div>
            <h2>¡Bienvenido al taller!</h2>
            <p>Ingresá con Google y desde el primer minuto tu taller queda guardado en la nube y empezás a sumar en el ranking.</p>
          </div>
        </div>
        <ul className="benefits">
          <li>🏆 Sumás Puntos Maker en el ranking de la temporada y el semanal.</li>
          <li>☁️ Seguís tu partida desde la compu o el celular.</li>
          <li>🏭 Armás una granja con otros makers y jugás los retos de la comunidad.</li>
        </ul>
        <button className="btn-google" onClick={online.signIn}><GoogleG size={20} /> Ingresar con Google</button>
        <p className="hint">La misma cuenta de BATBOX y del Cotizador. Si ya venías jugando en este navegador, tu taller se sube tal cual.</p>
        <button className="link-btn gate-skip" onClick={onSkip}>Jugar sin cuenta (podés ingresar después)</button>
      </div>
    </div>
  );
}

export function ProfileSetup({ online, onSkip }) {
  return (
    <div className="modal-back gate-back">
      <div className="modal gate" role="dialog" aria-modal="true" aria-label="Creá tu perfil">
        <div className="gate-top">
          <BatiArt mood="wink" size={80} />
          <div>
            <div className="section-label">ÚLTIMO PASO</div>
            <h2>Creá tu perfil de maker</h2>
            <p>Con tu perfil ya entrás al ranking: todo lo que fabriques desde ahora suma puntos.</p>
          </div>
        </div>
        <CreateProfile online={online} compact />
        <button className="link-btn gate-skip" onClick={onSkip}>Ahora no</button>
      </div>
    </div>
  );
}

function CreateProfile({ online, compact = false }) {
  const meta = online.user.user_metadata || {};
  const [nick, setNick] = useState(cleanNick((meta.full_name || meta.name || online.user.email || '').split(/[ @]/)[0]));
  const [privacy, setPrivacy] = useState('public');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const create = async () => {
    setBusy(true); setErr('');
    try { await rpc('bb_mt_profile_set', { p_nick: nick, p_privacy: privacy }); await online.refreshMe(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div>
      {!compact && <div className="section-label">TU PERFIL DE JUGADOR</div>}
      <p className="hint">Elegí cómo te van a ver los demás makers. Lo podés cambiar cuando quieras.</p>
      <label className="ol-field">Apodo
        <div className="pink-input"><input value={nick} maxLength={20} onChange={(e) => setNick(cleanNick(e.target.value))} placeholder="Tu apodo maker" /></div>
      </label>
      <div className="section-label">PRIVACIDAD</div>
      <div className="priv-grid">
        {PRIVACY.map(([k, l, d]) => (
          <button key={k} className={'opt priv' + (privacy === k ? ' active' : '')} onClick={() => setPrivacy(k)}><b>{l}</b><small>{d}</small></button>
        ))}
      </div>
      <Err e={err} />
      <button className="btn-center" disabled={busy || nick.trim().length < 3} onClick={create}>{busy ? 'Creando…' : 'Crear mi perfil'}</button>
      <p className="hint">Regalo de bienvenida: el título «Pionero · Temporada 1» y el cartel neón 3DBAT para tu taller.</p>
    </div>
  );
}

const CAPS = [['pedidos', 'Pedidos', 400], ['produccion', 'Producción', 150], ['eventos', 'Fallas resueltas', 120], ['retos', 'Desafíos diarios', 90], ['semanal', 'Desafío semanal', 120]];

function ProfileView({ s, actions, online }) {
  const { me } = online;
  const p = me.player;
  const [edit, setEdit] = useState(false);
  const [nick, setNick] = useState(p.nick);
  const [privacy, setPrivacy] = useState(p.privacy);
  const [title, setTitle] = useState(p.title || '');
  const [frame, setFrame] = useState(p.frame || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const unlocked = me.unlocks || [];
  const mine = (kind) => unlocked.filter((id) => REWARDS[id]?.kind === kind);
  const cos = s.cosmetics || { decor: [], skin: null, effect: null };
  const saveProfile = async (patch = {}) => {
    setBusy(true); setErr('');
    try {
      await rpc('bb_mt_profile_set', { p_nick: patch.nick ?? nick, p_privacy: patch.privacy ?? privacy, p_title: (patch.title ?? title) || null, p_frame: (patch.frame ?? frame) || null });
      await online.refreshMe(); setEdit(false);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const c = online.cloud;
  return (
    <div>
      {p.banned && <p className="ol-err">Tu cuenta está bloqueada en el juego online{p.ban_reason ? ` (${p.ban_reason})` : ''}. Podés seguir jugando y tu partida se sigue guardando, pero no sumás puntos. Si creés que es un error, escribinos en la Comunidad.</p>}
      <div className="prof-card">
        <Avatar name={p.nick} frame={p.frame} size={64} />
        <div className="prof-txt">
          <b>{p.nick}</b>
          {titleName(p.title) && <span className="prof-title">{titleName(p.title)}</span>}
          <small>{me.farm ? <>Granja <b>{me.farm.name}</b> · {me.farm.role}</> : 'Sin granja'} · {PRIVACY.find((x) => x[0] === p.privacy)?.[1]}</small>
        </div>
        <button className="chip-btn" onClick={() => setEdit((v) => !v)}>{edit ? 'Cerrar' : 'Editar'}</button>
      </div>
      <div className="rb-stats prof-stats">
        <div><span>Puntos Maker · {me.season?.name || SEASON.name}</span><b>{num(me.points)}</b></div>
        <div><span>Puesto</span><b>{me.rank ? `#${me.rank}` : '—'}</b></div>
        <div><span>Esta semana</span><b>{num(me.week_points)}</b></div>
        <div><span>En esta sesión</span><b>+{num(Math.round(online.sessionPoints))}</b></div>
      </div>
      {edit && (
        <div className="prof-edit">
          <label className="ol-field">Apodo<div className="pink-input"><input value={nick} maxLength={20} onChange={(e) => setNick(cleanNick(e.target.value))} /></div></label>
          <div className="priv-grid">
            {PRIVACY.map(([k, l, d]) => <button key={k} className={'opt priv' + (privacy === k ? ' active' : '')} onClick={() => setPrivacy(k)}><b>{l}</b><small>{d}</small></button>)}
          </div>
          <label className="ol-field">Título
            <select value={title} onChange={(e) => setTitle(e.target.value)}><option value="">Sin título</option>{mine('title').map((id) => <option key={id} value={id}>{REWARDS[id].name}</option>)}</select>
          </label>
          <label className="ol-field">Marco
            <select value={frame} onChange={(e) => setFrame(e.target.value)}><option value="">Sin marco</option>{mine('frame').map((id) => <option key={id} value={id}>{REWARDS[id].name}</option>)}</select>
          </label>
          <Err e={err} />
          <button className="btn-center" disabled={busy || nick.trim().length < 3} onClick={() => saveProfile()}>{busy ? 'Guardando…' : 'Guardar perfil'}</button>
        </div>
      )}

      <div className="section-label">PUNTOS DE HOY</div>
      <div className="caps">
        {CAPS.map(([k, l, cap]) => {
          const v = Math.min(cap, me.today?.[k] || 0);
          return <div key={k} className="cap-row"><span>{l}</span><i><b style={{ width: `${(v / cap) * 100}%` }} /></i><em>{num(v)}/{cap}</em></div>;
        })}
      </div>
      <p className="hint">Cada cosa tiene un tope por día: así el ranking premia jugar bien y seguido, no solo jugar más horas. Los logros y cada máquina nueva suman una sola vez. Los puntos los calcula el servidor con tu partida de la nube.</p>

      <div className="section-label">TUS PREMIOS PARA EL TALLER</div>
      {['decor', 'skin', 'effect'].every((k) => mine(k).length === 0) && <p className="hint">Todavía no ganaste decoraciones. Se ganan en los retos.</p>}
      {mine('decor').length > 0 && (
        <div className="cos-row"><span>Decoración</span>
          {mine('decor').map((id) => <button key={id} className={'opt sm' + (cos.decor?.includes(id) ? ' active' : '')} onClick={() => actions.setCosmetic('decor', id)}>{REWARDS[id].name}</button>)}
        </div>
      )}
      {mine('skin').length > 0 && (
        <div className="cos-row"><span>Bases</span>
          {mine('skin').map((id) => <button key={id} className={'opt sm' + (cos.skin === id ? ' active' : '')} onClick={() => actions.setCosmetic('skin', id)}><i className="led-dot" style={{ background: REWARDS[id].color }} /> {REWARDS[id].name}</button>)}
        </div>
      )}
      {mine('effect').length > 0 && (
        <div className="cos-row"><span>Efectos</span>
          {mine('effect').map((id) => <button key={id} className={'opt sm' + (cos.effect === id ? ' active' : '')} onClick={() => actions.setCosmetic('effect', id)}>{REWARDS[id].name}</button>)}
        </div>
      )}
      <p className="hint">Los premios son solo estéticos: no dan plata, velocidad ni puntos.</p>

      <div className="section-label">PARTIDA EN LA NUBE</div>
      <div className="cloud-box">
        <span className={'cloud-dot st-' + c.status} />
        <span>{c.status === 'saving' ? 'Guardando…' : c.status === 'error' ? 'No se pudo conectar. Se sigue guardando en este navegador y se sube cuando vuelva la conexión.'
          : c.status === 'conflict' ? 'Hay que elegir qué partida usar.' : s.tutorial.active ? 'Se sube a la nube cuando termines el tutorial.'
          : c.at ? `Guardada ${ago(c.at)}. Se guarda sola cada minuto y al cerrar.` : 'Conectada.'}</span>
        <button className="chip-btn" disabled={c.status === 'saving' || s.tutorial.active} onClick={() => online.push(false)}>Guardar ahora</button>
      </div>
      <p className="hint">Cuenta: {online.user.email}</p>
      <button className="btn-alt" onClick={online.signOut}>Cerrar sesión en este navegador</button>
    </div>
  );
}

// ---------- Ranking ----------
const RANKS = [['global', 'Temporada'], ['semanal', 'Semanal'], ['granjas', 'Granjas'], ['comunidad', 'Comunidad'], ['fama', 'Hall de la Fama']];
const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`);

function RankingTab({ online }) {
  const [kind, setKind] = useState('global');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    setData(null); setErr('');
    (kind === 'fama' ? rpc('bb_mt_hall_list') : rpc('bb_mt_ranking', { p_kind: kind, p_limit: 50 }))
      .then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [kind, online.me?.points]);
  return (
    <div>
      <div className="rank-tabs">{RANKS.map(([k, l]) => <button key={k} className={'opt sm' + (kind === k ? ' active' : '')} onClick={() => setKind(k)}>{l}</button>)}</div>
      <p className="hint">{{
        global: `Puntos Maker de la ${SEASON.name}. Se reinicia al terminar la temporada.`,
        semanal: 'Producción y retos de esta semana. Se reinicia cada lunes.',
        granjas: 'Lo que suman todos los integrantes de cada granja en la temporada.',
        comunidad: 'Aportes a los retos de comunidad (todos juntos hacia una meta).',
        fama: 'Los mejores de cada temporada terminada.',
      }[kind]}</p>
      <Err e={err} />
      {!data && !err && <Spinner />}
      {data && kind === 'fama' && (data.length === 0 ? <p className="ol-empty">Todavía no terminó ninguna temporada.</p> : data.map((h) => (
        <div key={h.season_id} className="hall">
          <div className="section-label">{h.season}</div>
          {(h.global || []).map((r) => <div key={r.rank} className="rank-row"><span className="rk">{medal(r.rank)}</span><span className="rn">{r.name}{r.farm && <small> · {r.farm}</small>}</span><b>{num(r.points)}</b></div>)}
          {(h.granjas || []).length > 0 && <div className="hall-sub">Granjas: {h.granjas.map((g) => `${medal(g.rank)} ${g.name}`).join(' · ')}</div>}
        </div>
      )))}
      {data && kind !== 'fama' && (
        <>
          {data.rows.length === 0 && <p className="ol-empty">Todavía no hay nadie. ¡Podés ser el primero!</p>}
          <div className="rank-list">
            {data.rows.map((r) => kind === 'granjas' ? (
              <div key={r.id} className={'rank-row' + (r.me ? ' me' : '')}>
                <span className="rk">{medal(r.rank)}</span><Emblem emblem={r.emblem} color={r.color} size={30} />
                <span className="rn">{r.name}<small> · {r.members}/6</small></span><b>{num(r.points)}</b>
              </div>
            ) : (
              <div key={r.rank + r.name} className={'rank-row' + (r.me ? ' me' : '')}>
                <span className="rk">{medal(r.rank)}</span><Avatar name={r.name} frame={r.frame} size={30} />
                <span className="rn">{r.name}{titleName(r.title) && <em className="rt">{titleName(r.title)}</em>}
                  {r.farm && <small className="rf"><Emblem emblem={r.farm.emblem} color={r.farm.color} size={14} /> {r.farm.name}</small>}</span>
                <b>{num(r.points)}</b>
              </div>
            ))}
          </div>
          {data.me && !data.rows.some((r) => r.me) && <div className="rank-row me pinned"><span className="rk">#{data.me.rank}</span><span className="rn">Vos</span><b>{num(data.me.points)}</b></div>}
          {!online.user && <p className="hint">Ingresá con Google para entrar al ranking.</p>}
          <p className="hint">Con nombre aparecen solo los que eligieron perfil público. <a href={LINKS.ranking} target="_blank" rel="noopener noreferrer">Ver el ranking en BATBOX ↗</a></p>
        </>
      )}
    </div>
  );
}

// ---------- Retos ----------
const KIND_LABEL = { diario: 'Diario', semanal: 'Semanal', tecnico: 'Técnico', comunidad: 'Comunidad', granja: 'Granja', evento: 'Evento' };

export function ChallengeCard({ c, logged, inFarm }) {
  const isCom = c.scope === 'comunidad';
  const prog = isCom ? Number(c.community || 0) : Number(c.mine?.progress || 0);
  const done = isCom ? c.community_done : c.mine?.completed;
  const frac = Math.min(1, prog / Number(c.target));
  return (
    <div className={'olc' + (done ? ' done' : '') + (c.featured ? ' featured' : '')}>
      <div className="olc-head">
        <span className={'olc-kind k-' + c.kind}>{KIND_LABEL[c.kind] || c.kind}</span>
        <b>{c.title}</b>
        {done && <span className="olc-ok">✔ Cumplido</span>}
      </div>
      {c.description && <p className="olc-desc">{c.description}</p>}
      <div className="olc-bar"><i style={{ width: `${frac * 100}%` }} /></div>
      <div className="olc-meta">
        <span>{fmtProgress(c.metric, prog)} / {fmtProgress(c.metric, Number(c.target))} {c.metric !== 'earned' && metricLabel(c.metric)}</span>
        <span>{timeLeft(c)}</span>
      </div>
      <div className="olc-reward">
        Premio: {c.reward_points > 0 && <b>{num(c.reward_points)} pts</b>}{c.reward_points > 0 && c.reward_id && ' + '}{c.reward_id && <b>{rewardName(c.reward_id)}</b>}
        {isCom && <span className="muted"> · {num(c.participants)} makers aportando{c.mine?.progress ? ` · vos: ${fmtProgress(c.metric, c.mine.progress)}` : ''}</span>}
      </div>
      {!logged && <small className="muted">Ingresá con Google para participar.</small>}
      {logged && c.scope === 'granja' && !inFarm && <small className="muted">Es de granja: unite a una para sumar.</small>}
    </div>
  );
}

function ChallengesTab({ online, open }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    rpc('bb_mt_challenges_active').then((d) => { if (alive) setList(d || []); }).catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [online.me?.points]);
  const logged = !!online.me?.player;
  return (
    <div>
      <p className="hint">Retos de la comunidad 3DBAT: se juegan con tu partida en la nube y los cuenta el servidor. Aparte siguen tus <button className="link-btn" onClick={() => open('desafios')}>desafíos diarios del taller</button>.</p>
      <Err e={err} />
      {!list && !err && <Spinner />}
      {list && list.length === 0 && <p className="ol-empty">No hay retos activos en este momento.</p>}
      <div className="olc-list">{list && list.map((c) => <ChallengeCard key={c.id} c={c} logged={logged} inFarm={!!online.me?.farm} />)}</div>
    </div>
  );
}

// ---------- Granja ----------
function FarmTab({ online }) {
  const me = online.me;
  if (!online.ready) return <Spinner />;
  if (!online.user) return <><p className="hint">Las Granjas Maker son equipos de hasta 6 makers: cada uno juega en su taller y entre todos suman puntos, cumplen contratos cooperativos y suben de nivel su nave de producción.</p><SignInBox online={online} /></>;
  if (!me) return <Spinner />;
  if (!me.player) return <p className="hint">Primero creá tu perfil en la pestaña «Perfil».</p>;
  if (me.farm) return <FarmView id={me.farm.id} online={online} />;
  return <FarmLobby online={online} />;
}

function FarmForm({ init, onSubmit, submitLabel, banners = [] }) {
  const [name, setName] = useState(init?.name || '');
  const [emblem, setEmblem] = useState(init?.emblem || 'nozzle');
  const [color, setColor] = useState(init?.color || FARM_COLORS[0]);
  const [desc, setDesc] = useState(init?.description || '');
  const [open, setOpen] = useState(init?.open ?? true);
  const [banner, setBanner] = useState(init?.banner || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await onSubmit({ name, emblem, color, desc, open, banner: banner || null }); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <div className="farm-form">
      <div className="ff-preview"><Emblem emblem={emblem} color={color} size={54} /><b>{name || 'Tu granja'}</b></div>
      <label className="ol-field">Nombre<div className="pink-input"><input value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Los del Nozzle" /></div></label>
      <div className="ol-field">Emblema
        <div className="emb-grid">{Object.entries(EMBLEMS).map(([k, v]) => (
          <button key={k} className={'emb-opt' + (emblem === k ? ' active' : '')} onClick={() => setEmblem(k)} title={v.name}><Emblem emblem={k} color={color} size={34} /></button>
        ))}</div>
      </div>
      <div className="ol-field">Color
        <div className="col-grid">{FARM_COLORS.map((c) => <button key={c} className={'col-opt' + (color === c ? ' active' : '')} style={{ background: c }} onClick={() => setColor(c)} aria-label={'Color ' + c} />)}</div>
      </div>
      <label className="ol-field">Descripción (opcional)<div className="pink-input"><input value={desc} maxLength={160} onChange={(e) => setDesc(e.target.value)} placeholder="¿Qué hacen? ¿De dónde son?" /></div></label>
      {banners.length > 0 && (
        <label className="ol-field">Banner
          <select value={banner} onChange={(e) => setBanner(e.target.value)}><option value="">Sin banner</option>{banners.map((b) => <option key={b} value={b}>{rewardName(b)}</option>)}</select>
        </label>
      )}
      <div className="view-toggle">
        <button className={'seg' + (open ? ' active' : '')} onClick={() => setOpen(true)}>Abierta</button>
        <button className={'seg' + (!open ? ' active' : '')} onClick={() => setOpen(false)}>Solo con código</button>
      </div>
      <p className="hint">{open ? 'Cualquiera puede sumarse desde la lista.' : 'Solo entran los que tienen el código de invitación.'}</p>
      <Err e={err} />
      <button className="btn-center" disabled={busy || name.trim().length < 3} onClick={go}>{busy ? 'Un momento…' : submitLabel}</button>
    </div>
  );
}

function FarmLobby({ online }) {
  const [mode, setMode] = useState('buscar');
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => { rpc('bb_mt_farm_list', { p_search: q.trim() || null, p_limit: 30 }).then(setList).catch((e) => setErr(e.message)); }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const join = async (args) => {
    setErr('');
    try { await rpc('bb_mt_farm_join', args); await online.refreshMe(); } catch (e) { setErr(e.message); }
  };
  return (
    <div>
      <p className="hint">Una Granja Maker es un equipo de hasta 6 makers. Cada uno juega en su propio taller (nadie toca tu plata ni tus máquinas) y todo lo que sumás va también a la granja: contratos cooperativos, nivel de la nave y ranking de granjas.</p>
      <div className="view-toggle">
        <button className={'seg' + (mode === 'buscar' ? ' active' : '')} onClick={() => setMode('buscar')}>Unirme a una</button>
        <button className={'seg' + (mode === 'crear' ? ' active' : '')} onClick={() => setMode('crear')}>Crear la mía</button>
      </div>
      <Err e={err} />
      {mode === 'crear' ? (
        <FarmForm submitLabel="Crear granja" onSubmit={async (f) => {
          await rpc('bb_mt_farm_create', { p_name: f.name, p_emblem: f.emblem, p_color: f.color, p_description: f.desc, p_open: f.open });
          await online.refreshMe();
        }} />
      ) : (
        <>
          <div className="code-join">
            <div className="pink-input"><input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Código de invitación" /></div>
            <button className="chip-btn" disabled={code.length < 6} onClick={() => join({ p_code: code })}>Entrar</button>
          </div>
          <div className="pink-input search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar granja por nombre" /></div>
          {!list && <Spinner />}
          {list && list.length === 0 && <p className="ol-empty">No hay granjas{q ? ' con ese nombre' : ' todavía'}. ¡Creá la primera!</p>}
          <div className="farm-list">
            {list && list.map((f) => (
              <div key={f.id} className="farm-row">
                <Emblem emblem={f.emblem} color={f.color} size={40} />
                <span className="fr-txt"><b>{f.name}</b><small>Nivel {farmLevel(f.xp).level} · {f.members}/6 makers · {num(f.points)} pts{f.playing > 0 ? ` · ${f.playing} jugando` : ''}</small>{f.description && <small className="muted">{f.description}</small>}</span>
                {f.open ? <button className="chip-btn" disabled={f.members >= 6} onClick={() => join({ p_farm: f.id })}>{f.members >= 6 ? 'Completa' : 'Unirme'}</button> : <span className="muted fr-lock">🔒 Con código</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const ROLE = { fundador: 'Fundador', encargado: 'Encargado', miembro: 'Miembro' };

function FarmView({ id, online }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false);
  const [leave, setLeave] = useState(0);
  const [copied, setCopied] = useState(false);
  const load = useCallback(() => rpc('bb_mt_farm_get', { p_farm: id }).then(setF).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load, online.me?.points]);
  if (!f) return err ? <Err e={err} /> : <Spinner />;
  const lv = farmLevel(f.xp);
  const myRole = online.me?.farm?.role;
  const can = (m) => m.id && !m.me && ((myRole === 'fundador') || (myRole === 'encargado' && m.role === 'miembro'));
  const act = async (args) => { setErr(''); try { setF(await rpc('bb_mt_farm_member_set', args)); } catch (e) { setErr(e.message); } };
  const invite = async () => {
    const txt = `Sumate a mi granja «${f.name}» en 3DBAT Maker Tycoon 🦇🖨️ Código: ${f.code}`;
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* sin portapapeles */ }
  };
  const slots = Array.from({ length: 6 }, (_, i) => f.members[i] || null);
  return (
    <div>
      <div className={'farm-head ' + (REWARDS[f.banner]?.css || '')} style={{ '--fc': f.color }}>
        <Emblem emblem={f.emblem} color={f.color} size={58} />
        <div className="fh-txt">
          <b>{f.name}</b>
          <small>Nivel {lv.level} · {f.members.length}/6 makers · {f.open ? 'abierta' : 'solo con código'}{f.rank ? ` · #${f.rank} en granjas` : ''}</small>
          {f.description && <small className="muted">{f.description}</small>}
        </div>
        <div className="fh-pts"><b>{num(f.points)}</b><small>pts temporada</small></div>
      </div>
      <div className="lv-bar" title={lv.next ? `${num(f.xp)} / ${num(lv.next)} de experiencia` : 'Nivel máximo'}><i style={{ width: `${lv.frac * 100}%` }} /></div>

      <div className="section-label">NAVE DE PRODUCCIÓN</div>
      <div className="nave">
        <div className="nave-floor">
          {slots.map((m, i) => (
            <div key={i} className={'station' + (m ? ' on' : '') + (m?.playing ? ' live' : '')} title={m ? `${m.name} · ${ROLE[m.role]}` : 'Lugar libre'}>
              <span className="st-printer" style={m ? { '--fc': f.color } : null} />
              <small>{m ? m.name : 'Libre'}</small>
            </div>
          ))}
        </div>
        <div className="nave-sectors">
          {FARM_SECTORS.map((sct) => <span key={sct.name} className={'sector' + (lv.level >= sct.level ? ' on' : '')} title={lv.level >= sct.level ? sct.name : `Se enciende en el nivel ${sct.level}`}>{sct.icon} {sct.name}</span>)}
        </div>
      </div>
      <p className="hint">Las estaciones encendidas son los integrantes; las que titilan están jugando ahora. Los sectores se encienden al subir de nivel con los puntos de todos.</p>

      <div className="section-label">INTEGRANTES</div>
      <div className="farm-members">
        {f.members.map((m, i) => (
          <div key={i} className={'fm-row' + (m.me ? ' me' : '')}>
            <Avatar name={m.name} frame={m.frame} size={32} />
            <span className="fm-txt"><b>{m.name}{m.playing && <i className="live-dot" title="Jugando ahora" />}</b><small>{ROLE[m.role]}{titleName(m.title) ? ` · ${titleName(m.title)}` : ''} · aportó {num(m.contributed)} pts</small></span>
            {can(m) && (
              <span className="fm-act">
                {myRole === 'fundador' && m.role !== 'encargado' && <button className="chip-btn" onClick={() => act({ p_user: m.id, p_role: 'encargado' })}>Hacer encargado</button>}
                {myRole === 'fundador' && m.role === 'encargado' && <button className="chip-btn" onClick={() => act({ p_user: m.id, p_role: 'miembro' })}>Quitar encargado</button>}
                <button className="chip-btn danger" onClick={() => act({ p_user: m.id, p_kick: true })}>Sacar</button>
              </span>
            )}
          </div>
        ))}
      </div>
      {f.code && f.members.length < 6 && (
        <div className="invite">
          <span>Código de invitación: <b className="code">{f.code}</b></span>
          <button className="chip-btn" onClick={invite}>{copied ? '¡Copiado!' : 'Copiar invitación'}</button>
        </div>
      )}

      <div className="section-label">CONTRATOS COOPERATIVOS</div>
      {f.challenges.length === 0 && <p className="hint">No hay contratos de granja activos ahora.</p>}
      <div className="olc-list">{f.challenges.map((c) => <ChallengeCard key={c.id} c={{ ...c, kind: 'granja', scope: 'granja', mine: { progress: c.progress, completed: c.completed } }} logged inFarm />)}</div>

      <Err e={err} />
      {(myRole === 'fundador' || myRole === 'encargado') && (
        <>
          <button className="chip-btn wide" onClick={() => setEdit((v) => !v)}>{edit ? 'Cerrar edición' : 'Editar la granja'}</button>
          {edit && <FarmForm init={f} banners={f.banners} submitLabel="Guardar cambios" onSubmit={async (x) => {
            setF(await rpc('bb_mt_farm_update', { p_name: x.name, p_emblem: x.emblem, p_color: x.color, p_description: x.desc, p_open: x.open, p_banner: x.banner }));
            setEdit(false); online.refreshMe();
          }} />}
        </>
      )}
      <div className="leave-row">
        {leave === 0 && <button className="danger-btn" onClick={() => setLeave(1)}>Salir de la granja</button>}
        {leave === 1 && (
          <div className="confirm-row">
            <span>{myRole === 'fundador' ? 'La granja pasa a otro integrante (si quedás solo, se borra).' : 'Lo que aportaste queda en la granja.'}</span>
            <button className="danger-btn solid" onClick={async () => { try { await rpc('bb_mt_farm_leave'); await online.refreshMe(); } catch (e) { setErr(e.message); } }}>Salir</button>
            <button className="chip-btn" onClick={() => setLeave(0)}>Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Filacolor ----------
function FilacolorTab() {
  const [pick, setPick] = useState(['PLA', 'PETG', 'TPU']);
  const [extra, setExtra] = useState(null);
  useEffect(() => { getSetting('filacolor').then(setExtra).catch(() => {}); }, []);
  const highlights = (extra?.highlights?.length ? extra.highlights : FILACOLOR.highlights);
  const mats = FILACOLOR.materials.filter((m) => pick.includes(m.id));
  const toggle = (id) => setPick((p) => (p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : p.length >= 3 ? [...p.slice(1), id] : [...p, id]));
  const link = (h) => (h.url && /^https:\/\//.test(h.url) ? h.url : fcUrl(h.path || '/'));
  return (
    <div className="fc">
      <div className="fc-head">
        <img src={fcLogo} alt="Filacolor" className="fc-logo" />
        <span className="fc-badge">PROVEEDOR OFICIAL · COMUNIDAD MAKERS 3DBAT</span>
      </div>
      {extra?.banner?.text && <a className="fc-banner" href={link(extra.banner)} target="_blank" rel="noopener noreferrer">{extra.banner.text} ↗</a>}
      <p className="fc-about">{FILACOLOR.about}</p>
      <div className="fc-ctas">
        <a className="fc-btn" href={fcUrl(FILACOLOR.links.filamentos)} target="_blank" rel="noopener noreferrer"><Icon name="spool" size={16} /> Ver filamentos</a>
        <a className="fc-btn" href={fcUrl(FILACOLOR.links.impresoras)} target="_blank" rel="noopener noreferrer"><Icon name="printer" size={16} /> Impresoras</a>
        <a className="fc-btn" href={fcUrl(FILACOLOR.links.repuestos)} target="_blank" rel="noopener noreferrer"><Icon name="wrench" size={16} /> Repuestos</a>
        <a className="fc-btn alt" href={fcUrl(FILACOLOR.links.servicio)} target="_blank" rel="noopener noreferrer"><Icon name="settings" size={16} /> Servicio técnico</a>
      </div>

      <div className="section-label">DESTACADOS</div>
      <div className="fc-highlights">
        {highlights.slice(0, 4).map((h, i) => (
          <a key={i} className="fc-hl" href={link(h)} target="_blank" rel="noopener noreferrer">
            {h.image && /^https:\/\//.test(h.image) && <img src={h.image} alt="" loading="lazy" />}
            <b>{h.title}</b><small>{h.text}</small>
          </a>
        ))}
      </div>

      <div className="section-label">COMPARADOR DE MATERIALES</div>
      <div className="fc-mat-pick">{FILACOLOR.materials.map((m) => <button key={m.id} className={'opt sm' + (pick.includes(m.id) ? ' active' : '')} onClick={() => toggle(m.id)}>{m.id}</button>)}</div>
      <div className="fc-compare" style={{ gridTemplateColumns: `repeat(${mats.length}, minmax(0,1fr))` }}>
        {mats.map((m) => (
          <div key={m.id} className="fc-mat">
            <div className="fc-mat-h"><i style={{ background: m.color }} /><b>{m.id}</b></div>
            <small>{m.desc}</small>
            {Object.entries(SCORE_LABELS).map(([k, l]) => (
              <div key={k} className="fc-score"><span>{l}</span><span className="dots">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= m.score[k] ? 'on' : ''} />)}</span></div>
            ))}
            <div className="fc-kv"><span>Boquilla</span><b>{m.nozzle}</b></div>
            <div className="fc-kv"><span>Cama</span><b>{m.bed}</b></div>
            <div className="fc-kv"><span>Cerramiento</span><b>{m.enclosure}</b></div>
            <small><b>Ideal para:</b> {m.ideal}</small>
            <small className="muted">{m.note}</small>
            <a className="chip-btn wide fc-link" href={fcUrl(m.path)} target="_blank" rel="noopener noreferrer">Ver {m.id} en Filacolor ↗</a>
          </div>
        ))}
      </div>

      <div className="section-label">SERVICIO TÉCNICO</div>
      <ul className="fc-services">{FILACOLOR.services.map((x) => <li key={x}>✔ {x}</li>)}</ul>
      <div className="fc-ctas">
        <a className="fc-btn" href={FILACOLOR.whatsapp + '?text=' + encodeURIComponent('Hola, vengo de 3DBAT. Quiero pedir un turno para el servicio técnico.')} target="_blank" rel="noopener noreferrer"><Icon name="clock" size={16} /> Pedir turno por WhatsApp</a>
        <a className="fc-btn alt" href={FILACOLOR.instagram} target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={16} /> @filacolor</a>
      </div>

      <div className="section-label">MARCAS</div>
      <div className="fc-brands">{FILACOLOR.brands.map((b) => <span key={b}>{b}</span>)}</div>
      <p className="hint">📍 {FILACOLOR.address} · {FILACOLOR.hours} · {FILACOLOR.shipping}.</p>
      <p className="hint disclaimer">Precios, stock y promociones: siempre en filacolor.com.ar. 3DBAT: Maker Tycoon es un juego de 3DBAT IMPRESIONES; Filacolor es el proveedor oficial de la Comunidad Makers 3DBAT.</p>
    </div>
  );
}

// ---------- Sugerencias ----------
const FB_KINDS = [['idea', '💡 Una idea'], ['error', '🐞 Algo anda mal'], ['otro', '💬 Otra cosa']];
export function FeedbackModal({ s, online, onClose }) {
  const [kind, setKind] = useState('idea');
  const [msg, setMsg] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const send = async () => {
    setBusy(true); setErr('');
    try {
      await rpc('bb_mt_feedback_send', { p_message: msg, p_kind: kind, p_contact: contact || null,
        p_context: { v: s.v, space: s.space, machines: s.machines.length, ua: (navigator.userAgent || '').slice(0, 120), w: window.innerWidth } });
      setSent(true);
    } catch (e) { setErr(e.missing ? 'Las sugerencias todavía no están activadas. Probá en un rato.' : e.message); }
    setBusy(false);
  };
  return (
    <Modal title="Sugerencias" icon="message" onClose={onClose}>
      {sent ? (
        <div className="ol-soon">
          <BatiArt mood="happy" size={80} />
          <p><b>¡Gracias! Ya le llegó al equipo de 3DBAT.</b> Las leemos todas: muchas de las cosas del juego salieron de ideas de la comunidad.</p>
          <button className="btn-center" onClick={onClose}>Seguir jugando</button>
        </div>
      ) : (
        <>
          <p className="hint">¿Qué te gustaría que tenga el juego? ¿Algo no funciona como esperabas? Contanos: lo lee el equipo de 3DBAT.</p>
          <div className="priv-grid fb-kinds">{FB_KINDS.map(([k, l]) => <button key={k} className={'opt' + (kind === k ? ' active' : '')} onClick={() => setKind(k)}>{l}</button>)}</div>
          <div className="pink-input fb-text"><textarea rows={5} maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)}
            placeholder={kind === 'error' ? 'Ej.: cuando compro una máquina en el celular, la pantalla…' : 'Ej.: estaría bueno poder pintar las piezas antes de venderlas…'} /></div>
          <small className="muted fb-count">{msg.length}/1000</small>
          {!online?.user && (
            <label className="ol-field">Si querés que te respondamos (opcional)
              <div className="pink-input"><input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} placeholder="Tu Instagram, Discord o correo" /></div>
            </label>
          )}
          {online?.user && <p className="hint">La mandás como {online.me?.player?.nick || online.user.email}.</p>}
          <Err e={err} />
          <button className="btn-center" disabled={busy || msg.trim().length < 5} onClick={send}><Icon name="message" size={16} /> {busy ? 'Enviando…' : 'Mandar sugerencia'}</button>
        </>
      )}
    </Modal>
  );
}

// ---------- Elegir partida ----------
function SaveCard({ title, sm, when, device, onPick, label, primary }) {
  return (
    <div className="save-card">
      <div className="section-label">{title}</div>
      <b className="sc-name">{sm.name || 'Taller sin nombre'}</b>
      <div className="sc-kv"><span>Lugar</span><b>{SPACES[Math.min(SPACES.length - 1, sm.space || 0)]?.name}</b></div>
      <div className="sc-kv"><span>Ganado en total</span><b>{money(sm.totalEarned || 0)}</b></div>
      <div className="sc-kv"><span>Plata</span><b>{money(sm.money || 0)}</b></div>
      <div className="sc-kv"><span>Máquinas</span><b>{num(sm.machines || 0)}</b></div>
      <div className="sc-kv"><span>Piezas</span><b>{num(sm.pieces || 0)}</b></div>
      <div className="sc-kv"><span>Mudanzas</span><b>{num(sm.moves || 0)}</b></div>
      {when && <small className="muted">Guardada {ago(when)}{device ? ` · ${device}` : ''}</small>}
      <button className={primary ? 'btn-center' : 'btn-alt'} onClick={onPick}>{label}</button>
    </div>
  );
}

export function ConflictModal({ conflict, onChoose }) {
  const c = conflict.cloud;
  const sm = c?.summary || {};
  const cloudBigger = (sm.totalEarned || 0) >= (conflict.local.totalEarned || 0);
  return (
    <div className="modal-back">
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Elegí qué partida usar">
        <div className="modal-head"><div className="card-icon"><Icon name="info" /></div><h2>Tenés dos partidas distintas</h2></div>
        <div className="modal-body">
          <p className="hint">{conflict.reason === 'cloudNewer'
            ? 'Mientras jugabas acá, se guardó una partida más nueva desde otro dispositivo.'
            : 'En tu cuenta ya hay una partida guardada y es distinta a la de este navegador.'} Elegí con cuál seguir: <b>la otra no se borra</b>, queda guardada como copia de seguridad.</p>
          <div className="save-pick">
            <SaveCard title="EN LA NUBE" sm={sm} when={c?.updated_at} device={c?.device} label="Usar la de la nube" primary={cloudBigger} onPick={() => onChoose('cloud')} />
            <SaveCard title="EN ESTE DISPOSITIVO" sm={conflict.local} label="Usar la de este dispositivo" primary={!cloudBigger} onPick={() => onChoose('local')} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LockedOverlay({ onTakeOver }) {
  return (
    <div className="modal-back">
      <div className="modal" role="dialog" aria-modal="true" aria-label="El juego está abierto en otra pestaña">
        <div className="ev-top"><BatiArt mood="wink" size={72} /><p className="ev-text"><b>El taller está abierto en otra pestaña.</b> Para que no se pisen la partida, juega una sola a la vez.</p></div>
        <button className="btn-center" onClick={onTakeOver}>Jugar en esta pestaña</button>
        <p className="hint">La otra pestaña se pausa sola y guarda antes.</p>
      </div>
    </div>
  );
}
