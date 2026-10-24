// Kit de modelado: piezas con bordes redondeados y materiales PBR realistas generados por código.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const geoCache = new Map();
const matCache = new Map();
const texCache = new Map();
const q = (n) => Math.round(n * 2000) / 2000;

// ---------- Texturas procedurales ----------
function canvasTex(key, w, h, draw, { color = false, repeat = [1, 1] } = {}) {
  const k = key + repeat.join('x');
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(k, t);
  return t;
}
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// Microtextura de plástico inyectado (rugosidad levemente irregular)
const plasticRough = () => canvasTex('plasticRough', 128, 128, (g, w, h) => {
  const r = rnd(3); const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = 150 + r() * 40; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}, { repeat: [4, 4] });
// Aluminio cepillado (rayas finas horizontales)
const brushed = () => canvasTex('brushed', 256, 256, (g, w, h) => {
  const r = rnd(7);
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { g.fillStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${0.04 + r() * 0.06})`; g.fillRect(0, y, w, 1); }
}, { repeat: [2, 2] });
// Cama PEI texturada (relieve granulado)
const peiBump = () => canvasTex('peiBump', 256, 256, (g, w, h) => {
  const r = rnd(9); const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = r() < 0.5 ? 120 + r() * 40 : 170 + r() * 50; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
}, { repeat: [3, 3] });
const peiColor = (tone) => canvasTex('peiColor' + tone, 256, 256, (g, w, h) => {
  const r = rnd(11);
  g.fillStyle = tone; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,235,190' : '40,25,5'},${r() * 0.14})`; g.fillRect(r() * w, r() * h, 1.2, 1.2); }
}, { color: true, repeat: [2, 2] });
// Fibra de carbono
const carbon = () => canvasTex('carbon', 128, 128, (g, w, h) => {
  g.fillStyle = '#121316'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { g.fillStyle = ((x + y) / 8) % 2 ? '#1c1d21' : '#0d0e10'; g.fillRect(x, y, 8, 8); }
}, { color: true, repeat: [6, 6] });
// Pantalla táctil con interfaz
export const screenTex = (accent = '#00ae42', kind = 'ui') => canvasTex('scr' + accent + kind, 256, 160, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#0d1220'); grd.addColorStop(1, '#05070d');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1a2236'; g.fillRect(0, 0, w, 22);
  g.fillStyle = accent; g.fillRect(10, 7, 40, 8);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '700 30px Arial'; g.fillText('58%', 20, 70);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '600 14px Arial'; g.fillText('0:42 restante', 20, 95);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(20, 112, 216, 10);
  g.fillStyle = accent; g.fillRect(20, 112, 125, 10);
  g.strokeStyle = accent; g.lineWidth = 6; g.beginPath(); g.arc(200, 62, 24, -Math.PI / 2, Math.PI * 0.6); g.stroke();
}, { color: true });

// ---------- Materiales ----------
export function mat(key, make) { if (!matCache.has(key)) matCache.set(key, make()); return matCache.get(key); }
export const MAT = {
  plastic: (color, rough = 0.48) => mat('pl' + color + rough, () => new THREE.MeshPhysicalMaterial({ color, roughness: rough, roughnessMap: plasticRough(), metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.6 })),
  matte: (color, rough = 0.75) => mat('mt' + color + rough, () => new THREE.MeshStandardMaterial({ color, roughness: rough, roughnessMap: plasticRough(), metalness: 0 })),
  alu: (color = '#b8bec8') => mat('alu' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.32, roughnessMap: brushed(), metalness: 0.92 })),
  anodized: (color = '#1b1c20') => mat('an' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.38, roughnessMap: brushed(), metalness: 0.75 })),
  steel: () => mat('steel', () => new THREE.MeshStandardMaterial({ color: '#c7ccd4', roughness: 0.22, metalness: 1 })),
  chrome: () => mat('chrome', () => new THREE.MeshStandardMaterial({ color: '#e6e9ee', roughness: 0.08, metalness: 1 })),
  brass: () => mat('brass', () => new THREE.MeshStandardMaterial({ color: '#d9b25c', roughness: 0.25, metalness: 1 })),
  copper: () => mat('copper', () => new THREE.MeshStandardMaterial({ color: '#c87d4a', roughness: 0.3, metalness: 1 })),
  rubber: () => mat('rubber', () => new THREE.MeshStandardMaterial({ color: '#0e0f12', roughness: 0.95, metalness: 0 })),
  belt: () => mat('belt', () => new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.85, metalness: 0 })),
  carbon: () => mat('carbon', () => new THREE.MeshPhysicalMaterial({ map: carbon(), roughness: 0.35, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 })),
  pei: (tone = '#b5893a') => mat('pei' + tone, () => new THREE.MeshStandardMaterial({ map: peiColor(tone), bumpMap: peiBump(), bumpScale: 0.6, roughness: 0.62, metalness: 0.35 })),
  glass: (tint = '#c9d6ea', opacity = 0.14) => mat('gl' + tint + opacity, () => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.03, metalness: 0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8 })),
  smoked: (tint = '#2b2f38', opacity = 0.5) => mat('sm' + tint + opacity, () => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.06, metalness: 0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 })),
  tinted: (tint, opacity = 0.45) => mat('ti' + tint + opacity, () => new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.08, metalness: 0, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 })),
  screen: (accent) => mat('scr' + accent, () => new THREE.MeshStandardMaterial({ map: screenTex(accent), emissive: '#ffffff', emissiveMap: screenTex(accent), emissiveIntensity: 0.7, roughness: 0.15, metalness: 0 })),
  glow: (color, i = 2) => mat('glow' + color + i, () => new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: i, roughness: 1 })),
  liquid: (color) => mat('liq' + color, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.02 })),
  wood: (color = '#8a6a45') => mat('wood' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 })),
  filament: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
};

// ---------- Geometría ----------
export function rboxGeo(w, h, d, r = 0.006, seg = 3) {
  const k = `rb${q(w)}_${q(h)}_${q(d)}_${q(r)}_${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
  return geoCache.get(k);
}
export function cylGeo(r1, r2, h, seg = 24, open = false) {
  const k = `cy${q(r1)}_${q(r2)}_${q(h)}_${seg}_${open}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(r1, r2, h, seg, 1, open));
  return geoCache.get(k);
}
function place(mesh, x, y, z, parent, shadow = true) {
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}
// Caja redondeada
export const rb = (w, h, d, m, x = 0, y = 0, z = 0, parent = null, r = 0.006, shadow = true) => place(new THREE.Mesh(rboxGeo(w, h, d, r), m), x, y, z, parent, shadow);
// Caja recta (planos finos, vidrios)
export const bx = (w, h, d, m, x = 0, y = 0, z = 0, parent = null, shadow = true) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), x, y, z, parent, shadow);
export const cy = (r1, r2, h, m, x = 0, y = 0, z = 0, parent = null, seg = 24) => place(new THREE.Mesh(cylGeo(r1, r2, h, seg), m), x, y, z, parent);
// Perfil de aluminio 2020/2040 (con ranuras sugeridas)
export function extrusion(len, axis, m, x, y, z, parent, w = 0.02, d = 0.02) {
  const g = new THREE.Group();
  const dims = axis === 'x' ? [len, w, d] : axis === 'y' ? [w, len, d] : [w, d, len];
  rb(dims[0], dims[1], dims[2], m, 0, 0, 0, g, 0.002);
  const slotM = mat('slot', () => new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.9 }));
  const sd = axis === 'x' ? [len * 0.98, w * 0.18, 0.001] : axis === 'y' ? [w * 0.18, len * 0.98, 0.001] : [0.001, d * 0.18, len * 0.98];
  bx(sd[0], sd[1], sd[2], slotM, axis === 'z' ? w / 2 + 0.0005 : 0, 0, axis === 'z' ? 0 : d / 2 + 0.0005, g, false);
  place(g, x, y, z, parent);
  return g;
}
// Bobina de filamento realista
export function spool(r, w, color, parent) {
  const g = new THREE.Group();
  const flangeM = mat('flange', () => new THREE.MeshPhysicalMaterial({ color: '#1a1b1f', roughness: 0.25, metalness: 0, transparent: true, opacity: 0.92, clearcoat: 0.5 }));
  for (const z of [-w / 2, w / 2]) { const f = new THREE.Mesh(cylGeo(r, r, 0.004, 40), flangeM); f.rotation.x = Math.PI / 2; f.position.z = z; f.castShadow = true; g.add(f); }
  const filM = MAT.filament(color);
  const core = new THREE.Mesh(cylGeo(r * 0.86, r * 0.86, w - 0.004, 40), filM); core.rotation.x = Math.PI / 2; core.castShadow = true; g.add(core);
  const hub = new THREE.Mesh(cylGeo(r * 0.32, r * 0.32, w + 0.003, 24), MAT.plastic('#0f1013', 0.6)); hub.rotation.x = Math.PI / 2; g.add(hub);
  if (parent) parent.add(g);
  g.userData.fil = filM;
  return g;
}
// Ventilador (carcasa + aspas que giran)
export function fan(size, m, parent, x, y, z, axis = 'z') {
  const g = new THREE.Group();
  rb(size, size, size * 0.25, m, 0, 0, 0, g, size * 0.12);
  const hole = new THREE.Mesh(cylGeo(size * 0.44, size * 0.44, size * 0.27, 24), mat('fanhole', () => new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1 })));
  hole.rotation.x = Math.PI / 2; g.add(hole);
  const blades = new THREE.Group();
  const bm = MAT.plastic('#202226', 0.5);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(rboxGeo(size * 0.38, size * 0.08, 0.002, 0.001), bm); b.position.x = size * 0.19; b.rotation.x = 0.4; const piv = new THREE.Group(); piv.rotation.z = (i / 7) * Math.PI * 2; piv.add(b); blades.add(piv); }
  blades.position.z = size * 0.14; g.add(blades);
  if (axis === 'x') g.rotation.y = Math.PI / 2;
  if (axis === 'y') g.rotation.x = -Math.PI / 2;
  place(g, x, y, z, parent);
  g.userData.blades = blades;
  return g;
}
export { THREE };
