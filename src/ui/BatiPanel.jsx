// Ventana de BATI: la historia (capítulos con decisiones), sus accesorios y cuánto te ayuda.
import { useState } from 'react';
import { Modal } from './Panels.jsx';
import { BatiArt } from './Bati.jsx';
import { CHAPTERS, BATI_ACCS, batiOf, currentChapter, storyOf } from '../game/bati.js';

const TABS = [['historia', '📖 Historia'], ['accesorios', '🧢 Accesorios'], ['ayuda', '🦇 Ayuda']];
const HELP = [
  ['principiante', 'Principiante', 'Te aviso de todo y seguido: máquinas gastadas, pedidos que convienen, oportunidades del mapa, rivales.'],
  ['normal', 'Normal', 'Te aviso de lo importante cada tanto.'],
  ['experto', 'Experto', 'Solo te hablo si hay algo urgente (máquinas paradas, muy gastadas o una Expo abierta).'],
];

function Story({ s, actions }) {
  const c = currentChapter(s);
  const st = storyOf(s);
  return (
    <>
      <div className="story-steps">
        {CHAPTERS.map((ch, i) => <span key={ch.id} className={i < st.i ? 'ok' : i === st.i ? 'cur' : ''} title={ch.title}>{i < st.i ? '✔' : i + 1}</span>)}
      </div>
      {!c ? (
        <div className="story-end"><BatiArt mood="happy" size={90} /><p><b>¡Terminaste toda la historia de BATI!</b> Vienen más capítulos en las próximas versiones.</p></div>
      ) : (
        <div className="story-card">
          <small className="section-label">CAPÍTULO {st.i + 1} DE {CHAPTERS.length}</small>
          <h3>{c.ch.title}</h3>
          <div className="story-lines">{c.ch.intro.map((l) => { const [who, ...rest] = l.split(': '); return <p key={l}><b>{who}:</b> {rest.join(': ')}</p>; })}</div>
          <div className="story-goal">🎯 <b>Objetivo:</b> {c.ch.goal}</div>
          <div className="story-prize">Premio: accesorio {BATI_ACCS[c.ch.acc].icon} <b>{BATI_ACCS[c.ch.acc].name}</b> + {c.ch.choice.map(([l]) => l).join(' o ')}</div>
          {c.locked ? <p className="o-warn soft">Se desbloquea con Reputación {c.ch.rep}.</p>
            : !c.st.started ? <button className="btn-center" onClick={() => actions.startChapter()}>¡Acepto el desafío!</button>
            : !c.ready ? <p className="hint">En marcha… cuando lo cumplas, volvé acá a cobrar.</p>
            : (
              <>
                <p className="story-end-line">{c.ch.end}</p>
                <div className="story-choice">
                  <b>¿Qué premio elegís?</b>
                  {c.ch.choice.map(([l], i) => <button key={l} className="btn-center" onClick={() => actions.finishChapter(i)}>{l}</button>)}
                </div>
              </>
            )}
        </div>
      )}
    </>
  );
}

function Wardrobe({ s, actions }) {
  const b = batiOf(s);
  return (
    <>
      <div className="wardrobe-hero"><BatiArt mood="happy" size={110} acc={b.wear} /></div>
      <div className="wardrobe">
        <button className={'acc' + (!b.wear ? ' on' : '')} onClick={() => actions.setBatiWear(null)}><span>🦇</span><b>Sin accesorio</b></button>
        {Object.entries(BATI_ACCS).map(([k, a]) => {
          const has = b.accs.includes(k);
          return (
            <button key={k} className={'acc' + (b.wear === k ? ' on' : '') + (has ? '' : ' locked')} disabled={!has} onClick={() => actions.setBatiWear(k)} title={has ? a.name : `Se gana: ${a.from}`}>
              <span>{has ? a.icon : '🔒'}</span><b>{a.name}</b>{!has && <small>{a.from}</small>}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function BatiPanel({ s, actions, tab: tab0, onClose }) {
  const [tab, setTab] = useState(tab0 || 'historia');
  const help = s.settings.batiHelp || 'normal';
  return (
    <Modal title="BATI, tu encargado de planta" icon="user" onClose={onClose} wide className="bati-panel">
      <div className="view-toggle city-tabs">{TABS.map(([k, l]) => <button key={k} className={'seg' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'historia' && <Story s={s} actions={actions} />}
      {tab === 'accesorios' && <Wardrobe s={s} actions={actions} />}
      {tab === 'ayuda' && (
        <div className="help-levels">
          <p className="hint">¿Cuánto querés que te ayude mientras jugás?</p>
          {HELP.map(([k, l, d]) => (
            <button key={k} className={'help-lv' + (help === k ? ' on' : '')} onClick={() => actions.setting('batiHelp', k)}><b>{l}</b><small>{d}</small></button>
          ))}
          <p className="hint">Tip: en el chat escribí <b>@BATI ¿qué hago ahora?</b>, <b>@BATI tip FDM</b> o <b>/ayuda</b> para ver los comandos.</p>
        </div>
      )}
    </Modal>
  );
}

// Tira en el taller con el capítulo actual de la historia.
export function StoryStrip({ s, open }) {
  const c = currentChapter(s);
  if (!c || c.locked || s.tutorial.active) return null;
  if (!c.st.started) return <button className="story-strip" onClick={() => open('bati')}>📖 <b>Nuevo capítulo de la historia:</b> {c.ch.title}</button>;
  return (
    <button className={'story-strip' + (c.ready ? ' ready' : '')} onClick={() => open('bati')}>
      📖 <b>{c.ready ? '¡Capítulo cumplido! Tocá para elegir tu premio' : c.ch.title}</b>{!c.ready && <> · {c.ch.goal}</>}
    </button>
  );
}
