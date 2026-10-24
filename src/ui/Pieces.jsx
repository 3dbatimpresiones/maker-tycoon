// Siluetas de las piezas, dibujadas en una caja de 40×40 (se apoyan en y=40).
const EDGE = 'rgba(10,15,40,.35)';

export function PieceShape({ shape, color }) {
  const c = color;
  const dark = 'rgba(10,15,40,.45)';
  switch (shape) {
    case 'llavero':
      return (<g>
        <circle cx="13" cy="12" r="6" fill="none" stroke={c} strokeWidth="3" />
        <rect x="7" y="17" width="27" height="20" rx="5" fill={c} stroke={EDGE} />
        <rect x="11" y="23" width="4" height="9" rx="1" fill={dark} />
        <rect x="17" y="23" width="4" height="9" rx="1" fill={dark} />
        <rect x="23" y="23" width="6" height="4" rx="1" fill={dark} />
        <rect x="23" y="28" width="6" height="4" rx="1" fill={dark} />
      </g>);
    case 'benchy':
      return (<g stroke={EDGE}>
        <path d="M2 27 L38 27 L33 38 L8 38 Z" fill={c} />
        <rect x="13" y="14" width="15" height="13" fill={c} />
        <rect x="11" y="12" width="19" height="3" fill={c} />
        <rect x="22" y="5" width="5" height="8" fill={c} />
        <circle cx="19" cy="20" r="2.6" fill={dark} />
      </g>);
    case 'soporte':
      return (<g stroke={EDGE}>
        <path d="M5 38 L35 38 L35 33 L19 33 L29 7 L23 5 L11 33 L5 33 Z" fill={c} />
        <rect x="29" y="26" width="4" height="7" fill={c} />
      </g>);
    case 'maceta':
      return (<g stroke={EDGE}>
        <path d="M5 12 L35 12 L30 38 L10 38 Z" fill={c} />
        <path d="M5 12 L14 38 M20 12 L20 38 M35 12 L26 38" stroke={dark} strokeWidth="1.2" fill="none" />
        <rect x="4" y="9" width="32" height="4" rx="1" fill={c} />
      </g>);
    case 'figura': // una mini BATI de colección
      return (<g stroke={EDGE}>
        <path d="M11 4 L15 15 L9 15 Z M29 4 L31 15 L25 15 Z" fill={c} />
        <path d="M10 13 L30 13 L33 19 L30 25 L10 25 L7 19 Z" fill={c} />
        <path d="M12 16 L28 16 L29 21 L11 21 Z" fill={dark} />
        <path d="M13 25 L27 25 L28 34 L12 34 Z" fill={c} />
        <path d="M12 26 L3 30 L12 32 Z M28 26 L37 30 L28 32 Z" fill={c} />
        <rect x="9" y="34" width="22" height="5" rx="2" fill={c} />
      </g>);
    case 'gancho':
      return (<g>
        <rect x="21" y="2" width="12" height="16" rx="2" fill={c} stroke={EDGE} />
        <path d="M27 16 L27 28 Q27 37 18 37 Q10 37 10 29" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
      </g>);
    case 'engranaje': {
      const teeth = [];
      for (let i = 0; i < 8; i++) teeth.push(<rect key={i} x="17" y="5" width="6" height="7" rx="1" fill={c} transform={`rotate(${i * 45} 20 22)`} />);
      return (<g stroke={EDGE}>{teeth}<circle cx="20" cy="22" r="12" fill={c} /><circle cx="20" cy="22" r="4.5" fill={dark} /></g>);
    }
    case 'topes':
      return (<g stroke={EDGE}>
        <rect x="6" y="30" width="28" height="8" rx="4" fill={c} />
        <rect x="9" y="21" width="22" height="8" rx="4" fill={c} />
        <rect x="12" y="12" width="16" height="8" rx="4" fill={c} />
      </g>);
    case 'organizador':
      return (<g stroke={EDGE}>
        <rect x="3" y="14" width="34" height="24" rx="3" fill={c} />
        <path d="M14 14 V38 M26 14 V38 M3 26 H14" stroke={dark} strokeWidth="2" />
      </g>);
    case 'casco':
      return (<g stroke={EDGE}>
        <path d="M5 38 L5 22 Q5 4 20 4 Q35 4 35 22 L35 38 L28 38 L28 31 L12 31 L12 38 Z" fill={c} />
        <path d="M9 19 Q20 12 31 19 L30 26 L10 26 Z" fill="#131D47" />
        <path d="M11 20 Q20 15 29 20" stroke="#5DDADB" strokeWidth="1.5" fill="none" />
        <path d="M20 4 L20 12" stroke={dark} strokeWidth="2" />
      </g>);
    default:
      return <rect x="8" y="10" width="24" height="28" rx="3" fill={c} />;
  }
}

// Ícono chico de un producto (para listas).
export function PieceIcon({ shape, color, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <PieceShape shape={shape} color={color} />
    </svg>
  );
}
