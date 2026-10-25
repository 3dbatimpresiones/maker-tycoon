// BATI LIVE: el evento en vivo de los viernes de 21 a 22 (hora argentina).
// Durante la hora: pedidos ×1,5, ventas ×1,25, más pedidos urgentes y una meta comunitaria de piezas.
import { useEffect, useRef, useState } from 'react';
import * as E from '../game/engine.js';
import { rpc } from '../online/api.js';
import { num } from '../game/format.js';

const DAY = 5, HOUR = 21; // viernes 21 h
// Hora argentina sin depender de la zona de la compu.
function nowAR() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const dow = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday];
  return { dow, h: Number(p.hour) % 24, m: Number(p.minute) };
}
export function liveClock() {
  const t = nowAR();
  const on = t.dow === DAY && t.h === HOUR;
  const today = t.dow === DAY && t.h < HOUR;
  return { on, today, minsLeft: on ? 60 - t.m : null, minsTo: today ? (HOUR - t.h) * 60 - t.m : null };
}

export function useBatiLive({ say, toast, online }) {
  const [st, setSt] = useState(() => liveClock());
  const [goal, setGoal] = useState(null);
  const said = useRef({});
  useEffect(() => {
    const tick = () => {
      const c = liveClock();
      E.LIVE.on = c.on;
      setSt(c);
      const k = (x) => { if (said.current[x]) return false; said.current[x] = true; return true; };
      if (c.today && c.minsTo <= 30 && k('pre')) say?.('📣 ¡Hoy a las 21 hay BATI LIVE! Una hora de feria nocturna: pedidos ×1,5, más urgentes y una meta para toda la comunidad. ¡No te lo pierdas!', { mood: 'happy' });
      if (c.on && k('start')) { toast?.('🔴 ¡Arrancó BATI LIVE: Feria Maker nocturna!', 'warn', 6000); say?.('🎙️ ¡Bienvenidos a BATI LIVE! Durante esta hora los pedidos pagan ×1,5, las ventas ×1,25 y llegan más urgentes. Y entre todos tenemos una meta de piezas: si la cumplimos, todos los que aportaron se llevan premio.', { mood: 'happy' }); }
      if (c.on && c.minsLeft <= 30 && k('mid')) say?.('🎙️ ¡Media hora de BATI LIVE! El chat está que arde. ¡A cebar mate y sumar piezas!', { mood: 'happy' });
      if (c.on && c.minsLeft <= 5 && k('end5')) say?.('🎙️ ¡Últimos 5 minutos de BATI LIVE! Todo lo que fabriques ahora suma a la meta.', { mood: 'happy' });
      if (c.on || c.today) {
        rpc('bb_mt_batilive').then((g) => {
          setGoal(g);
          if (g?.done && k('done')) { toast?.('🎉 ¡La comunidad cumplió la meta de BATI LIVE!', 'info', 7000); say?.('🎉 ¡LO LOGRAMOS! La comunidad cumplió la meta de BATI LIVE. Todos los que aportaron se llevan el título «Estuve en BATI LIVE» y la figura de BATI para el taller.', { mood: 'happy' }); }
        }).catch(() => {});
      }
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => { clearInterval(t); E.LIVE.on = false; };
  }, [online?.user]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...st, goal };
}

export function LiveStrip({ live }) {
  if (!live || (!live.on && !live.today)) return null;
  const g = live.goal;
  if (!live.on) return <div className="live-strip soon">📣 <b>Hoy a las 21 h: BATI LIVE</b> · Feria Maker nocturna con pedidos ×1,5 y una meta para toda la comunidad.</div>;
  const pct = g ? Math.min(100, Math.round((100 * g.progress) / Math.max(1, g.target))) : 0;
  return (
    <div className="live-strip on">
      <span>🔴 <b>BATI LIVE · Feria Maker nocturna</b> · quedan {live.minsLeft} min · pedidos ×1,5 · ventas ×1,25</span>
      {g && <span className="ls-goal">Meta de la comunidad: <b>{num(g.progress)}/{num(g.target)}</b> piezas{g.done ? ' ✔ ¡Cumplida!' : ''} · {num(g.people)} makers{g.mine ? ` · vos ${num(g.mine)}` : ''}<i><em style={{ width: `${pct}%` }} /></i></span>}
    </div>
  );
}
