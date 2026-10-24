// Visitar el taller de otro maker (idea de la comunidad) y dejarle un regalo.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Modal } from './Panels.jsx';
import { rpc } from '../online/api.js';
import { GIFTS, titleName } from '../online/rewards.js';
import { SPACES } from '../game/data.js';
import { scenePause } from './Scene3D.jsx';
import { Avatar, Emblem } from './Online.jsx';

// Estado mínimo para dibujar el taller ajeno con el mismo motor 3D (sin plata ni contadores).
function visitState(t, quality) {
  return {
    space: t.space || 0, rep: t.rep || 0, time: 0, global: null, challenge: null,
    machines: (t.machines || []).map((m, i) => ({
      id: m.id ?? i + 1, model: m.model, state: m.state === 'printing' || m.state === 'done' ? m.state : 'printing',
      cur: m.cur || m.product, product: m.product, progress: Number(m.progress) || 0, need: Number(m.need) || 12,
      event: null, pauseUntil: 0, waitStart: false,
    })),
    mat: t.mat || {}, upgrades: t.upgrades || {},
    settings: { led: t.led || 'cyan', anim: 'full', quality: quality || 'auto' },
    name: t.name || '',
    prestige: { vitrina: t.vitrina || [] }, cosmetics: { decor: t.cosmetics?.decor || [], skin: t.cosmetics?.skin || null, sign: t.cosmetics?.sign || null },
    stats: { orders: 0, spools: 0 },
  };
}

function VisitScene({ data, quality }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const wsRef = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let raf = 0, alive = true, ro = null, last = performance.now();
    scenePause.on = true; // el taller propio deja de dibujarse mientras visitás
    const st = visitState(data.taller, quality);
    import('../three/Workshop3D.js').then(({ Workshop3D }) => {
      if (!alive) return;
      let ws;
      try { ws = new Workshop3D(canvasRef.current, { quality: st.settings.quality }); } catch { return; }
      wsRef.current = ws;
      ro = new ResizeObserver(() => ws.resize()); ro.observe(wrapRef.current);
      ws.sync(st); ws.setGifts(data.gifts); ws.resize();
      setReady(true);
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        // Las impresoras del otro siguen imprimiendo (de mentira, para que se vea vivo).
        for (const m of st.machines) if (m.state === 'printing') { m.progress += dt; if (m.progress >= m.need) m.progress = 0; }
        st.time += dt;
        ws.frame(st, now / 1000);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => { alive = false; scenePause.on = false; cancelAnimationFrame(raf); ro?.disconnect(); wsRef.current?.dispose(); };
  }, [data, quality]);
  return (
    <div className="scene3d visit-scene" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label={`Taller de ${data.nick} en 3D`} />
      {!ready && <div className="busy"><div className="spinner" /><span>Entrando al taller…</span></div>}
      {ready && <span className="scene-hint">Arrastrá para girar · rueda o pellizco para acercar</span>}
    </div>
  );
}

export function VisitModal({ nick, s, online, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [gift, setGift] = useState('g_dummy');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => rpc('bb_mt_visit', { p_nick: nick }).then(setData).catch((e) => setErr(e.missing ? 'Las visitas todavía no están activadas.' : e.message));
  useEffect(() => { load(); }, [nick]); // eslint-disable-line react-hooks/exhaustive-deps
  const canGift = !!online?.me?.player && data && !data.me;
  const send = async () => {
    setBusy(true); setMsg('');
    try { await rpc('bb_mt_gift_send', { p_nick: nick, p_item: gift, p_note: note || null }); setMsg(`🎁 ¡Listo! Le dejaste un ${GIFTS[gift].name} a ${data.nick}.`); setNote(''); load(); }
    catch (e) { setMsg(e.message); }
    setBusy(false);
  };
  const sp = data ? SPACES[Math.min(SPACES.length - 1, data.taller.space || 0)] : null;
  return (
    <Modal title={data ? `Taller de ${data.nick}` : 'Visitando un taller'} icon="home" onClose={onClose} wide className="visit-modal">
      {err && <p className="ol-err">{err}</p>}
      {!data && !err && <div className="ol-empty"><div className="spinner" /></div>}
      {data && (
        <>
          <div className="visit-head">
            <Avatar name={data.nick} frame={data.frame} src={data.avatar} size={44} />
            <div className="visit-txt">
              <b>{data.taller.name || 'Taller sin nombre'}</b>
              <small>{data.nick}{titleName(data.title) ? ` · ${titleName(data.title)}` : ''} · {sp?.name} · {data.taller.machines.length} máquinas</small>
            </div>
            {data.farm && <span className="visit-farm"><Emblem emblem={data.farm.emblem} color={data.farm.color} size={26} /> {data.farm.name}</span>}
          </div>
          <VisitScene data={data} quality={s.settings.quality} />
          {data.me ? <p className="hint">Este es tu taller, así lo ven los demás cuando te visitan.</p> : canGift ? (
            <div className="gift-box">
              <div className="section-label">DEJALE UN REGALO</div>
              <div className="gift-grid">
                {Object.entries(GIFTS).map(([id, g]) => (
                  <button key={id} className={'opt gift-opt' + (gift === id ? ' active' : '')} onClick={() => setGift(id)}><span>{g.icon}</span>{g.name}</button>
                ))}
              </div>
              <div className="gift-send">
                <div className="pink-input"><input value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="Un mensajito (opcional)" /></div>
                <button className="btn-center inline" disabled={busy} onClick={send}><Icon name="star" size={16} /> {busy ? 'Dejando…' : 'Dejar regalo'}</button>
              </div>
              <p className="hint">Queda en su taller con tu nombre. Es solo decoración: no da plata ni puntos. Uno por día a cada maker.</p>
            </div>
          ) : <p className="hint">{online?.user ? 'Creá tu perfil para dejar regalos.' : 'Ingresá con Google para dejarle un regalo.'}</p>}
          {msg && <p className="hint"><b>{msg}</b></p>}
          {data.gifts.length > 0 && <p className="hint">Regalos que recibió: {data.gifts.map((g) => `${GIFTS[g.item]?.icon || '🎁'} de ${g.from}`).join(' · ')}</p>}
        </>
      )}
    </Modal>
  );
}
