// Liga Maker 3DBAT (grupos semanales por división) y Duelos Maker (10 minutos, asincrónicos).
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from './Online.jsx';
import { rpc } from '../online/api.js';
import * as E from '../game/engine.js';
import { TECHS } from '../game/data.js';
import { clock, num } from '../game/format.js';

export const DIVS = [
  { name: 'Bronce', icon: '🥉', color: '#cd7f32' }, { name: 'Plata', icon: '🥈', color: '#cbd5e1' }, { name: 'Oro', icon: '🥇', color: '#fbbf24' },
  { name: 'Platino', icon: '💠', color: '#a5f3fc' }, { name: 'Diamante', icon: '💎', color: '#67e8f9' }, { name: 'Leyenda Maker', icon: '🦇', color: '#f78eb6' },
  { name: 'Top 100 3DBAT', icon: '👑', color: '#facc15' },
];
const miss = (e) => e?.missing || /Could not find the function|PGRST202/i.test(e?.message || '');
const left = (iso) => { const s = Math.max(0, (Date.parse(iso) - Date.now()) / 1000); return s > 86400 ? `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h` : clock(s); };

function LeagueView({ d }) {
  const div = DIVS[d.division] || DIVS[0];
  const n = d.rows.length;
  return (
    <>
      <div className="lg-head" style={{ '--dv': div.color }}>
        <span className="lg-ic">{div.icon}</span>
        <div><b>División {div.name}</b><small>Grupo {d.group} · {n} {n === 1 ? 'maker' : 'makers'} · cierra en {left(d.ends)}</small></div>
        {d.best > d.division && <em>Tu mejor: {DIVS[d.best].icon} {DIVS[d.best].name}</em>}
      </div>
      {d.last && (
        <p className={'lg-last ' + (d.last.moved > 0 ? 'up' : d.last.moved < 0 ? 'down' : '')}>
          La semana pasada quedaste <b>#{d.last.rank}</b>{d.last.moved > 0 ? ` y ascendiste a ${d.last.name} 🎉` : d.last.moved < 0 ? ` y bajaste a ${d.last.name}` : ` y te quedaste en ${d.last.name}`}.
        </p>
      )}
      <div className="lg-rows">
        {d.rows.map((r, i) => {
          const zone = n >= 5 && i < d.up ? 'up' : n >= 8 && i >= n - d.down ? 'down' : '';
          return (
            <div key={i} className={'lg-row ' + zone + (r.me ? ' me' : '')}>
              <span className="lg-pos">{i + 1}</span>
              <Avatar name={r.name} frame={r.frame} src={r.avatar} size={28} />
              <span className="lg-name">{r.me ? `${r.name} (vos)` : r.name}</span>
              {zone === 'up' && <small className="lg-tag up">▲ sube</small>}
              {zone === 'down' && <small className="lg-tag down">▼ baja</small>}
              <b>{num(r.pts)}</b>
            </div>
          );
        })}
      </div>
      <p className="hint">Puntos de Liga = tus puntos de la semana (pedidos, contratos, producción, fallas resueltas, retos y aportes a tu granja) + los <b>Duelos Maker</b> (+30 si ganás, +10 si perdés). Cada lunes los 3 primeros suben y los 3 últimos bajan. Al llegar a una división nueva ganás su título (y marco en Platino y Diamante). Son premios solo estéticos.</p>
    </>
  );
}

function DuelsView({ s, actions, logged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('carrera');
  const [tech, setTech] = useState('fdm');
  const load = useCallback(() => rpc('bb_mt_duels_mine').then(setData).catch((e) => setErr(miss(e) ? 'Los duelos se activan con la migración 036 de BATBOX.' : e.message)), []);
  useEffect(() => { if (logged) load(); }, [logged, load, s.duel?.done]);
  if (!logged) return <p className="hint">Iniciá sesión con Google para jugar duelos.</p>;
  const find = async () => {
    setBusy(true); setErr('');
    try { await rpc('bb_mt_duel_find', { p_kind: kind, p_tech: kind === 'tecnico' ? tech : null }); await load(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const running = s.duel && !s.duel.done ? s.duel : null;
  return (
    <>
      {running && (
        <div className="duel-live">⚔️ <b>Duelo en juego</b> · quedan {clock(Math.max(0, running.until - s.time))} · rendimiento <b>{E.duelScore(s)} %</b>{running.rival ? ` · contra ${running.rival}` : ''}</div>
      )}
      <div className="duel-kinds">
        {Object.entries(E.DUEL_KINDS).map(([k, K]) => (
          <button key={k} className={'duel-kind' + (kind === k ? ' on' : '')} onClick={() => setKind(k)}><span>{K.icon}</span><b>{K.name}</b><small>{K.blurb}</small></button>
        ))}
      </div>
      {kind === 'tecnico' && (
        <div className="tech-tabs">{Object.values(TECHS).map((T) => <button key={T.id} className={'opt sm' + (tech === T.id ? ' active' : '')} onClick={() => setTech(T.id)}>{T.short}</button>)}</div>
      )}
      <button className="btn-center" disabled={busy} onClick={find}>{busy ? 'Buscando…' : '⚔️ Buscar rival de nivel parecido'}</button>
      {err && <p className="ol-err">{err}</p>}
      <p className="hint">Los duelos son asincrónicos: cada uno juega sus 10 minutos cuando quiere (tiene 24 h). El puntaje es tu <b>rendimiento</b>: cuánto produjiste contra lo que tu taller podía dar. Así un taller chico le puede ganar a una planta. Resolvé fallas rápido, retirá piezas y cebá mate.</p>
      {data && (
        <>
          <div className="section-label">MIS DUELOS · {num(data.wins)} ganados de {num(data.played)}</div>
          {data.list.length === 0 && <p className="ol-empty">Todavía no jugaste ninguno.</p>}
          <div className="duel-list">
            {data.list.map((d) => {
              const K = E.DUEL_KINDS[d.kind];
              const canPlay = d.my_score == null && (d.status === 'open' || d.status === 'matched');
              const why = canPlay ? E.duelStartReason(s, d) : null;
              return (
                <div key={d.id} className={'duel ' + d.status + (d.won === true ? ' won' : d.won === false ? ' lost' : '')}>
                  <span className="duel-ic">{K.icon}</span>
                  <span className="duel-txt">
                    <b>{K.name}{d.tech ? ` · ${TECHS[d.tech].short}` : ''}</b>
                    <small>{d.rival ? `contra ${d.rival}` : 'buscando rival…'} · {d.status === 'done' ? (d.won == null ? 'empate' : d.won ? '¡ganaste!' : 'perdiste') : d.status === 'expired' ? 'venció' : `vence en ${left(d.expires_at)}`}</small>
                  </span>
                  <span className="duel-sc">{d.my_score != null ? `${d.my_score} %` : '—'}<small>{d.their_score != null ? `rival ${d.their_score} %` : d.my_score != null && d.status !== 'done' ? 'esperando al rival' : ''}</small></span>
                  {canPlay && <button className="chip-btn" disabled={!!why || !!running} title={why || ''} onClick={() => actions.startDuel(d)}>▶ Jugar 10 min</button>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

export function LeagueTab({ s, actions, online }) {
  const [sub, setSub] = useState('liga');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const logged = !!online.user && !!online.me?.player;
  useEffect(() => {
    if (!logged) return;
    rpc('bb_mt_league_me').then((x) => {
      setD(x);
      // Ascenso: aviso al chat (una vez por semana) y corona para BATI.
      if (x?.last?.moved > 0) actions.leagueUp?.(x.last);
    }).catch((e) => setErr(miss(e) ? 'La Liga se activa con la migración 036 de BATBOX.' : e.message));
  }, [logged]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="rank-tabs">
        <button className={'opt sm' + (sub === 'liga' ? ' active' : '')} onClick={() => setSub('liga')}>🏅 Liga Maker</button>
        <button className={'opt sm' + (sub === 'duelos' ? ' active' : '')} onClick={() => setSub('duelos')}>⚔️ Duelos</button>
      </div>
      {sub === 'liga' && (!logged ? <p className="hint">Iniciá sesión con Google y creá tu perfil para jugar la Liga Maker.</p>
        : err ? <p className="ol-err">{err}</p> : !d ? <div className="ol-empty"><div className="spinner" /></div>
        : d.profile === false ? <p className="hint">Primero creá tu perfil de jugador.</p> : <LeagueView d={d} />)}
      {sub === 'duelos' && <DuelsView s={s} actions={actions} logged={logged} />}
    </div>
  );
}

// Tira en el taller mientras se juega un duelo.
export function DuelStrip({ s, open }) {
  const d = s.duel;
  if (!d || d.done) return null;
  return (
    <button className="duel-strip" onClick={() => open('online', null, 'liga')}>
      ⚔️ <b>Duelo {E.DUEL_KINDS[d.kind]?.name.toLowerCase()}</b> · {clock(Math.max(0, d.until - s.time))} · rendimiento <b>{E.duelScore(s)} %</b>{d.rival ? ` · vs ${d.rival}` : ''}
    </button>
  );
}
