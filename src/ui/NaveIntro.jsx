// Aviso grande al llegar a la Nave de producción (nivel 6) y a la Planta 3DBAT (nivel 7):
// explica cómo cambia el taller con los pisos por tecnología.
import { Modal } from './Panels.jsx';
import { BatiArt } from './Bati.jsx';
import * as E from '../game/engine.js';
import { FLOORS, FLOOR_SLOTS } from '../game/data.js';

// Qué aviso toca mostrar (o null). Se muestra una sola vez por partida.
export function naveIntroKey(s) {
  if (s.space >= 6 && !s.seen?.planta7) return 'planta7';
  if (s.space >= 5 && !s.seen?.nave6) return 'nave6';
  return null;
}

export default function NaveIntro({ s, which, actions, onClose }) {
  const planta = which === 'planta7';
  const done = () => {
    // En la Planta no hace falta volver a explicar la Nave.
    actions.markSeen(which);
    if (planta) actions.markSeen('nave6');
    actions.setting('floor', s.settings.floor || 'fdm');
    onClose();
  };
  const counts = FLOORS.map((f) => ({ ...f, n: E.floorMachines(s, f.id).length, on: E.techUnlocked(s, f.id) }));
  const over = counts.filter((f) => f.n > FLOOR_SLOTS);
  return (
    <Modal title={planta ? '¡Llegaste a la Planta 3DBAT! · Nivel 7' : '¡Nave de producción! · Nivel 6'} icon="factory" onClose={done} wide className="nave-intro">
      <div className="ni-hero">
        <BatiArt mood="happy" size={86} />
        <div>
          <h3>{planta ? 'La fábrica maker definitiva' : 'Tu taller ahora tiene 4 pisos'}</h3>
          <p>{planta
            ? 'Los mismos 4 pisos de la Nave, pero premium y automatizados: recepción con tu marca, brazos robóticos, cartelería digital y contratos especiales que pagan mucho más.'
            : 'Desde acá el taller deja de ser un solo salón: se organiza en cuatro pisos, uno por tecnología. Cada piso tiene su ambiente, su lugar y sus máquinas. Te cuento qué cambia.'}</p>
        </div>
      </div>

      <div className="ni-floors">
        {counts.map((f, i) => (
          <div key={f.id} className={'ni-floor f-' + f.id + (f.on ? '' : ' locked')}>
            <span className="ni-ic">{f.icon}</span>
            <b>Piso {i + 1} · {f.long}</b>
            <small>{f.on ? `${f.n}/${FLOOR_SLOTS} máquinas` : '🔒 Desbloquealo en Mejoras'}</small>
            <em>{f.blurb}</em>
          </div>
        ))}
      </div>

      <div className="ni-list">
        <div><span>🏭</span><p><b>4 pisos × 20 lugares = hasta 80 máquinas.</b> Cada tecnología tiene su propio piso: FDM, Resina, Láser y CNC. Ya no compiten por el mismo espacio.</p></div>
        <div><span>✅</span><p><b>No perdiste nada.</b> Cada máquina que tenías se mudó sola a su piso (las FDM al piso 1), con su producto, su desgaste y su experiencia.{over.length > 0 && <> En {over.map((f) => f.name).join(' y ')} tenés más de 20: siguen todas funcionando, solo que no vas a poder sumar otra ahí hasta bajar de 20.</>}</p></div>
        <div><span>🔀</span><p><b>Barra de pisos, justo debajo del taller:</b> <code>FDM 12/20 · RESINA 4/20 · LÁSER 2/20 · CNC 0/20</code>. Tocá uno y el taller cambia a ese piso. Un <b>puntito rojo</b> te avisa que en otro piso hay algo para atender (una pieza lista, un problema o una máquina esperando).</p></div>
        <div><span>⚡</span><p><b>Todos los pisos trabajan a la vez,</b> aunque estés mirando otro. Lo que produce cada uno suma a tu plata, tu reputación, la experiencia y el ranking.</p></div>
        <div><span>🛒</span><p><b>Comprar:</b> cada máquina va directo a su piso y el juego te lleva a verla. Si un piso está lleno (20/20), vendé una de ese piso o usá el <b>Plan canje</b> para cambiarla por una mejor.</p></div>
        <div><span>↔️</span><p><b>Reorganizar:</b> en el ⚙ de cada máquina tenés <b>◀ Mover / Mover ▶</b> para acomodarla como quieras dentro de su piso. Una máquina nunca pasa a otro piso.</p></div>
        <div><span>🔀</span><p><b>Pedidos combinados:</b> clientes que necesitan trabajo de varios pisos a la vez (por ejemplo, un cartel láser + soportes FDM + una pieza CNC). Pagan <b>×3,5</b> y dan una ficha por cada tecnología.</p></div>
        {planta
          ? <div><span>🏢</span><p><b>Contratos especiales de la Planta:</b> los contratos de empresa pagan <b>×5,5</b> (en vez de ×4) y dan 2 fichas extra. Es la etapa final: llená los 80 lugares.</p></div>
          : <div><span>🎨</span><p><b>Cada piso tiene su ambiente:</b> el FDM Lab con estantes de filamento y pantallas; el Resin Lab oscuro, con luz UV, estaciones de lavado y curado; el Laser Workshop con extractores y balizas; y la CNC Factory con colector de polvo y virutas. Después viene la <b>Planta 3DBAT</b> (nivel 7): los mismos 4 pisos en versión premium y contratos especiales que pagan ×5,5.</p></div>}
        {counts.some((f) => !f.on) && <div><span>🔓</span><p><b>Para llenar los otros pisos</b> desbloqueá Resina, Láser y CNC en <b>Tienda → Mejoras</b>. Mientras tanto, esos pisos esperan vacíos.</p></div>}
      </div>
      <button className="btn-center" onClick={done}>¡Vamos a la nave!</button>
    </Modal>
  );
}
