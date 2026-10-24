// Materiales compartidos y texturas generadas por código (sin archivos externos).
import * as THREE from 'three';

const cache = new Map();
function canvasTex(key, w, h, draw, repeat = [1, 1], color = true) {
  const k = key + repeat.join('x');
  if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(k, t);
  return t;
}
// Ruido determinista
function rng(seed) { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), t | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

export const TEX = {
  wood: (rep = [2, 2], tone = '#6b4a2e') => canvasTex('wood' + tone, 512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { // tablas
      const y = (i * h) / 6;
      g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`; g.fillRect(0, y, w, h / 6);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 2);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `rgba(${r() < 0.5 ? '255,220,170' : '30,15,5'},${0.05 + r() * 0.08})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        const yy = y + r() * (h / 6);
        g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 32) g.lineTo(x, yy + Math.sin(x / 60 + k) * 3 * r());
        g.stroke();
      }
    }
  }, rep),
  concrete: (rep = [3, 3], tone = '#3a3f4b') => canvasTex('concrete' + tone, 512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = tone; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 60, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  }, rep),
  tiles: (rep = [4, 4]) => canvasTex('tiles', 256, 256, (g, w, h) => {
    g.fillStyle = '#d9dce4'; g.fillRect(0, 0, w, h);
    const r = rng(5);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = `hsl(225,12%,${80 + r() * 8}%)`; g.fillRect(x * w / 2 + 2, y * h / 2 + 2, w / 2 - 4, h / 2 - 4); }
    g.fillStyle = '#9aa0ae'; g.fillRect(0, h / 2 - 2, w, 4); g.fillRect(w / 2 - 2, 0, 4, h);
  }, rep),
  epoxy: (rep = [2, 2]) => canvasTex('epoxy', 512, 512, (g, w, h) => {
    const r = rng(3);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#5c6378'); grd.addColorStop(1, '#4e5468');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(40,50,80,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }, rep),
  pei: () => canvasTex('pei', 256, 256, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = '#b48e3c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,235,180' : '60,40,10'},${r() * 0.18})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }),
  pegboard: (rep = [6, 3]) => canvasTex('peg', 128, 128, (g, w, h) => {
    g.fillStyle = '#c9a77a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5b4632';
    for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  }, rep),
  honeycomb: () => canvasTex('honey', 256, 256, (g, w, h) => {
    g.fillStyle = '#2b2e35'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#555a66'; g.lineWidth = 2;
    const s = 16;
    for (let y = 0; y < h + s; y += s * 1.5) for (let x = 0; x < w + s; x += s * 1.732) {
      for (const off of [0, s * 0.866]) {
        const cx = x + off, cy = y + (off ? s * 0.75 : 0);
        g.beginPath();
        for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; g.lineTo(cx + Math.cos(a) * s / 2, cy + Math.sin(a) * s / 2); }
        g.closePath(); g.stroke();
      }
    }
  }, [3, 3]),
  corrugated: (rep = [6, 1]) => canvasTex('corr', 64, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#5d6472'); grd.addColorStop(0.5, '#8a92a3'); grd.addColorStop(1, '#5d6472');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, rep),
  screen: (accent = '#5DDADB') => canvasTex('screen' + accent, 256, 160, (g, w, h) => {
    g.fillStyle = '#071022'; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.globalAlpha = 0.9;
    g.fillRect(14, 14, 90, 10); g.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) g.fillRect(14, 40 + i * 22, 150 - i * 25, 8);
    g.globalAlpha = 0.8; g.beginPath(); g.arc(200, 85, 34, -Math.PI / 2, Math.PI); g.lineWidth = 9; g.strokeStyle = accent; g.stroke();
  }),
  slicer: () => canvasTex('slicer', 512, 300, (g, w, h) => {
    g.fillStyle = '#10141f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b2333'; g.fillRect(0, 0, w, 26); g.fillRect(0, 26, 120, h);
    g.fillStyle = '#5DDADB'; g.fillRect(380, 4, 120, 18);
    g.strokeStyle = 'rgba(93,218,219,.25)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(140 + i * 30, 240); g.lineTo(220 + i * 18, 120); g.stroke(); }
    g.fillStyle = '#F78EB6'; g.beginPath(); g.moveTo(260, 230); g.lineTo(330, 230); g.lineTo(300, 140); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 8; i++) g.fillRect(12, 40 + i * 28, 90, 10);
  }),
  label: (text, fg = '#F78EB6', bg = 'rgba(0,0,0,0)', font = 800, wpx = 1024, hpx = 256) => canvasTex('label' + text + fg + bg, wpx, hpx, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = `${font} ${Math.floor(h * 0.62)}px Outfit, Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 24;
    g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 4);
    g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.fillText(text, w / 2, h / 2 + 4);
  }),
  poster: (title, sub, c1 = '#F78EB6', c2 = '#5DDADB') => canvasTex('poster' + title, 256, 360, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#1a2560'); grd.addColorStop(1, '#3437A2');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = c1; g.lineWidth = 8; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = c1; g.font = '800 64px Outfit, Arial'; g.textAlign = 'center'; g.fillText(title, w / 2, h * 0.45);
    g.fillStyle = c2; g.font = '700 30px Outfit, Arial'; g.fillText(sub, w / 2, h * 0.62);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '600 18px Outfit, Arial'; g.fillText('3DBAT IMPRESIONES', w / 2, h * 0.86);
  }),
};

const mats = new Map();
export function std(color, rough = 0.55, metal = 0.1, extra = {}) {
  const k = `std${color}${rough}${metal}${JSON.stringify(extra, (key, v) => (v && v.isTexture ? v.uuid : v))}`;
  if (mats.has(k)) return mats.get(k);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
  mats.set(k, m);
  return m;
}
export const M = {
  black: () => std('#1b1d22', 0.5, 0.35),
  dark: () => std('#2a2d34', 0.55, 0.3),
  alu: () => std('#aab2c0', 0.32, 0.85),
  steel: () => std('#7d8594', 0.4, 0.8),
  rail: () => std('#c9ced8', 0.25, 0.9),
  brass: () => std('#d8b25a', 0.3, 0.9),
  white: () => std('#d9dce3', 0.5, 0.05),
  rubber: () => std('#111216', 0.9, 0),
  pei: () => std('#ffffff', 0.45, 0.45, { map: TEX.pei() }),
  bedDark: () => std('#2b2b2e', 0.35, 0.4),
  glass: (tint = '#9fb4d8', opacity = 0.16) => {
    const k = 'glass' + tint + opacity;
    if (!mats.has(k)) mats.set(k, new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.05, metalness: 0, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.6, side: THREE.DoubleSide }));
    return mats.get(k);
  },
  tinted: (tint, opacity = 0.5) => {
    const k = 'tint' + tint + opacity;
    if (!mats.has(k)) mats.set(k, new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.12, metalness: 0, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.2, side: THREE.DoubleSide }));
    return mats.get(k);
  },
  glow: (color, intensity = 2) => {
    const k = 'glow' + color + intensity;
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: intensity, roughness: 1 }));
    return mats.get(k);
  },
  screen: (accent) => std('#ffffff', 0.3, 0, { map: TEX.screen(accent), emissive: '#ffffff', emissiveMap: TEX.screen(accent), emissiveIntensity: 0.9 }),
  frame: (color) => {
    const light = ['#e8eaee', '#e9ebef', '#e6e7ea', '#e7e8ea'].includes(color);
    return std(light ? '#cfd3da' : color, light ? 0.55 : 0.48, color === '#fa6831' || light ? 0.05 : 0.35);
  },
};
