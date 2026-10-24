// BATI, la mascota de 3DBAT, en SVG (basado en la ilustración oficial).
// mood: normal (ceja levantada) · happy · worried · wink
import { LINKS, IG_HANDLE } from '../config.js';
import Icon from './Icon.jsx';
import { FILACOLOR, fcUrl } from '../online/filacolor.js';
import { fmtText } from '../game/format.js';

const BLUE = '#2f3ec4', BLUE_L = '#4859e2', BLUE_D = '#2433a6', INK = '#0b1030', SCREEN = '#0c1131';
const PINK = '#f77fb4', TEAL = '#3cc4ae', TEAL_D = '#2a9c8a', WHITE = '#ffffff';

function Face({ mood }) {
  if (mood === 'happy') return (
    <g fill="none" stroke={WHITE} strokeWidth="5" strokeLinecap="round">
      <path d="M66 99 Q78 84 90 99" /><path d="M110 99 Q122 84 134 99" />
      <path d="M84 111 Q100 128 116 111 Z" fill={WHITE} strokeWidth="2" />
    </g>
  );
  if (mood === 'worried') return (
    <g>
      <circle cx="78" cy="97" r="10" fill={WHITE} /><circle cx="80" cy="99" r="4.5" fill={SCREEN} />
      <circle cx="122" cy="97" r="10" fill={WHITE} /><circle cx="120" cy="99" r="4.5" fill={SCREEN} />
      <path d="M66 80 L88 74" stroke={WHITE} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M112 74 L134 80" stroke={WHITE} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M86 120 q5 -5 9 0 t9 0 t9 0" stroke={WHITE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </g>
  );
  if (mood === 'wink') return (
    <g>
      <path d="M66 98 Q78 90 90 98" stroke={WHITE} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="121" cy="96" r="12" fill={SCREEN} stroke={WHITE} strokeWidth="4" />
      <circle cx="125" cy="91" r="3.2" fill={WHITE} />
      <path d="M86 112 Q100 124 116 110" stroke={WHITE} strokeWidth="4.5" fill="none" strokeLinecap="round" />
    </g>
  );
  // normal: como la ilustración (ojo entrecerrado, ceja levantada, media sonrisa)
  return (
    <g>
      <path d="M65 92 Q77 82 91 90 Q93 105 80 108 Q67 106 65 92 Z" fill={WHITE} />
      <path d="M63 90 Q78 80 93 88 L93 84 Q78 76 63 86 Z" fill={SCREEN} />
      <circle cx="84" cy="98" r="4.6" fill={SCREEN} />
      <circle cx="121" cy="97" r="12.5" fill={SCREEN} stroke={WHITE} strokeWidth="4" />
      <circle cx="125" cy="91" r="3.4" fill={WHITE} />
      <rect x="108" y="68" width="26" height="7" rx="3.5" fill={WHITE} transform="rotate(-14 121 71)" />
      <path d="M86 115 Q100 124 114 110 Q104 120 88 112 Z" fill={WHITE} stroke={WHITE} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

function Wing({ flip }) {
  return (
    <g transform={flip ? 'matrix(-1 0 0 1 200 0)' : undefined}>
      <path d="M62 150 L26 150 Q12 152 8 170 L4 206 Q14 194 25 202 Q30 189 42 195 Q46 183 58 187 Z" fill={TEAL} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 150 L26 150 Q12 152 8 170" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      <path d="M44 154 L25 200 M54 156 L42 194" stroke={TEAL_D} strokeWidth="2" />
    </g>
  );
}
function Ear({ flip }) {
  return (
    <g transform={flip ? 'matrix(-1 0 0 1 200 0)' : undefined}>
      <path d="M46 80 L24 16 Q24 8 32 10 L94 50 Z" fill={BLUE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 66 L33 22 L80 52 Z" fill={PINK} />
      <path d="M33 22 L80 52 L74 54 L36 30 Z" fill="#e0609a" opacity=".55" />
    </g>
  );
}

export function BatiArt({ mood = 'normal', size = 80, className = '' }) {
  return (
    <svg className={className} width={size} height={size * 1.3} viewBox="0 0 200 260" role="img" aria-label="BATI, la mascota de 3DBAT">
      <Wing /><Wing flip />
      {/* piernas y zapatillas */}
      <rect x="74" y="216" width="18" height="22" fill={BLUE_D} stroke={INK} strokeWidth="3" />
      <rect x="108" y="216" width="18" height="22" fill={BLUE_D} stroke={INK} strokeWidth="3" />
      <path d="M58 238 L92 234 L98 248 L58 252 Z" fill={WHITE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M58 248 L98 245 L98 253 L58 256 Z" fill={TEAL} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M142 238 L108 234 L102 248 L142 252 Z" fill={WHITE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M142 248 L102 245 L102 253 L142 256 Z" fill={TEAL} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {/* cuerpo */}
      <path d="M62 144 L138 144 L150 172 L144 210 L122 222 L78 222 L56 210 L50 172 Z" fill={BLUE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M56 206 L78 218 L122 218 L144 206 L142 212 L122 222 L78 222 L58 212 Z" fill={BLUE_D} />
      {/* emblema */}
      <path d="M100 182 L116 191 L116 209 L100 218 L84 209 L84 191 Z" fill={SCREEN} stroke={WHITE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M90 194 L100 188 L109 193 L104 196 L100 194 L94 197 Z" fill={PINK} />
      <path d="M90 194 L94 197 L94 207 L90 205 Z" fill={TEAL} />
      <path d="M94 207 L104 201 L104 205 L96 210 Z" fill={PINK} />
      <path d="M100 199 L109 193 L109 203 L104 205 Z" fill={TEAL} />
      {/* brazos cruzados */}
      <path d="M52 152 L68 146 L140 168 L134 184 L118 184 L56 168 Z" fill={BLUE_L} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M148 152 L132 146 L62 170 L68 184 L84 184 L144 168 Z" fill={BLUE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M68 172 L84 184 L68 184 Z" fill={BLUE_D} />
      {/* orejas y cabeza */}
      <Ear /><Ear flip />
      <path d="M50 38 L150 38 L176 64 L176 124 L152 150 L48 150 L24 124 L24 64 Z" fill={BLUE} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 38 L150 38 L162 50 L38 50 Z" fill={BLUE_L} />
      <path d="M24 124 L48 150 L152 150 L176 124 L170 122 L150 142 L50 142 L30 122 Z" fill={BLUE_D} />
      <path d="M56 56 L144 56 L162 74 L162 120 L144 138 L56 138 L38 120 L38 74 Z" fill="#5b6cf0" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 62 L140 62 L155 77 L155 116 L140 131 L60 131 L45 116 L45 77 Z" fill={SCREEN} />
      <Face mood={mood} />
    </svg>
  );
}

const CTA = {
  instagram: { label: `Seguir ${IG_HANDLE}`, href: LINKS.instagram, icon: 'instagram' },
  filacolor: { label: 'Filamentos en Filacolor', href: fcUrl(FILACOLOR.links.filamentos), icon: 'spool' },
  servicio: { label: 'Servicio técnico Filacolor', href: fcUrl(FILACOLOR.links.servicio), icon: 'wrench' },
  online: { label: 'Jugar online', icon: 'users', internal: true },
  batbox: { label: 'Abrir BATBOX', href: LINKS.batbox, icon: 'box' },
  comunidad: { label: 'Comunidad Makers 3DBAT', href: LINKS.comunidad, icon: 'users' },
};

export function CtaButtons({ list, onCta }) {
  return (
    <div className="cta-row">
      {list.filter((k) => CTA[k] && (!CTA[k].internal || onCta)).map((k) => (CTA[k].internal ? (
        <button key={k} className={'cta-btn cta-' + k} onClick={() => onCta(k)}><Icon name={CTA[k].icon} size={16} /> {CTA[k].label}</button>
      ) : (
        <a key={k} className={'cta-btn cta-' + k} href={CTA[k].href} target="_blank" rel="noopener noreferrer">
          <Icon name={CTA[k].icon} size={16} /> {CTA[k].label}
        </a>
      )))}
    </div>
  );
}

// Guía flotante: en el tutorial muestra el paso actual; después, la cola de mensajes.
export function BatiGuide({ tutorial, mission, queue, onDismiss, onSkip, onPoke, onCta }) {
  const msg = tutorial ? { id: 'tut', text: fmtText(mission.bati), mood: 'normal' } : queue[0];
  return (
    <div className={'bati-guide' + (msg ? ' open' : '')}>
      {msg && (
        <div className="bati-bubble" role="status" aria-live="polite">
          <p>{msg.text}</p>
          {msg.ctas && <CtaButtons list={msg.ctas} onCta={onCta} />}
          <div className="bati-actions">
            {tutorial
              ? <button className="link-btn" onClick={onSkip}>Saltear tutorial</button>
              : <><span className="bati-count">{queue.length > 1 ? `+${queue.length - 1}` : ''}</span>
                <button className="chip-btn" onClick={() => onDismiss(msg.id)}>Entendido</button></>}
          </div>
        </div>
      )}
      <button className="bati-avatar" onClick={onPoke} aria-label="Hablar con BATI">
        <BatiArt mood={msg?.mood || 'normal'} size={64} />
      </button>
    </div>
  );
}
