// Tienda: máquinas, mejoras, taller (espacios) y filamento.
import Icon from './Icon.jsx';
import MachineArt from './MachineArt.jsx';
import * as E from '../game/engine.js';
import { MACHINES, MACHINE_ORDER, UPGRADES, UPGRADE_ORDER, SPACES, MATERIALS, PRODUCTS } from '../game/data.js';
import { money, dur, kg } from '../game/format.js';

function eta(s, cost) {
  const r = Math.max(E.incomeRate(s), E.potentialRate(s) * 0.7);
  if (r <= 0) return '';
  const t = (cost - s.money) / r;
  return t > 0 && t < 36000 ? ` (~${dur(t)})` : '';
}
function BuyBtn({ s, cost, onClick, disabled, label = 'Comprar', glow }) {
  const ok = s.money >= cost && !disabled;
  return (
    <button className={'buy-btn' + (ok ? ' ok' : '') + (glow ? ' tut-glow' : '')} disabled={!ok} onClick={onClick}>
      {disabled ? label : ok ? `${label} · ${money(cost)}` : `Faltan ${money(cost - s.money)}${eta(s, cost)}`}
    </button>
  );
}

const fakeMachine = (model) => ({ id: 'shop-' + model, model, cur: null, progress: 0, need: 0, state: 'idle' });

function Machines({ s, actions, glow }) {
  const full = s.machines.length >= E.slots(s);
  return (
    <div className="shop-list">
      {full && <p className="o-warn soft">El taller está lleno. Ampliá el taller o vendé una impresora vieja (tocá su ⚙).</p>}
      {MACHINE_ORDER.map((id) => {
        const M = MACHINES[id];
        const unlocked = E.machineUnlocked(s, id);
        const owned = s.machines.filter((m) => m.model === id).length;
        const req = [];
        if (E.repLevel(s) < M.rep) req.push(`Reputación ${M.rep}`);
        if (s.space < M.space) req.push(SPACES[M.space].name);
        return (
          <div key={id} className={'shop-item' + (unlocked ? '' : ' locked')}>
            <div className="shop-art"><MachineArt m={fakeMachine(id)} /></div>
            <div className="shop-txt">
              <b>{M.name} <span className="c-cyan">{M.nick}</span></b>
              <small>{M.flavor}</small>
              <div className="shop-stats">
                <span>Vel. ×{M.speed.toLocaleString('es-AR')}</span><span>★{M.stars}</span>
                <span>Fallas {Math.round(M.fail * 100)} %</span>{M.xl && <span>XL</span>}{owned > 0 && <span className="own">Tenés {owned}</span>}
              </div>
              {unlocked
                ? <BuyBtn s={s} cost={E.machineCost(s, id)} disabled={full} label={full ? 'Sin lugar' : 'Comprar'} onClick={() => actions.buyMachine(id)} glow={glow === 'shop-machines' && !full && s.money >= E.machineCost(s, id)} />
                : <div className="lock-row"><Icon name="lock" size={14} /> {req.join(' · ')}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Upgrades({ s, actions, glow }) {
  const rows = UPGRADE_ORDER.map((id) => ({ id, U: UPGRADES[id], lvl: E.lvlOf(s, id), max: UPGRADES[id].max || 1 }));
  const avail = rows.filter((r) => r.lvl < r.max).sort((a, b) => {
    const ua = E.upgradeUnlocked(s, a.id), ub = E.upgradeUnlocked(s, b.id);
    if (ua !== ub) return ua ? -1 : 1;
    return E.upgradeCost(s, a.id) - E.upgradeCost(s, b.id);
  });
  const done = rows.filter((r) => r.lvl >= r.max);
  return (
    <div className="shop-list">
      {avail.map(({ id, U, lvl, max }) => {
        const unlocked = E.upgradeUnlocked(s, id);
        return (
          <div key={id} className={'up-item' + (unlocked ? '' : ' locked')}>
            <div className="up-top">
              <span className="up-cat">{U.cat.toUpperCase()}</span>
              {max > 1 && <span className="up-lvl">Nivel {lvl}/{max}</span>}
            </div>
            <b>{U.name}</b>
            <small>{U.desc}{U.flavor ? <em> «{U.flavor}»</em> : null}</small>
            {U.tip && <small className="up-tip">ℹ {U.tip}</small>}
            {unlocked
              ? <BuyBtn s={s} cost={E.upgradeCost(s, id)} onClick={() => actions.buyUpgrade(id)} glow={glow === 'shop-upgrades' && (id === 'slicer' || s.money >= E.upgradeCost(s, id))} />
              : <div className="lock-row"><Icon name="lock" size={14} /> Reputación {U.rep}</div>}
          </div>
        );
      })}
      {done.length > 0 && (
        <details className="done-list">
          <summary>Instaladas ({done.length})</summary>
          {done.map(({ id, U }) => <div key={id} className="done-row"><Icon name="check" size={14} /> {U.name}</div>)}
        </details>
      )}
    </div>
  );
}

function Spaces({ s, actions, glow }) {
  const next = E.nextSpace(s);
  return (
    <div className="shop-list">
      {SPACES.map((sp, i) => {
        const cur = i === s.space, had = i < s.space, isNext = i === s.space + 1;
        return (
          <div key={sp.id} className={'space-item' + (cur ? ' cur' : '') + (had ? ' had' : '') + (i > s.space + 1 ? ' locked' : '')}>
            <div className="space-num">{i + 1}</div>
            <div className="shop-txt">
              <b>{sp.name}</b>
              <small>{sp.blurb} · {sp.slots} lugares</small>
              {cur && <span className="own">Estás acá</span>}
              {isNext && (E.repLevel(s) >= sp.rep
                ? <BuyBtn s={s} cost={sp.cost} label="Agrandar el taller" onClick={() => actions.buySpace()} glow={glow === 'shop-space'} />
                : <div className="lock-row"><Icon name="lock" size={14} /> Reputación {sp.rep} · {money(sp.cost)}</div>)}
              {i > s.space + 1 && <div className="lock-row"><Icon name="lock" size={14} /> Reputación {sp.rep} · {money(sp.cost)}</div>}
            </div>
          </div>
        );
      })}
      {!next && <p className="hint">Llegaste al último espacio. Lo próximo: la <b>Mudanza</b> (botón Oficio).</p>}
    </div>
  );
}

function Filament({ s, actions }) {
  return (
    <div className="shop-list">
      {Object.values(MATERIALS).map((M) => {
        const unlocked = E.materialUnlocked(s, M.id);
        let gpm = 0;
        for (const m of s.machines) {
          const pid = m.cur || m.product;
          if (pid && PRODUCTS[pid].mat === M.id) gpm += PRODUCTS[pid].grams * E.machineSpeed(s, m, false) / PRODUCTS[pid].time * 60;
        }
        const price = E.spoolPrice(s, M.id);
        return (
          <div key={M.id} className={'fil-item' + (unlocked ? '' : ' locked')}>
            <div className="fil-spool" style={{ background: M.color }} />
            <div className="shop-txt">
              <b>{M.name}</b>
              <small>{M.desc}</small>
              <div className="shop-stats">
                <span>Stock: {kg(s.fil[M.id])}</span>
                {gpm > 0 && <span>Uso: {kg(gpm)}/min</span>}
                {gpm > 0 && <span>Alcanza: {dur((s.fil[M.id] / gpm) * 60)}</span>}
              </div>
              {unlocked ? (
                <div className="two-col">
                  <BuyBtn s={s} cost={price} label="1 bobina" onClick={() => actions.buySpool(M.id, 1)} />
                  <BuyBtn s={s} cost={price * 5} label="5 bobinas" onClick={() => actions.buySpool(M.id, 5)} />
                </div>
              ) : <div className="lock-row"><Icon name="lock" size={14} /> {UPGRADES[M.upgrade].name}</div>}
            </div>
          </div>
        );
      })}
      <p className="hint">{E.hasProveedor(s) ? <>El <b>proveedor</b> compra solo cuando se acaba (10 % más caro).</> : <>Cansado de comprar? Contratá al <b>Proveedor de filamento</b> en Mejoras.</>}</p>
    </div>
  );
}

const TABS = [['machines', 'Máquinas'], ['upgrades', 'Mejoras'], ['space', 'Taller'], ['filament', 'Filamento']];

export default function Shop({ s, actions, tab, setTab, glow }) {
  const glowTab = { 'shop-machines': 'machines', 'shop-upgrades': 'upgrades', 'shop-space': 'space' }[glow];
  return (
    <section className="card shop-card">
      <div className="card-head">
        <div className="card-icon"><Icon name="cart" /></div>
        <h2>Tienda</h2>
      </div>
      <div className="view-toggle shop-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'seg' + (tab === k ? ' active' : '') + (glowTab === k && tab !== k ? ' tut-dot' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className="shop-scroll">
        {tab === 'machines' && <Machines s={s} actions={actions} glow={glow} />}
        {tab === 'upgrades' && <Upgrades s={s} actions={actions} glow={glow} />}
        {tab === 'space' && <Spaces s={s} actions={actions} glow={glow} />}
        {tab === 'filament' && <Filament s={s} actions={actions} />}
      </div>
    </section>
  );
}
