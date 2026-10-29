// Bodega (idea de Elcompy): máquinas guardadas para intercambiar cuando haga falta.
import { useState } from 'react';
import { Modal } from './Panels.jsx';
import { MachineThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { MACHINES } from '../game/data.js';
import { money } from '../game/format.js';

export default function Bodega({ s, actions, onClose }) {
  const list = s.storage || [];
  const [selling, setSelling] = useState(null);
  return (
    <Modal title={`Bodega · ${list.length}/${E.storageCap(s)}`} icon="box" onClose={onClose} className="bodega-modal">
      <p className="hint">Guardá máquinas que no estés usando y volvelas a poner cuando las necesites (por ejemplo, para cambiar de producto o de piso). En la bodega <b>no producen ni se gastan</b>, y conservan sus mods. También podés venderlas desde acá, sin sacar una del taller. La bodega crece con tu taller.</p>
      {list.length === 0 && <p className="ol-empty">La bodega está vacía.</p>}
      <div className="bodega-list">
        {list.map((m, i) => {
          const M = MACHINES[m.model];
          const why = E.unstoreReason(s, i);
          const refund = Math.round((m.paid || 0) * 0.5);
          const confirming = selling === m.id;
          return (
            <div key={m.id} className="bodega-row">
              <MachineThumb model={m.model} className="bd-thumb" />
              <span className="bd-txt"><b>{M.brand === 'Bambu Lab' ? 'Bambu' : M.brand} {M.name}</b><small>Desgaste {E.wearPct(m)} %{(m.mods || []).length ? ` · ${m.mods.length} mods` : ''}</small></span>
              <button className="chip-btn" disabled={!!why} title={why || 'Volver a ponerla en el taller'} onClick={() => actions.unstoreMachine(i)}>{why || 'Sacar al taller'}</button>
              {!confirming
                ? <button className="danger-btn" onClick={() => setSelling(m.id)}>Vender · {money(refund)}</button>
                : <span className="confirm-row"><span>¿Vender por {money(refund)}?</span><button className="danger-btn solid" onClick={() => actions.sellStoredMachine(i)}>Sí</button><button className="chip-btn" onClick={() => setSelling(null)}>No</button></span>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
