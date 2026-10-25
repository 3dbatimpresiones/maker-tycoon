// Estadísticas del taller: producción, ganancias, fallas, mejor máquina, clientes, proyectos y Expos.
import { Modal } from './Panels.jsx';
import { MachineThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { MACHINES, MACHINE_EVENTS, PRODUCTS } from '../game/data.js';
import { money, num, rate, dur } from '../game/format.js';

const fullM = (M) => `${M.brand === 'Bambu Lab' ? 'Bambu' : M.brand} ${M.name}`;

export default function StatsModal({ s, onClose }) {
  const st = s.stats;
  const ms = [...s.machines].map((m) => ({ m, M: MACHINES[m.model], made: m.made || 0, earned: m.earned || 0, fails: m.fails || 0 }));
  const best = [...ms].sort((a, b) => b.earned - a.earned || b.made - a.made)[0];
  const top = [...ms].sort((a, b) => b.made - a.made).slice(0, 8);
  const maxMade = Math.max(1, ...top.map((x) => x.made));
  const events = Object.entries(st.events || {}).sort((a, b) => b[1] - a[1]);
  const totalFails = events.reduce((a, [, n]) => a + n, 0);
  const prods = Object.entries(s.mastery || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const clients = Object.keys(s.orders.clients || {});
  const fieles = clients.filter((n) => E.clientOf(s, n).trust >= 80).length;
  const okRate = st.orders + st.ordersFailed ? Math.round((st.orders / (st.orders + st.ordersFailed)) * 100) : 100;
  return (
    <Modal title="Estadísticas del taller" icon="target" onClose={onClose} wide className="stats-modal">
      <div className="st-cards">
        <div><span>Ganado en total</span><b>{money(s.totalEarned)}</b><small>ahora {rate(E.incomeRate(s))}</small></div>
        <div><span>Piezas fabricadas</span><b>{num(st.pieces)}</b><small>{num(st.xl || 0)} grandes (L/XL)</small></div>
        <div><span>Pedidos entregados</span><b>{num(st.orders)}</b><small>{okRate} % a tiempo · {num(st.contracts || 0)} contratos</small></div>
        <div><span>Fallas resueltas</span><b>{num(totalFails)}</b><small>{num(st.cortes || 0)} cortes de luz</small></div>
        <div><span>Tiempo jugado</span><b>{dur(st.playSecs || s.time)}</b><small>{num(st.mates)} mates cebados</small></div>
        <div><span>Proyectos y Expos</span><b>{num(st.projects || 0)} · {num(s.city?.expos || 0)}</b><small>{num(s.city?.expoWins || 0)} Expos ganadas</small></div>
      </div>

      {best && best.made > 0 && (
        <div className="st-best">
          <MachineThumb model={best.m.model} className="st-thumb" />
          <div><span className="section-label">🏆 MEJOR MÁQUINA</span><b>{fullM(best.M)}</b>
            <small>{num(best.made)} piezas · {money(best.earned)} en ventas directas · {num(best.fails)} fallas{(best.m.mods || []).length ? ` · ${best.m.mods.length} mods` : ''}</small></div>
        </div>
      )}

      <div className="st-grid">
        <div>
          <div className="section-label">PRODUCCIÓN POR MÁQUINA</div>
          {top.every((x) => !x.made) && <p className="hint">Se empieza a contar desde esta versión: en un rato aparecen tus máquinas.</p>}
          {top.filter((x) => x.made).map((x) => (
            <div key={x.m.id} className="st-bar">
              <span>{fullM(x.M)}</span>
              <i><em style={{ width: `${(x.made / maxMade) * 100}%` }} /></i>
              <b>{num(x.made)}</b>
            </div>
          ))}
        </div>
        <div>
          <div className="section-label">LO QUE MÁS FABRICASTE</div>
          {prods.map(([pid, n]) => PRODUCTS[pid] && <div key={pid} className="st-row"><span>{PRODUCTS[pid].name}</span><b>{num(n)}</b></div>)}
          <div className="section-label">FALLAS MÁS COMUNES</div>
          {events.length ? events.slice(0, 5).map(([id, n]) => MACHINE_EVENTS[id] && <div key={id} className="st-row"><span>{MACHINE_EVENTS[id].icon} {MACHINE_EVENTS[id].name}</span><b>{num(n)}</b></div>)
            : <p className="hint">Ninguna todavía. ¡Qué suerte!</p>}
          <div className="section-label">CLIENTES</div>
          <div className="st-row"><span>Clientes atendidos</span><b>{num(clients.length)}</b></div>
          <div className="st-row"><span>Clientes fieles</span><b>{num(fieles)}</b></div>
          <div className="st-row"><span>Pedidos que se llevó un rival</span><b>{num(s.city?.stolen || 0)}</b></div>
        </div>
      </div>
    </Modal>
  );
}
