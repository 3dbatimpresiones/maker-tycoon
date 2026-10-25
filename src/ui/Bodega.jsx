// Bodega (idea de Elcompy): máquinas guardadas para intercambiar cuando haga falta.
import { Modal } from './Panels.jsx';
import { MachineThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { MACHINES } from '../game/data.js';

export default function Bodega({ s, actions, onClose }) {
  const list = s.storage || [];
  return (
    <Modal title={`Bodega · ${list.length}/${E.storageCap(s)}`} icon="box" onClose={onClose} className="bodega-modal">
      <p className="hint">Guardá máquinas que no estés usando y volvelas a poner cuando las necesites (por ejemplo, para cambiar de producto o de piso). En la bodega <b>no producen ni se gastan</b>, y conservan sus mods. Para guardar una, tocá su ⚙ → «Guardar en la bodega». La bodega crece con tu taller.</p>
      {list.length === 0 && <p className="ol-empty">La bodega está vacía.</p>}
      <div className="bodega-list">
        {list.map((m, i) => {
          const M = MACHINES[m.model];
          const why = E.unstoreReason(s, i);
          return (
            <div key={m.id} className="bodega-row">
              <MachineThumb model={m.model} className="bd-thumb" />
              <span className="bd-txt"><b>{M.brand === 'Bambu Lab' ? 'Bambu' : M.brand} {M.name}</b><small>Desgaste {E.wearPct(m)} %{(m.mods || []).length ? ` · ${m.mods.length} mods` : ''}</small></span>
              <button className="chip-btn" disabled={!!why} title={why || 'Volver a ponerla en el taller'} onClick={() => actions.unstoreMachine(i)}>{why || 'Sacar al taller'}</button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
