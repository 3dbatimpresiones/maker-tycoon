// Ilustraciones SVG de las 5 impresoras. La pieza crece capa por capa según el progreso
// (eso es estado, no animación: se ve igual con las animaciones apagadas).
import { PieceShape } from './Pieces.jsx';
import { PRODUCTS } from '../game/data.js';

const C = {
  frame: '#2a3480', frame2: '#4a52c8', dark: '#0d1433', plate: '#151d4f', brass: '#d8b25a',
};

// Pieza en una caja 40×40, ubicada en (x, yBottom) con escala k.
function Piece({ pid, p, x, yBottom, k, cid, ghost = true, printing }) {
  if (!pid) return null;
  const P = PRODUCTS[pid];
  const top = 40 * (1 - p);
  return (
    <g transform={`translate(${x} ${yBottom - 40 * k}) scale(${k})`}>
      {ghost && <g opacity=".13"><PieceShape shape={P.shape} color="#ffffff" /></g>}
      <clipPath id={cid}><rect x="-2" y={top} width="44" height={40 - top + 1} /></clipPath>
      <g clipPath={`url(#${cid})`}><PieceShape shape={P.shape} color={P.color} /></g>
      {printing && p > 0.02 && p < 0.999 && <rect className="mt-layer" x="0" y={top - 0.6} width="40" height="1.2" rx=".6" />}
    </g>
  );
}

function Fan({ cx, cy, r = 5 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.dark} stroke={C.frame2} strokeWidth="1" />
      <g className="mt-fan" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <path d={`M${cx} ${cy - r + 1} L${cx + 1.6} ${cy} L${cx - 1.6} ${cy} Z M${cx} ${cy + r - 1} L${cx - 1.6} ${cy} L${cx + 1.6} ${cy} Z`} fill={C.frame2} />
      </g>
    </g>
  );
}

function Toolhead({ x, y, w = 24, cls = 'mt-head' }) {
  // (x, y) = punta de la boquilla
  return (
    <g className={cls}>
      <rect x={x - w / 2} y={y - 27} width={w} height="21" rx="3.5" fill="#2b3290" stroke={C.frame2} strokeWidth="1.2" />
      <rect className="led" x={x - w / 2 + 3} y={y - 24} width={w - 6} height="2" rx="1" />
      <Fan cx={x} cy={y - 15} r={5.5} />
      <rect x={x - 4} y={y - 6.5} width="8" height="3" fill="#8a96b8" />
      <path d={`M${x - 3.2} ${y - 3.6} L${x + 3.2} ${y - 3.6} L${x} ${y} Z`} fill={C.brass} />
    </g>
  );
}

function Cat({ x, y }) {
  return (
    <g className="mt-cat" transform={`translate(${x} ${y})`}>
      <path d="M0 0 Q-2 -14 6 -18 L4 -26 L10 -21 L16 -21 L22 -26 L20 -18 Q28 -14 26 0 Z" fill="#0b0b12" stroke="#30365e" strokeWidth=".8" />
      <circle cx="9" cy="-14" r="1.6" fill="#ffd166" /><circle cx="17" cy="-14" r="1.6" fill="#ffd166" />
      <path d="M26 -2 Q36 -4 34 -14" stroke="#0b0b12" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Spaghetti({ x, y, color }) {
  return (
    <g className="mt-spag" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round">
      <path d={`M${x - 18} ${y} q6 -14 12 -2 t10 -6 t9 4 t8 -10`} />
      <path d={`M${x - 14} ${y - 6} q8 10 14 -4 t12 6 t6 -12`} />
      <path d={`M${x - 20} ${y - 12} q10 -6 16 4 t14 -8 t10 8`} />
      <path d={`M${x - 10} ${y - 18} q4 10 12 0 t10 4`} />
    </g>
  );
}

// ---------- Cama que va y viene (Kit Inicial / Cartesiana) ----------
function BedSlinger({ m, p, pid, cid, kit, printing, ev }) {
  const k = 1.05, bedTop = 116;
  const nozzleY = bedTop - 40 * k * p - 1;
  return (
    <>
      <rect x="10" y="132" width="140" height="15" rx="4" fill={C.plate} stroke={C.frame} strokeWidth="1.5" />
      {!kit && <><rect x="104" y="135.5" width="34" height="8" rx="2" fill={C.dark} /><rect className="led" x="107" y="138" width="16" height="3" rx="1" /></>}
      <rect x="20" y="22" width="8" height="112" rx="2" fill={C.frame} stroke={C.frame2} strokeWidth="1" />
      <rect x="132" y="22" width="8" height="112" rx="2" fill={C.frame} stroke={C.frame2} strokeWidth="1" />
      {!kit && <rect x="20" y="16" width="120" height="8" rx="3" fill={C.frame} stroke={C.frame2} strokeWidth="1" />}
      {kit && <>
        <path d="M24 30 C 6 50, 40 60, 18 80 S 30 110, 24 128" stroke="#F78EB6" strokeWidth="1.6" fill="none" opacity=".8" />
        <circle cx="136" cy="20" r="3" fill={C.frame2} />
        <rect x="131" y="18" width="10" height="5" rx="1" fill={C.frame2} transform="rotate(-12 136 20)" />
      </>}
      <g className={kit ? 'mt-bed mt-bed-kit' : 'mt-bed'}>
        <rect x="46" y={bedTop + 6} width="68" height="6" rx="2" fill={C.frame} />
        <rect x="34" y={bedTop} width="92" height="6" rx="2" fill={C.dark} stroke={C.frame2} strokeWidth="1" />
        <Piece pid={pid} p={p} x={80 - 20 * k} yBottom={bedTop} k={k} cid={cid} printing={printing} />
        {ev === 'spaghetti' && <Spaghetti x={80} y={bedTop - 2} color={PRODUCTS[pid]?.color || '#fff'} />}
        {ev === 'gato' && <Cat x={66} y={bedTop} />}
      </g>
      <rect x="24" y={nozzleY - 16} width="112" height="6" rx="2" fill={C.frame2} />
      <Toolhead x={80} y={nozzleY} />
    </>
  );
}

// ---------- CoreXY: la cama baja a medida que crece la pieza ----------
function CoreXY({ p, pid, cid, printing, ev, enclosed }) {
  const k = 1.0, nozzleY = 52;
  const bedTop = nozzleY + 40 * k * p + 1;
  return (
    <>
      <rect x="12" y="10" width="136" height="138" rx="8" fill="rgba(13,20,51,.55)" stroke={C.frame2} strokeWidth="5" />
      <rect className="led" x="18" y="13" width="124" height="2.5" rx="1.2" />
      <line x1="30" y1="24" x2="30" y2="138" stroke="#8a96b8" strokeWidth="2" strokeDasharray="2 2" />
      <line x1="130" y1="24" x2="130" y2="138" stroke="#8a96b8" strokeWidth="2" strokeDasharray="2 2" />
      <rect x="20" y="26" width="120" height="5" rx="2" fill={C.frame} />
      <g>
        <rect x="26" y={bedTop + 6} width="108" height="5" rx="2" fill={C.frame} />
        <rect x="36" y={bedTop} width="88" height="6" rx="2" fill={C.dark} stroke={C.frame2} strokeWidth="1" />
        <Piece pid={pid} p={p} x={80 - 20 * k} yBottom={bedTop} k={k} cid={cid} printing={printing} />
        {ev === 'spaghetti' && <Spaghetti x={80} y={bedTop - 2} color={PRODUCTS[pid]?.color || '#fff'} />}
        {ev === 'gato' && !enclosed && <Cat x={66} y={bedTop} />}
      </g>
      <rect x="20" y={nozzleY - 20} width="120" height="5" rx="2" fill={C.frame2} />
      <Toolhead x={80} y={nozzleY} w={20} cls="mt-head mt-head-xy" />
      {!enclosed && <path d="M118 128 l-6 9 h5 l-3 8 l8 -11 h-5 l3 -6 z" fill="#5DDADB" opacity=".85" />}
    </>
  );
}

function Enclosure({ children }) {
  return (
    <>
      <rect x="6" y="4" width="148" height="150" rx="12" fill="#1a2560" stroke={C.frame2} strokeWidth="2" />
      <rect x="10" y="8" width="140" height="8" rx="4" fill={C.frame} />
      <g transform="translate(8 6) scale(.9)">{children}</g>
      <rect x="18" y="20" width="124" height="118" rx="6" fill="url(#mtGlass)" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" />
      <path d="M30 26 L60 26 L34 132 L22 132 Z" fill="rgba(255,255,255,.06)" />
      <rect x="146" y="60" width="4" height="34" rx="2" fill="#8a96b8" />
      <rect x="20" y="142" width="40" height="7" rx="2" fill={C.dark} />
      <rect className="led" x="23" y="144" width="20" height="3" rx="1" />
    </>
  );
}

// ---------- Gran Formato ----------
function BigFormat({ p, pid, cid, printing, ev }) {
  const xl = pid && PRODUCTS[pid].xl;
  const k = xl ? 2.05 : 1.05, bedTop = 128;
  const nozzleY = bedTop - 40 * k * p - 1;
  return (
    <>
      <rect x="4" y="140" width="152" height="12" rx="4" fill={C.plate} stroke={C.frame} strokeWidth="1.5" />
      <rect x="6" y="4" width="11" height="138" rx="2" fill={C.frame} stroke={C.frame2} strokeWidth="1" />
      <rect x="143" y="4" width="11" height="138" rx="2" fill={C.frame} stroke={C.frame2} strokeWidth="1" />
      <rect x="6" y="2" width="148" height="8" rx="3" fill={C.frame} stroke={C.frame2} strokeWidth="1" />
      <rect className="led" x="20" y="4.5" width="120" height="2" rx="1" />
      <g className="mt-bed mt-bed-big">
        <rect x="14" y={bedTop} width="132" height="7" rx="2" fill={C.dark} stroke={C.frame2} strokeWidth="1" />
        <Piece pid={pid} p={p} x={80 - 20 * k} yBottom={bedTop} k={k} cid={cid} printing={printing} />
        {ev === 'spaghetti' && <Spaghetti x={80} y={bedTop - 2} color={PRODUCTS[pid]?.color || '#fff'} />}
        {ev === 'gato' && <Cat x={66} y={bedTop} />}
      </g>
      <rect x="10" y={nozzleY - 16} width="140" height="7" rx="2" fill={C.frame2} />
      <Toolhead x={80} y={nozzleY} w={28} cls="mt-head mt-head-big" />
      <rect x="120" y="143" width="26" height="7" rx="2" fill="#5DDADB" />
      <text x="133" y="149" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#131D47">XL</text>
    </>
  );
}

export default function MachineArt({ m, run, ev }) {
  const pid = m.cur || null;
  const p = m.state === 'done' ? 1 : m.need ? Math.min(1, m.progress / m.need) : 0;
  const printing = m.state === 'printing';
  const cid = `mtclip-${m.id}`;
  const cls = 'mt-svg' + (run ? ' run' : '') + (m.state === 'done' ? ' done' : '');
  let body;
  if (m.model === 'kit' || m.model === 'cartesiana') body = <BedSlinger m={m} p={p} pid={pid} cid={cid} kit={m.model === 'kit'} printing={printing} ev={ev} />;
  else if (m.model === 'rayo') body = <CoreXY p={p} pid={pid} cid={cid} printing={printing} ev={ev} />;
  else if (m.model === 'bunker') body = <Enclosure><CoreXY p={p} pid={pid} cid={cid} printing={printing} ev={ev} enclosed /></Enclosure>;
  else body = <BigFormat p={p} pid={pid} cid={cid} printing={printing} ev={ev} />;
  return (
    <svg className={cls} viewBox="0 0 160 156" aria-hidden="true">
      <defs>
        <linearGradient id="mtGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F78EB6" stopOpacity=".16" />
          <stop offset=".5" stopColor="#5DDADB" stopOpacity=".05" />
          <stop offset="1" stopColor="#3437A2" stopOpacity=".12" />
        </linearGradient>
      </defs>
      {body}
    </svg>
  );
}
