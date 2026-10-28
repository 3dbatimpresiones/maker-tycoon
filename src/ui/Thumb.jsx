// Miniaturas 3D de máquinas y productos (con dibujo 2D de respaldo mientras cargan o si no hay WebGL).
import { useEffect, useState } from 'react';
import MachineArt from './MachineArt.jsx';
import { PieceIcon } from './Pieces.jsx';
import { PRODUCTS } from '../game/data.js';
import { fcPhoto } from '../online/filacolor.js';

let mod = null;
let loading = null;
const subs = new Set();
function loadThumbs() {
  if (mod || loading) return loading;
  loading = import('../three/thumbs.js').then((m) => {
    if (!m.thumbsSupported()) { mod = { getThumb: () => null, onThumb: () => () => {} }; }
    else { mod = m; m.onThumb((key) => subs.forEach((sub) => { if (sub.key === key) sub.fn(); })); }
    subs.forEach((sub) => sub.fn());
    return mod;
  }).catch(() => { mod = { getThumb: () => null, onThumb: () => () => {} }; });
  return loading;
}

function useThumb(kind, id) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!id) return undefined;
    const sub = { key: `${kind}:${id}`, fn: () => setTick((x) => x + 1) };
    subs.add(sub);
    loadThumbs();
    return () => subs.delete(sub);
  }, [kind, id]);
  return mod && id ? mod.getThumb(kind, id) : undefined;
}

export function MachineThumb({ model, className = '', photo = true }) {
  // Foto real del producto (PNG sin fondo): si hay foto, no se dibuja la miniatura 3D.
  const ph = photo ? fcPhoto(model) : null;
  const url = useThumb('m', ph ? null : model);
  if (ph) return <img className={'thumb3d photo ' + className} src={ph} alt="" draggable="false" loading="lazy" />;
  if (url) return <img className={'thumb3d ' + className} src={url} alt="" draggable="false" />;
  return <div className={'thumb3d fallback ' + className}><MachineArt m={{ id: 'sh-' + model, model, cur: null, progress: 0, need: 0, state: 'idle' }} /></div>;
}

export function ProductThumb({ pid, size = 28, dim = false }) {
  const url = useThumb('p', pid);
  const P = PRODUCTS[pid];
  if (url) return <img className={'pthumb' + (dim ? ' dim' : '')} src={url} width={size} height={size} alt="" draggable="false" />;
  return <PieceIcon shape={P.shape} color={dim ? '#4b5279' : P.color} size={size} />;
}
