// Tu música de Spotify mientras jugás (reproductor oficial embebido de Spotify).
// Cuando suena, la música y el ambiente del juego se apagan solos; al pausar, vuelven.
// Sin cuenta de Spotify abierta en el navegador, Spotify pasa fragmentos de 30 s.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Icon from './Icon.jsx';
import { sfx } from './sfx.js';

// Estado compartido entre el botón del encabezado y el reproductor.
const store = { open: false, min: false, playing: false };
const subs = new Set();
const emit = () => { snap = { ...store }; subs.forEach((f) => f()); };
let snap = { ...store };
const set = (patch) => { Object.assign(store, patch); emit(); };
export function useSpotify() {
  const st = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => snap);
  return { ...st, toggle: () => (store.open ? set({ min: !store.min }) : set({ open: true, min: false })) };
}

export const SUGGESTED = [
  { name: 'lofi beats', uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn' },
  { name: 'Deep Focus', uri: 'spotify:playlist:37i9dQZF1DWZeKCadgRdKQ' },
  { name: 'Jazz Vibes', uri: 'spotify:playlist:37i9dQZF1DX0SM0LYsmbMT' },
  { name: 'Intense Studying', uri: 'spotify:playlist:37i9dQZF1DX8NTLI2TtZa6' },
  { name: 'Today’s Top Hits', uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M' },
];

// Acepta links de Spotify (playlist, álbum, canción, artista, podcast) o URIs spotify:tipo:id.
export function parseSpotify(text) {
  const t = String(text || '').trim();
  let m = t.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]{10,40})/);
  if (m) return `spotify:${m[1]}:${m[2]}`;
  m = t.match(/^spotify:(playlist|album|track|artist|episode|show):([A-Za-z0-9]{10,40})$/);
  return m ? t : null;
}

let apiP = null;
function loadApi() {
  if (!apiP) {
    apiP = new Promise((resolve, reject) => {
      window.onSpotifyIframeApiReady = (api) => resolve(api);
      const sc = document.createElement('script');
      sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true;
      sc.onerror = () => { apiP = null; reject(new Error('No se pudo cargar Spotify.')); };
      document.body.appendChild(sc);
    });
  }
  return apiP;
}

export function SpotifyDock({ s, actions }) {
  const st = useSpotify();
  const holder = useRef(null);
  const ctrl = useRef(null);
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const [uri, setUri] = useState(s.settings.spotifyUri || SUGGESTED[0].uri);

  // Crea el reproductor la primera vez que se abre (y lo deja vivo al minimizar).
  useEffect(() => {
    if (!st.open || ctrl.current) return undefined;
    let alive = true;
    loadApi().then((api) => {
      if (!alive || !holder.current) return;
      const el = document.createElement('div');
      holder.current.appendChild(el);
      api.createController(el, { uri, width: '100%', height: 152 }, (c) => {
        ctrl.current = c;
        c.addListener('playback_update', (e) => {
          const playing = !!e?.data && !e.data.isPaused && !e.data.isBuffering;
          if (playing !== store.playing) set({ playing });
          sfx.setDucked(playing);
        });
      });
    }).catch((e) => setErr(e.message));
    return () => { alive = false; };
  }, [st.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = (u) => {
    setErr('');
    setUri(u);
    actions.setting('spotifyUri', u);
    if (ctrl.current) { ctrl.current.loadUri(u); setTimeout(() => ctrl.current?.play(), 400); }
  };
  const fromLink = () => {
    const u = parseSpotify(link);
    if (!u) { setErr('Pegá un link de Spotify (playlist, álbum, canción o podcast).'); return; }
    setLink(''); load(u);
  };
  const close = () => {
    try { ctrl.current?.destroy(); } catch { /* ya no estaba */ }
    ctrl.current = null;
    if (holder.current) holder.current.innerHTML = '';
    sfx.setDucked(false);
    set({ open: false, min: false, playing: false });
  };

  if (!st.open) return null;
  return (
    <div className={'spotify-dock' + (st.min ? ' min' : '') + (st.playing ? ' playing' : '')} role="region" aria-label="Tu música de Spotify">
      {/* Achicado: solo el logo (la música sigue sonando) */}
      <button className="sd-mini" onClick={() => set({ min: false })} title={st.playing ? 'Sonando · tocá para ver el reproductor' : 'Mostrar el reproductor de Spotify'}>
        <Icon name="spotify" size={30} />
      </button>
      <div className="sd-head">
        <span className="sd-title"><Icon name="spotify" size={18} /> {st.playing ? 'Sonando tu música' : 'Tu música'}</span>
        {st.playing && <span className="sd-duck" title="La música y el ambiente del juego se apagan mientras suena Spotify">Juego en silencio</span>}
        <button className="icon-btn sm" onClick={() => set({ min: !st.min })} title={st.min ? 'Mostrar' : 'Achicar'}><Icon name={st.min ? 'plus' : 'minus'} size={16} /></button>
        <button className="icon-btn sm" onClick={close} title="Cerrar Spotify"><Icon name="x" size={16} /></button>
      </div>
      <div className="sd-body">
        <div className="sd-player" ref={holder} />
        <label className="sd-vol">
          <span>Sonidos del juego</span>
          <input type="range" min="0" max="1" step="0.05" value={s.settings.volume ?? 0.6} onChange={(e) => actions.setting('volume', Number(e.target.value))} />
        </label>
        <p className="hint sd-vol-hint">El volumen de Spotify se maneja desde el volumen de tu compu o celular: Spotify no deja que una web lo cambie. Con esta barra equilibrás los sonidos del juego.</p>
        <div className="sd-suggest">{SUGGESTED.map((p) => <button key={p.uri} className={'opt sm' + (uri === p.uri ? ' active' : '')} onClick={() => load(p.uri)}>{p.name}</button>)}</div>
        <div className="sd-link">
          <div className="pink-input"><input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fromLink(); }} placeholder="Pegá el link de tu playlist de Spotify" /></div>
          <button className="chip-btn" onClick={fromLink}>Cargar</button>
        </div>
        {err && <p className="ol-err">{err}</p>}
        <p className="hint">Con tu cuenta de Spotify abierta en este navegador suenan las canciones completas (si no, Spotify pasa 30 s de cada una). Mientras suena, la música del juego se apaga sola.</p>
      </div>
    </div>
  );
}
