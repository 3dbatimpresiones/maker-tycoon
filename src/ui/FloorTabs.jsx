import * as E from '../game/engine.js';
import { FLOORS, FLOOR_SLOTS } from '../game/data.js';

// Barra de pisos de la Nave y la Planta: FDM / Resina / Láser / CNC con su cuenta.
export default function FloorTabs({ s, actions }) {
  if (!E.hasFloors(s)) return null;
  const cur = s.settings.floor || 'fdm';
  return (
    <div className="floor-tabs" role="tablist" aria-label="Pisos de la nave">
      {FLOORS.map((f, i) => {
        const fm = E.floorMachines(s, f.id);
        const n = fm.length;
        // Punto rojo: en ese piso hay algo para atender (lista, problema o esperando arrancar)
        const alert = cur !== f.id && fm.some((m) => m.waitStart || m.state === 'done' || m.event);
        return (
          <button key={f.id} role="tab" aria-selected={cur === f.id} className={'ft' + (cur === f.id ? ' active' : '') + (n >= E.floorCap(s) ? ' full' : '')}
            onClick={() => actions.setting('floor', f.id)} title={`Piso ${i + 1} · ${f.long}: ${f.blurb}`}>
            <span className="ft-ic">{f.icon}</span><b>{f.name.toUpperCase()}</b>{alert && <i className="ft-dot" />}<small>{E.techUnlocked(s, f.id) ? `${n}/${E.floorCap(s)}` : '🔒'}</small>
          </button>
        );
      })}
    </div>
  );
}
