// Novedades (changelog) y aviso de "hay una versión nueva, recargá".
/* global __BUILD__ */
import { useEffect, useState } from 'react';
import { Modal } from './Panels.jsx';
import { BatiArt } from './Bati.jsx';
import { CHANGELOG } from '../game/changelog.js';
import { VERSION } from '../config.js';

const DAY_KEY = 'mt3dbat.news.day';
const VER_KEY = 'mt3dbat.news.ver';
const today = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD local
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

// ¿Hay que mostrar las novedades? La primera vez del día o con una versión nueva.
export function newsDue() { return read(DAY_KEY) !== today() || read(VER_KEY) !== VERSION; }
export function markNewsSeen() { write(DAY_KEY, today()); write(VER_KEY, VERSION); }

export function NewsModal({ onClose }) {
  const [all, setAll] = useState(false);
  const list = all ? CHANGELOG : CHANGELOG.slice(0, 1);
  const done = () => { markNewsSeen(); onClose(); };
  return (
    <Modal title={`Novedades · versión ${VERSION}`} icon="star" onClose={done} wide className="news-modal">
      {list.map((c) => (
        <div key={c.v} className="news-ver">
          <div className="news-hero">
            <BatiArt mood="happy" size={70} />
            <div><h3>{c.title}</h3><small>Versión {c.v} · {new Date(c.date + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</small>{c.intro && <p>{c.intro}</p>}</div>
          </div>
          <div className="news-groups">
            {c.groups.map(([title, items]) => (
              <div key={title} className="news-group">
                <b>{title}</b>
                <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      ))}
      {CHANGELOG.length > 1 && !all && <button className="chip-btn" onClick={() => setAll(true)}>Ver versiones anteriores</button>}
      <button className="btn-center" onClick={done}>¡A jugar!</button>
    </Modal>
  );
}

// Mientras jugás: si se publicó una versión nueva, aparece un aviso para recargar.
export function UpdateBanner() {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (typeof __BUILD__ === 'undefined' || import.meta.env.DEV) return undefined;
    let alive = true;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d?.build && d.build !== __BUILD__) setFresh(true); })
        .catch(() => {});
    };
    const t0 = setTimeout(check, 20000);
    const t = setInterval(check, 3 * 60000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearTimeout(t0); clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  if (!fresh) return null;
  return (
    <div className="update-banner" role="alert">
      <span>🆕 <b>¡Hay una actualización del juego con mejoras!</b> Recargá la página para tenerla (tu partida queda guardada).</span>
      <button className="btn-apply" onClick={() => { write(DAY_KEY, ''); window.location.reload(); }}>Recargar ahora</button>
      <button className="icon-btn sm" onClick={() => setFresh(false)} aria-label="Más tarde">✕</button>
    </div>
  );
}
