// Granja: roles con misión semanal, pedido de colaboración y guerra amistosa de los sábados (migración 037).
import { useCallback, useEffect, useState } from 'react';
import { rpc } from '../online/api.js';
import { num } from '../game/format.js';

export const SPECIALTIES = [
  ['fdm', '🖨️', 'Responsable FDM', 'Fabricá 300 piezas FDM en la semana'],
  ['resin', '🧪', 'Especialista en resina', 'Fabricá 60 piezas de resina en la semana'],
  ['laser', '🔥', 'Especialista láser', 'Fabricá 80 piezas láser en la semana'],
  ['cnc', '⚙️', 'Especialista CNC', 'Fabricá 40 piezas CNC en la semana'],
  ['logistica', '🚚', 'Logística', 'Entregá 30 pedidos en la semana'],
  ['reclutador', '📣', 'Reclutador', 'Sumá un integrante nuevo a la granja esta semana'],
];
const SP = Object.fromEntries(SPECIALTIES.map((x) => [x[0], x]));
const TECHS = [['fdm', '🖨️ FDM'], ['resin', '🧪 Resina'], ['laser', '🔥 Láser'], ['cnc', '⚙️ CNC']];
const miss = (e) => e?.missing || /Could not find the function|PGRST202/i.test(e?.message || '');

export default function FarmSocial() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState(false);
  const load = useCallback(() => rpc('bb_mt_farm_social').then(setD).catch((e) => setErr(miss(e) ? 'missing' : e.message)), []);
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  if (err === 'missing') return <p className="hint">Roles, pedido de colaboración y guerra de granjas se activan con la migración 037 de BATBOX.</p>;
  if (!d || !d.farm) return err ? <p className="ol-err">{err}</p> : null;
  const choose = async (k) => { setErr(''); try { await rpc('bb_mt_farm_specialty', { p_specialty: k }); setPick(false); load(); } catch (e) { setErr(e.message); } };
  const c = d.colab;
  const tot = (o) => TECHS.reduce((a, [k]) => a + Number(o?.[k] || 0), 0);
  const pct = Math.min(100, Math.round((100 * tot(c.progress)) / Math.max(1, 0.85 * tot(c.goals))));
  const mi = d.mission;
  const w = d.war;
  return (
    <div className="farm-social">
      <div className="section-label">MI ROL EN LA GRANJA</div>
      {!d.specialty || pick ? (
        <div className="fs-roles">
          {SPECIALTIES.map(([k, ic, name, goal]) => (
            <button key={k} className={'fs-role' + (d.specialty === k ? ' on' : '')} onClick={() => choose(k)}><span>{ic}</span><b>{name}</b><small>{goal}</small></button>
          ))}
        </div>
      ) : (
        <div className="fs-mission">
          <span className="fs-ic">{SP[d.specialty][1]}</span>
          <div>
            <b>{SP[d.specialty][2]}</b>
            <small>{mi?.done ? '✔ ¡Misión de la semana cumplida! (+40 puntos y experiencia para la granja)' : `${SP[d.specialty][3]} · ${num(mi?.progress || 0)}/${num(mi?.goal || 0)}`}</small>
            {!mi?.done && <i className="fs-bar"><em style={{ width: `${Math.min(100, (100 * (mi?.progress || 0)) / Math.max(1, mi?.goal || 1))}%` }} /></i>}
          </div>
          <button className="chip-btn" onClick={() => setPick(true)}>Cambiar</button>
        </div>
      )}
      <div className="fs-team">{d.roles.map((r) => <span key={r.nick} title={r.specialty ? SP[r.specialty][2] : 'Sin rol'}>{r.specialty ? SP[r.specialty][1] : '❔'} {r.nick}{r.done ? ' ✔' : ''}</span>)}</div>

      <div className="section-label">PEDIDO DE COLABORACIÓN · FESTIVAL MAKER 3DBAT</div>
      <div className={'fs-colab' + (c.done ? ' done' : '')}>
        <p>{c.done ? '🎉 ¡La granja completó el pedido de la semana! Cada uno que aportó cobró 80 puntos.' : `Un pedido enorme para toda la granja: cada tecnología aporta su parte. Se completa al ${85} % del total. Vamos ${pct} %.`}</p>
        {TECHS.map(([k, l]) => {
          const g = Number(c.goals?.[k] || 0), p = Number(c.progress?.[k] || 0);
          return <div key={k} className="fs-tech"><span>{l}</span><i><em style={{ width: `${Math.min(100, (100 * p) / Math.max(1, g))}%` }} /></i><b>{num(p)}/{num(g)}</b></div>;
        })}
        {c.top?.length > 0 && <small className="fs-top">Más aportes: {c.top.map((x) => `${x.nick} (${num(x.amount)})`).join(' · ')}</small>}
      </div>

      <div className="section-label">GUERRA AMISTOSA DE GRANJAS · SÁBADOS</div>
      {w ? (
        <div className={'fs-war' + (w.live ? ' live' : '')}>
          <div className="fs-vs"><b>Tu granja</b><span>{num(Math.round(w.mine))}</span></div>
          <em>VS</em>
          <div className="fs-vs"><b>{w.rival?.name}</b><span>{num(Math.round(w.theirs))}</span></div>
          <small>{w.settled ? (w.won ? '🏆 ¡Ganaron la guerra! Banner Campeones y título para todos.' : w.won === false ? 'Esta vez ganó la otra granja.' : 'Empate.') : w.live ? '🔴 ¡Es hoy! Suman los puntos de hoy de cada integrante + 40 por cada uno que aporta.' : 'La guerra fue el sábado: se cierra en unas horas.'}</small>
        </div>
      ) : <p className="hint">Cada sábado tu granja se cruza con otra de nivel parecido durante 24 horas. Nadie ataca ni roba nada: gana la que más produce y con más integrantes distintos aportando.</p>}
      {d.last_war && <p className="hint">Semana pasada: {d.last_war.tie ? 'empate' : d.last_war.won ? '🏆 ganaron' : 'perdieron'} contra {d.last_war.rival}.</p>}
      {d.war_wins > 0 && <p className="hint">Guerras ganadas por la granja: <b>{d.war_wins}</b> 🏆</p>}
      {err && err !== 'missing' && <p className="ol-err">{err}</p>}
    </div>
  );
}
