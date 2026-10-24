import Icon from './Icon.jsx';
import * as E from '../game/engine.js';
import { MATERIALS, MATERIAL_ORDER, MACHINES } from '../game/data.js';
import { money, rate, kg, num, full } from '../game/format.js';
import { VERSION, LINKS, BATBOX_HERE } from '../config.js';
import { CurrencyToggle } from './Panels.jsx';
import { CloudPill, AccountChip, LiveChip } from './Online.jsx';
import { useSpotify } from './Spotify.jsx';

export const readyClaims = (s) => [s.daily, s.weekly].filter(Boolean).reduce((a, set) => a + set.list.filter((c) => !c.claimed && c.prog >= c.target).length, 0);

export function Header({ s, actions, open, online }) {
  const sp = useSpotify();
  return (
    <header className="topbar">
      <div className="top-left">
        <div className="brand">
          <div className="brand-logo"><Icon name="box" size={26} /></div>
          <div>
            <h1>MAKER TYCOON <span className="c-cyan">3DBAT</span> <span className="c-cyan">v{VERSION}</span></h1>
            <p className="tagline">De una impresora en el escritorio a tu propio taller</p>
          </div>
        </div>
        {BATBOX_HERE && <a className="back-bb" href={BATBOX_HERE + '#/juego'} title="Volver a BATBOX"><Icon name="arrowLeft" size={16} /> BATBOX</a>}
        <CloudPill online={online} s={s} open={open} />
        <LiveChip live={online.live} open={open} />
      </div>
      <div className="project-name">
        <label htmlFor="tallerName">NOMBRE DEL TALLER</label>
        <input id="tallerName" type="text" placeholder="MI TALLER" maxLength={28} value={s.name}
          onChange={(e) => actions.setName(e.target.value)} onFocus={(e) => e.target.select()} />
      </div>
      <div className="top-actions">
        <AccountChip online={online} open={open} />
        <CurrencyToggle s={s} actions={actions} compact />
        <a className="icon-btn lbl-btn hide-sm" href={LINKS.instagram} target="_blank" rel="noopener noreferrer" title="Instagram de 3DBAT"><Icon name="instagram" /><span>Instagram</span></a>
        {!BATBOX_HERE && <a className="icon-btn lbl-btn hide-sm" href={LINKS.batbox} target="_blank" rel="noopener noreferrer" title="BATBOX: herramientas y tutoriales gratis"><Icon name="box" /><span>BATBOX</span></a>}
        <button className="icon-btn lbl-btn hide-sm" onClick={() => open('online', null, 'ranking')} title="Ranking, retos y granjas"><Icon name="users" /><span>Ranking</span></button>
        <button className="icon-btn lbl-btn hide-sm" onClick={() => open('logros')} title="Logros"><Icon name="trophy" /><span>Logros</span></button>
        <button className={'icon-btn lbl-btn hide-sm' + (readyClaims(s) ? ' attn' : '')} onClick={() => open('desafios')} title="Desafíos"><Icon name="target" /><span>Desafíos</span></button>
        <button className={'icon-btn lbl-btn hide-sm' + (E.canMove(s) ? ' attn' : '')} onClick={() => open('oficio')} title="Oficio y Mudanza"><Icon name="award" /><span>Mudanza</span></button>
        <button className="icon-btn lbl-btn" onClick={() => actions.setting('sound', !s.settings.sound)} title={s.settings.sound ? 'Silenciar' : 'Activar sonido'}>
          <Icon name={s.settings.sound ? 'volume' : 'mute'} /><span>{s.settings.sound ? 'Sonido' : 'Sin sonido'}</span>
        </button>
        <button className={'icon-btn lbl-btn spotify-btn' + (sp.playing ? ' on' : '')} onClick={() => sp.toggle()} title="Escuchá tu música de Spotify mientras jugás"><Icon name="spotify" /><span>{sp.playing ? 'Sonando' : 'Spotify'}</span></button>
        <button className="icon-btn lbl-btn" onClick={() => open('ajustes')} title="Ajustes"><Icon name="settings" /><span>Ajustes</span></button>
      </div>
    </header>
  );
}

const SHORT = { PACF: 'PA-CF', ACRILICO: 'Acrílico', MADERA: 'Madera', RESINA: 'Resina', ALU: 'Alu', ASA: 'ASA' };

export function Hud({ s, onFilament, onTokens }) {
  const rp = E.repProgress(s);
  const r = E.incomeRate(s);
  const mats = MATERIAL_ORDER.filter((m) => s.mat[m] > 0 || (E.materialUnlocked(s, m) && E.techUnlocked(s, MATERIALS[m].tech) && s.machines.some((x) => MACHINES[x.model].tech === MATERIALS[m].tech)));
  return (
    <div className="hud" role="region" aria-label="Recursos">
      <div className="hud-money">
        <span className="hud-label">DINERO</span>
        <b title={full(s.money)}>{money(s.money)}</b>
        <small>{rate(r)}</small>
      </div>
      <div className="hud-rep" title={rp.next ? `${Math.floor(rp.cur)} / ${rp.next} para el próximo nivel` : 'Nivel máximo'}>
        <span className="hud-label">REPUTACIÓN</span>
        <b>⭐ {rp.level}</b>
        <div className="mini-bar"><i style={{ width: `${Math.round(rp.frac * 100)}%` }} /></div>
      </div>
      <button className="hud-fil" onClick={onFilament} title="Comprar filamento">
        <span className="hud-label">MATERIALES</span>
        <div className="fil-chips">
          {mats.map((m) => (
            <span key={m} className={'fil-chip' + (s.mat[m] < 100 ? ' low' : '')}>
              <i style={{ background: MATERIALS[m].color }} />{SHORT[m] || m} <b>{MATERIALS[m].unitName === 'bobina' || MATERIALS[m].unitName === 'litro' ? kg(s.mat[m]) : `${(s.mat[m] / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} u`}</b>
            </span>
          ))}
        </div>
      </button>
      <button className="hud-tokens" onClick={onTokens} title="Desafíos y fichas">
        <span className="hud-label">FICHAS</span>
        <b>🎟️ {num(s.tokens)}</b>
        {readyClaims(s) > 0 && <small className="c-pink">¡{readyClaims(s)} para cobrar!</small>}
      </button>
      {s.prestige.total > 0 && (
        <div className="hud-maker">
          <span className="hud-label">NIVEL MAKER</span>
          <b>{E.makerTitle(s.prestige.total)}</b>
          <small>+{num(E.oficioPct(s.prestige.total))} % ingresos</small>
        </div>
      )}
    </div>
  );
}
