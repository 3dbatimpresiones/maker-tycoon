import Icon from './Icon.jsx';
import * as E from '../game/engine.js';
import { MATERIALS } from '../game/data.js';
import { money, rate, kg } from '../game/format.js';
import { VERSION, LINKS } from '../config.js';

export function Header({ s, actions, open }) {
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
        <div className="pill">Se guarda solo en este navegador · <span className="c-pink">sin registro</span></div>
      </div>
      <div className="project-name">
        <label htmlFor="tallerName">NOMBRE DEL TALLER</label>
        <input id="tallerName" type="text" placeholder="MI TALLER" maxLength={28} value={s.name}
          onChange={(e) => actions.setName(e.target.value)} onFocus={(e) => e.target.select()} />
      </div>
      <div className="top-actions">
        <a className="icon-btn hide-sm" href={LINKS.instagram} target="_blank" rel="noopener noreferrer" title="Instagram de 3DBAT"><Icon name="instagram" /></a>
        <a className="icon-btn hide-sm" href={LINKS.batbox} target="_blank" rel="noopener noreferrer" title="BATBOX: herramientas y tutoriales gratis"><Icon name="box" /></a>
        <button className="icon-btn hide-sm" onClick={() => open('logros')} title="Logros"><Icon name="trophy" /></button>
        <button className={'icon-btn hide-sm' + (E.canMove(s) ? ' attn' : '')} onClick={() => open('oficio')} title="Oficio y Mudanza"><Icon name="award" /></button>
        <button className="icon-btn" onClick={() => actions.setting('sound', !s.settings.sound)} title={s.settings.sound ? 'Silenciar' : 'Activar sonido'}>
          <Icon name={s.settings.sound ? 'volume' : 'mute'} />
        </button>
        <button className="icon-btn" onClick={() => open('ajustes')} title="Ajustes"><Icon name="settings" /></button>
      </div>
    </header>
  );
}

export function Hud({ s, onFilament }) {
  const rp = E.repProgress(s);
  const r = E.incomeRate(s);
  const mats = Object.keys(MATERIALS).filter((m) => E.materialUnlocked(s, m) || s.fil[m] > 0);
  return (
    <div className="hud" role="region" aria-label="Recursos">
      <div className="hud-money">
        <span className="hud-label">DINERO</span>
        <b title={'$' + Math.floor(s.money).toLocaleString('es-AR')}>{money(s.money)}</b>
        <small>{rate(r)}</small>
      </div>
      <div className="hud-rep" title={rp.next ? `${Math.floor(rp.cur)} / ${rp.next} para el próximo nivel` : 'Nivel máximo'}>
        <span className="hud-label">REPUTACIÓN</span>
        <b>⭐ {rp.level}</b>
        <div className="mini-bar"><i style={{ width: `${Math.round(rp.frac * 100)}%` }} /></div>
      </div>
      <button className="hud-fil" onClick={onFilament} title="Comprar filamento">
        <span className="hud-label">FILAMENTO</span>
        <div className="fil-chips">
          {mats.map((m) => (
            <span key={m} className={'fil-chip' + (s.fil[m] < 100 ? ' low' : '')}>
              <i style={{ background: MATERIALS[m].color }} />{m} <b>{kg(s.fil[m])}</b>
            </span>
          ))}
        </div>
      </button>
      {s.prestige.total > 0 && (
        <div className="hud-maker">
          <span className="hud-label">NIVEL MAKER</span>
          <b>{E.makerTitle(s.prestige.total)}</b>
          <small>+{Math.round(s.prestige.total * 3)} % ingresos</small>
        </div>
      )}
    </div>
  );
}
