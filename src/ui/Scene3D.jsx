// Vista 3D del taller + carteles HTML encima de cada máquina.
import { useEffect, useRef, useState } from 'react';
import { SEASON } from '../game/format.js';
import Icon from './Icon.jsx';
import { MACHINES, MACHINE_EVENTS, PRODUCTS, SPACES } from '../game/data.js';
import * as E from '../game/engine.js';
import { dur } from '../game/format.js';
import { sfx } from './sfx.js';

function labelStatus(s, m) {
  if (m.waitStart) return { k: 'start', t: '▶ Imprimir' };
  if (m.event) return { k: 'event', t: `${MACHINE_EVENTS[m.event.id].icon} ¡Problema!` };
  if (m.state === 'done') return { k: 'done', t: '✔ ¡Lista! Tocá' };
  if (m.state === 'nofil') return { k: 'nofil', t: `Sin ${PRODUCTS[m.product]?.mat || 'material'}` };
  if (s.global?.id === 'corte' && m.state === 'printing') return { k: 'event', t: '🔌 Sin luz' };
  if (m.pauseUntil > s.time) return { k: 'pause', t: `Pausa ${Math.ceil(m.pauseUntil - s.time)} s` };
  if (m.state === 'printing') return { k: 'print', t: dur((m.need - m.progress) / E.machineSpeed(s, m)) };
  return { k: 'idle', t: 'Sin trabajo' };
}

// Fundido corto con el nombre del piso al cambiar de piso.
const FLOOR_NAME = { fdm: 'PISO 1 · FDM LAB', resin: 'PISO 2 · RESIN LAB', laser: 'PISO 3 · LASER WORKSHOP', cnc: 'PISO 4 · CNC FACTORY' };
function useFloorFade(floor) {
  const prev = useRef(floor);
  const [fade, setFade] = useState(null);
  useEffect(() => {
    if (prev.current === floor) return undefined;
    prev.current = floor;
    if (!floor) return undefined;
    setFade({ floor, n: Date.now() });
    const t = setTimeout(() => setFade(null), 950);
    return () => clearTimeout(t);
  }, [floor]);
  return fade;
}

// Mientras se visita otro taller, el propio deja de dibujarse (ahorra placa de video).
export const scenePause = { on: false };

export default function Scene3D({ s, actions, floats, onTap, onEmpty, onFail, glow, onFeedback, podium, gifts }) {
  const podiumRef = useRef(podium);
  podiumRef.current = podium;
  const giftsRef = useRef(gifts);
  giftsRef.current = gifts;
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const sRef = useRef(s);
  const labels = useRef(new Map());
  const slotLabels = useRef(new Map());
  const [ready, setReady] = useState(false);
  sRef.current = s;

  useEffect(() => {
    let raf = 0, alive = true, ro = null, lastSync = 0;
    import('../three/Workshop3D.js').then(({ Workshop3D }) => {
      if (!alive) return;
      let ws;
      try { ws = new Workshop3D(canvasRef.current, { quality: sRef.current.settings.quality }); }
      catch { onFail?.(); return; }
      wsRef.current = ws;
      if (typeof location !== 'undefined' && /[?&]debug3d/.test(location.search)) window.__mt3d = ws; // solo para pruebas
      ws.controls.addEventListener('start', () => { ws.userMoved = true; });
      ro = new ResizeObserver(() => ws.resize());
      ro.observe(wrapRef.current);
      ws.sync(sRef.current);
      ws.resize();
      setReady(true);
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        if (scenePause.on) return;
        const st = sRef.current;
        if (now - lastSync > 200) {
          lastSync = now; ws.setQuality(st.settings.quality); ws.sync(st); ws.setPodium(podiumRef.current, SEASON.name); ws.setGifts(giftsRef.current);
          sfx.setIntensity(st.space);
          sfx.updateMachines(ws.audioPositions());
        }
        ws.frame(st, now / 1000);
        // Posiciones proyectadas + separación simple para que no se pisen
        const items = [];
        for (const [id, el] of labels.current) {
          const p = ws.project('machine', id);
          if (!p || !el) continue;
          items.push({ el, x: p.x, y: p.y, w: el.offsetWidth || 90, h: el.offsetHeight || 34, behind: p.behind });
        }
        items.sort((a, b) => b.y - a.y);
        const placed = [];
        for (const it of items) {
          let y = it.y;
          for (let k = 0; k < 6; k++) {
            const hit = placed.find((q) => Math.abs(q.x - it.x) < (q.w + it.w) / 2 + 2 && Math.abs(q.y - y) < (q.h + it.h) / 2 + 2);
            if (!hit) break;
            y = hit.y - hit.h - 4;
          }
          placed.push({ x: it.x, y, w: it.w, h: it.h });
          it.el.style.transform = `translate(${it.x}px, ${y}px) translate(-50%, -100%)`;
          it.el.style.visibility = it.behind ? 'hidden' : 'visible';
        }
        for (const [i, el] of slotLabels.current) {
          const p = ws.project('slot', i);
          if (!p || !el) continue;
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        }
      };
      raf = requestAnimationFrame(loop);
    }).catch(() => onFail?.());
    return () => { alive = false; cancelAnimationFrame(raf); ro?.disconnect(); wsRef.current?.dispose(); wsRef.current = null; sfx.updateMachines([]); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Ver de cerca": el panel de la máquina pide acercar la cámara
  useEffect(() => {
    const onFocus = (e) => { if (wsRef.current?.focusMachine(e.detail)) setFocused(true); };
    window.addEventListener('mt-focus', onFocus);
    return () => window.removeEventListener('mt-focus', onFocus);
  }, []);
  const [focused, setFocused] = useState(false);

  // Clic/toque sobre el canvas (distinto de arrastrar para girar)
  const down = useRef(null);
  // Solo el clic izquierdo (o un toque) elige máquinas: el derecho es para desplazar la vista.
  const onPointerDown = (e) => { down.current = e.button === 0 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; };
  const onPointerUp = (e) => {
    const d = down.current; down.current = null;
    if (!d || !wsRef.current) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7 || performance.now() - d.t > 600) return;
    const hit = wsRef.current.pick(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.type === 'machine') { const m = sRef.current.machines.find((x) => x.id === hit.id); if (m) onTap(m); }
    else onEmpty();
  };

  // En la Nave y la Planta se ve un piso por vez: sus máquinas y sus lugares libres (de 20).
  const floor = E.hasFloors(s) ? (s.settings.floor || 'fdm') : null;
  const shown = floor ? E.floorMachines(s, floor) : s.machines;
  const fade = useFloorFade(floor);
  const freeSlots = [];
  for (let i = shown.length; i < (floor ? E.floorCap(s) : SPACES[s.space].slots); i++) freeSlots.push(i);

  return (
    <div className="scene3d" ref={wrapRef}>
      <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp} aria-label="Taller en 3D: tocá una máquina para usarla, arrastrá para girar" />
      {!ready && <div className="busy"><div className="spinner" /><span>Armando el taller 3D…</span></div>}
      <div className="labels" aria-hidden={!ready}>
        {ready && shown.map((m) => {
          const st = labelStatus(s, m);
          // Con muchas máquinas, las que trabajan solas muestran un cartel mínimo (barra y segundos) para no taparse.
          const mini = shown.length > 8 && (st.k === 'print' || st.k === 'idle' || st.k === 'pause');
          const M = MACHINES[m.model];
          const p = m.state === 'done' ? 1 : m.need ? m.progress / m.need : 0;
          const order = !!m.orderId;
          return (
            <button key={m.id} ref={(el) => { if (el) labels.current.set(m.id, el); else labels.current.delete(m.id); }}
              className={`ml ml-${st.k}` + (mini ? ' mini' : shown.length > 6 ? ' compact' : '') + (glow === 'machine' && (st.k === 'start' || st.k === 'done' || st.k === 'event') ? ' tut-glow' : '')}
              onClick={() => onTap(m)} title={`${M.brand} ${M.name}`}>
              <span className="ml-name">{order && <em>📋</em>}{M.brand === 'Bambu Lab' ? 'Bambu' : M.brand} {M.name}</span>
              <span className="ml-st">{st.t}</span>
              {st.k === 'print' && <span className="ml-bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></span>}
              {floats.filter((f) => f.mid === m.id).map((f) => <span key={f.id} className={'float float-' + f.kind}>{f.text}</span>)}
            </button>
          );
        })}
        {ready && freeSlots.map((i) => (
          <button key={'slot' + i} ref={(el) => { if (el) slotLabels.current.set(i, el); else slotLabels.current.delete(i); }}
            className={'ml ml-free' + (freeSlots.length > 4 && i !== shown.length ? ' dot' : '') + (glow === 'shop-machines' && i === shown.length ? ' tut-glow' : '')} onClick={onEmpty} title="Lugar libre: comprar máquina">
            <Icon name="plus" size={14} />{(freeSlots.length <= 4 || i === shown.length) && ' Lugar libre'}
          </button>
        ))}
      </div>
      {ready && onFeedback && <button className="scene-fb" title="Mandanos una idea o contanos si algo anda mal" onClick={onFeedback}><Icon name="message" size={16} /> Sugerencias</button>}
      {ready && <button className="icon-btn sm scene-center" title="Ver todo el taller" onClick={() => { wsRef.current?.fit(); setFocused(false); }}><Icon name="target" size={18} /></button>}
      {ready && focused && <button className="chip-btn scene-back" onClick={() => { wsRef.current?.fit(); setFocused(false); }}>← Ver todo el taller</button>}
      {ready && fade && <div key={fade.n} className={'floor-fade f-' + fade.floor} aria-hidden="true"><b>{FLOOR_NAME[fade.floor]}</b></div>}
      {ready && <span className="scene-hint">Clic izquierdo: girar · Clic derecho: mover · Rueda: acercar</span>}
    </div>
  );
}
