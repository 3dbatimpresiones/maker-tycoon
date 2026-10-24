// Miniaturas 3D de máquinas y productos (con dibujo 2D de respaldo mientras cargan o si no hay WebGL).
import { useEffect, useState } from 'react';
import MachineArt from './MachineArt.jsx';
import { PieceIcon } from './Pieces.jsx';
import { PRODUCTS } from '../game/data.js';

let mod = null;
let loading = null;
const subs = new Set();
function loadThumbs() {
  if (mod || loading) return loading;
  loading = import('../three/thumbs.js').then((m) => {
    if (!m.thumbsSupported()) { mod = { getThumb: () => null, onThumb: () => () => {} }; }
    else { mod = m; m.onThumb(() => subs.forEach((fn) => fn())); }
    subs.forEach((fn) => fn());
    return mod;
  }).catch(() => { mod = { getThumb: () => null, onThumb: () => () => {} }; });
  return loading;
}

function useThumb(kind, id) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((x) => x + 1);
    subs.add(fn);
    loadThumbs();
    return () => subs.delete(fn);
  }, []);
  return mod ? mod.getThumb(kind, id) : undefined;
}

export function MachineThumb({ model, className = '' }) {
  const url = useThumb('m', model);
  if (url) return <img className={'thumb3d ' + className} src={url} alt="" draggable="false" />;
  return <div className={'thumb3d fallback ' + className}><MachineArt m={{ id: 'sh-' + model, model, cur: null, progress: 0, need: 0, state: 'idle' }} /></div>;
}

export function ProductThumb({ pid, size = 28, dim = false }) {
  const url = useThumb('p', pid);
  const P = PRODUCTS[pid];
  if (url) return <img className={'pthumb' + (dim ? ' dim' : '')} src={url} width={size} height={size} alt="" draggable="false" />;
  return <PieceIcon shape={P.shape} color={dim ? '#4b5279' : P.color} size={size} />;
}
