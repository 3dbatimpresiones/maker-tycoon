// Tienda: máquinas (marcas reales), mejoras, taller (espacios) y materiales.
import { useState } from 'react';
import Icon from './Icon.jsx';
import { MachineThumb } from './Thumb.jsx';
import * as E from '../game/engine.js';
import { MACHINES, MACHINE_ORDER, UPGRADES, UPGRADE_ORDER, SPACES, MATERIALS, MATERIAL_ORDER, PRODUCTS, TECHS, SIZE_NAME, UNIT } from '../game/data.js';
import { money, dur, kg } from '../game/format.js';
import { FILACOLOR, fcUrl } from '../online/filacolor.js';
import fcLogo from '../assets/filacolor-logo.png';
import Market, { WearBar } from './Market.jsx';

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
      {ok ? `${label} · ${money(cost)}` : (
        // Sin plata (o sin lugar): se ve el precio y, abajo, cuánto falta.
        <>
          <span className="bb-price">{disabled ? `${label} · ` : label.startsWith('×') || /^\d/.test(label) ? `${label} · ` : 'Precio '}<b>{money(cost)}</b></span>
          {s.money < cost && <small className="bb-miss">Faltan {money(cost - s.money)}{eta(s, cost)}</small>}
        </>
      )}
    </button>
  );
}

function Machines({ s, actions, glow }) {
  const [tech, setTech] = useState('fdm');
  const full = s.machines.length >= E.slots(s);
  const list = MACHINE_ORDER.filter((id) => MACHINES[id].tech === tech);
  const nextLocked = list.findIndex((id) => !E.machineUnlocked(s, id));
  return (
    <div className="shop-list">
      <div className="tech-tabs">
        {Object.values(TECHS).map((T) => (
          <button key={T.id} className={'opt sm' + (tech === T.id ? ' active' : '')} onClick={() => setTech(T.id)}>
            {T.short}{!E.techUnlocked(s, T.id) && ' 🔒'}
          </button>
        ))}
      </div>
      {!E.techUnlocked(s, tech) && <p className="o-warn soft">Primero desbloqueá «{UPGRADES[TECHS[tech].upgrade].name}» en Mejoras.</p>}
      {full && <p className="o-warn soft">El taller está lleno. Agrandalo (Taller) o vendé una máquina vieja (tocá su ⚙ o publicala en Usados).</p>}
      {list.map((id, idx) => {
        const M = MACHINES[id];
        const unlocked = E.machineUnlocked(s, id);
        if (!unlocked && nextLocked >= 0 && idx > nextLocked + 1) return null; // no mostrar todo el catálogo de golpe
        const owned = s.machines.filter((m) => m.model === id).length;
        const multi = E.isMulti(s, M);
        return (
          <div key={id} className={'shop-item' + (unlocked ? '' : ' locked')}>
            <div className="shop-art"><MachineThumb model={id} /></div>
            <div className="shop-txt">
              <span className="brand-tag">{M.brand}</span>
              {FILACOLOR.machines[id] && <a className="fc-tag" href={fcUrl(FILACOLOR.machines[id])} target="_blank" rel="noopener noreferrer" title="La versión real, en el proveedor oficial de la comunidad">En Filacolor ↗</a>}
              <b>{M.name}</b>
              <small>{M.flavor}</small>
              <div className="shop-stats">
                <span>Vel. ×{M.speed.toLocaleString('es-AR')}</span><span>★{M.stars}</span>
                <span>Cama {SIZE_NAME[M.size].toLowerCase()} ({M.size})</span>
                {M.enclosed && <span>Cerrada</span>}
                {multi ? <span className="c-pink">Multicolor</span> : M.amsable && <span>Admite multicolor</span>}
                <span>Fallas {Math.round(M.fail * 1000) / 10} %</span>
                {owned > 0 && <span className="own">Tenés {owned}</span>}
              </div>
              {unlocked
                ? <BuyBtn s={s} cost={E.machineCost(s, id)} disabled={full} label={full ? 'Sin lugar' : 'Comprar'} onClick={() => actions.buyMachine(id)} glow={glow === 'shop-machines' && !full && s.money >= E.machineCost(s, id)} />
                : <div className="lock-row"><Icon name="lock" size={14} /> {E.machineLockReason(s, id).join(' · ')}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Taller de reparación: deja las máquinas gastadas al 100 % (fallan menos).
function RepairShop({ s, actions }) {
  const list = s.machines.filter(E.needsRepair).sort((a, b) => E.wearOf(b) - E.wearOf(a));
  if (!list.length) {
    const worst = s.machines.reduce((a, m) => Math.max(a, E.wearOf(m)), 0);
    return (
      <div className="repair-box ok">
        <div className="up-top"><span className="up-cat">TALLER DE REPARACIÓN</span></div>
        <small>Todas tus máquinas están {worst > 0 ? `casi nuevas (la más gastada: ${Math.round(worst * 100)} %)` : 'al 100 %'}. Se gastan al imprimir y, gastadas, fallan más: cuando pase, las reparás acá.</small>
      </div>
    );
  }
  const all = E.repairAllCost(s);
  return (
    <div className="repair-box">
      <div className="up-top"><span className="up-cat">TALLER DE REPARACIÓN</span><span className="up-lvl">{list.length} para reparar</span></div>
      <small>Las máquinas se gastan al imprimir y las usadas vienen gastadas: cuanto más desgaste, más fallas. Reparadas quedan al 100 %.</small>
      {list.slice(0, 6).map((m) => {
        const M = MACHINES[m.model];
        return (
          <div key={m.id} className="repair-row">
            <MachineThumb model={m.model} />
            <span className="repair-name"><b>{M.name}{m.used ? ' · usada' : ''}</b><WearBar wear={m.wear} /><small>Fallas {(Math.round(E.machineFail(s, m) * 1000) / 10).toLocaleString('es-AR')} % → {(Math.round(E.machineFail(s, { ...m, wear: 0 }) * 1000) / 10).toLocaleString('es-AR')} %</small></span>
            <BuyBtn s={s} cost={E.repairCost(s, m)} label="Reparar" onClick={() => actions.repair(m.id)} />
          </div>
        );
      })}
      {list.length > 6 && <small>…y {list.length - 6} más.</small>}
      {list.length > 1 && <BuyBtn s={s} cost={all} label={`Reparar las ${list.length}`} onClick={() => actions.repairAll()} />}
    </div>
  );
}

const CAT_ORDER = ['Velocidad', 'Calidad', 'Confiabilidad', 'Automatización', 'Tecnología', 'Marca', 'Materiales', 'Capacidad', 'Mate'];
function Upgrades({ s, actions, glow }) {
  const rows = UPGRADE_ORDER.map((id) => ({ id, U: UPGRADES[id], lvl: E.lvlOf(s, id) }));
  const avail = rows.filter((r) => !E.upgradeMaxed(s, r.id)).sort((a, b) => {
    const ua = E.upgradeUnlocked(s, a.id), ub = E.upgradeUnlocked(s, b.id);
    if (ua !== ub) return ua ? -1 : 1;
    return E.upgradeCost(s, a.id) - E.upgradeCost(s, b.id);
  });
  const shown = [];
  let lockedShown = 0;
  for (const r of avail) { if (E.upgradeUnlocked(s, r.id)) shown.push(r); else if (lockedShown++ < 3) shown.push(r); }
  const done = rows.filter((r) => E.upgradeMaxed(s, r.id));
  return (
    <div className="shop-list">
      <RepairShop s={s} actions={actions} />
      {shown.map(({ id, U, lvl }) => {
        const unlocked = E.upgradeUnlocked(s, id);
        return (
          <div key={id} className={'up-item' + (unlocked ? '' : ' locked')}>
            <div className="up-top">
              <span className="up-cat">{U.cat.toUpperCase()}</span>
              {(U.max == null || U.max > 1) && <span className="up-lvl">Nivel {lvl}{U.max ? `/${U.max}` : ''}{U.max == null ? ' · infinita' : ''}</span>}
            </div>
            <b>{U.name}</b>
            <small>{U.desc}{U.flavor ? <em> «{U.flavor}»</em> : null}</small>
            {U.tip && <small className="up-tip">ℹ {U.tip}</small>}
            {unlocked
              ? <BuyBtn s={s} cost={E.upgradeCost(s, id)} onClick={() => actions.buyUpgrade(id)} glow={glow === 'shop-upgrades' && (id === 'slicer' || s.money >= E.upgradeCost(s, id))} />
              : <div className="lock-row"><Icon name="lock" size={14} /> {E.upgradeLockReason(s, id)}</div>}
          </div>
        );
      })}
      {done.length > 0 && (
        <details className="done-list">
          <summary>Instaladas ({done.length})</summary>
          {done.sort((a, b) => CAT_ORDER.indexOf(a.U.cat) - CAT_ORDER.indexOf(b.U.cat)).map(({ id, U }) => <div key={id} className="done-row"><Icon name="check" size={14} /> {U.name}</div>)}
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
      {!next && <p className="hint">Llegaste a la Planta. Lo que sigue: mejoras infinitas, experiencia y <b>Mudanzas</b>.</p>}
    </div>
  );
}

function Materials({ s, actions }) {
  const shown = MATERIAL_ORDER.filter((k) => E.materialUnlocked(s, k) || s.mat[k] > 0 || E.techUnlocked(s, MATERIALS[k].tech));
  const locked = MATERIAL_ORDER.filter((k) => !shown.includes(k));
  return (
    <div className="shop-list">
      <a className="fc-strip" href={fcUrl(FILACOLOR.links.filamentos)} target="_blank" rel="noopener noreferrer">
        <img src={fcLogo} alt="Filacolor" /><span><b>Proveedor oficial</b><small>Filamentos reales para tu taller real ↗</small></span>
      </a>
      {shown.map((k) => {
        const M = MATERIALS[k];
        const unlocked = E.materialUnlocked(s, k);
        let upm = 0;
        for (const m of s.machines) {
          const pid = m.cur || m.product;
          if (pid && PRODUCTS[pid].mat === k) upm += PRODUCTS[pid].use * E.machineSpeed(s, m, false) / PRODUCTS[pid].time * 60;
        }
        const price = E.matPrice(s, k);
        const units = s.mat[k] / UNIT;
        return (
          <div key={k} className={'fil-item' + (unlocked ? '' : ' locked')}>
            <div className="fil-spool" style={{ background: M.color }} />
            <div className="shop-txt">
              <b>{M.name}</b>
              <small>{M.desc} <em className="muted">({M.brand})</em>{FILACOLOR.gameMaterials[k] && <> · <a className="fc-mini" href={fcUrl(FILACOLOR.gameMaterials[k])} target="_blank" rel="noopener noreferrer">Ver en Filacolor ↗</a></>}</small>
              <div className="shop-stats">
                <span>Stock: {M.unitName === 'bobina' || M.unitName === 'litro' ? kg(s.mat[k]).replace('kg', M.unitName === 'litro' ? 'L' : 'kg') : `${units.toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${M.unitName}s`}</span>
                {upm > 0 && <span>Alcanza: {dur((s.mat[k] / upm) * 60)}</span>}
              </div>
              {unlocked ? (
                <div className="three-col">
                  <BuyBtn s={s} cost={price} label={`1 ${M.unitName}`} onClick={() => actions.buyMat(k, 1)} />
                  <BuyBtn s={s} cost={price * 5} label="×5" onClick={() => actions.buyMat(k, 5)} />
                  <BuyBtn s={s} cost={price * 25} label="×25" onClick={() => actions.buyMat(k, 25)} />
                </div>
              ) : <div className="lock-row"><Icon name="lock" size={14} /> {UPGRADES[M.upgrade].name}</div>}
            </div>
          </div>
        );
      })}
      {locked.length > 0 && <p className="hint">Más adelante: {locked.map((k) => MATERIALS[k].name).join(', ')}.</p>}
      <p className="hint">{E.hasProveedor(s) ? <><b>Filacolor</b> te repone solo cuando se acaba (10 % más caro por el envío).</> : <>¿Cansado de comprar? Contratá a <b>Filacolor</b>, el proveedor oficial, en Mejoras.</>}</p>
    </div>
  );
}

const TABS = [['machines', 'Máquinas'], ['used', 'Usados'], ['upgrades', 'Mejoras'], ['space', 'Taller'], ['filament', 'Materiales']];

export default function Shop({ s, actions, tab, setTab, glow, online, mk, open, usedPick, clearUsedPick }) {
  const toFix = s.machines.some((m) => E.wearOf(m) >= E.WEAR_WARN);
  const glowTab = { 'shop-machines': 'machines', 'shop-upgrades': 'upgrades', 'shop-space': 'space' }[glow];
  return (
    <section className="card shop-card">
      <div className="card-head">
        <div className="card-icon"><Icon name="cart" /></div>
        <h2>Tienda</h2>
      </div>
      <div className="view-toggle shop-tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={'seg' + (tab === k ? ' active' : '') + (glowTab === k && tab !== k ? ' tut-dot' : '') + (k === 'used' ? ' seg-used' : '')} onClick={() => setTab(k)}>
            {label}{k === 'used' && <i className="mk-dot" aria-hidden="true" />}{k === 'upgrades' && toFix && tab !== k && <i className="fix-dot" title="Hay máquinas gastadas para reparar" />}
          </button>
        ))}
      </div>
      <div className="shop-scroll">
        {tab === 'machines' && <Machines s={s} actions={actions} glow={glow} />}
        {tab === 'used' && mk && <Market s={s} online={online} mk={mk} open={open} preselect={usedPick} clearPreselect={clearUsedPick} />}
        {tab === 'upgrades' && <Upgrades s={s} actions={actions} glow={glow} />}
        {tab === 'space' && <Spaces s={s} actions={actions} glow={glow} />}
        {tab === 'filament' && <Materials s={s} actions={actions} />}
      </div>
    </section>
  );
}
