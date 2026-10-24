// Piezas 3D de cada producto. Cada una mide ~1 de ancho, apoya en y = 0 y está centrada.
// Los materiales se crean por instancia para poder "imprimirlas" con un plano de corte.
import * as THREE from 'three';
import { PRODUCTS, MATERIALS } from '../game/data.js';

const geoCache = new Map();
const g = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };

function roundRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}
// Extrusión acostada (la forma queda en el plano XZ, espesor hacia arriba en Y)
function flat(shape, depth, bevel = 0.015) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return geo;
}
// Extrusión parada (perfil en XY, espesor en Z)
function upright(shape, depth, bevel = 0.015) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}
function gearShape(r, teeth, tooth = 0.12, hole = 0.15) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = i % 4 === 1 || i % 4 === 2 ? r + tooth : r;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  return s;
}

function matFor(pid, color, opts = {}) {
  const P = PRODUCTS[pid];
  const mat = MATERIALS[P.mat];
  const base = { color, roughness: 0.55, metalness: 0.02, flatShading: !!opts.flat };
  if (mat.id === 'RESINA') Object.assign(base, { roughness: 0.32, metalness: 0.05 });
  if (mat.id === 'ACRILICO') Object.assign(base, { roughness: 0.08, transparent: true, opacity: 0.78 });
  if (mat.id === 'ALU') Object.assign(base, { roughness: 0.28, metalness: 0.9 });
  if (mat.id === 'MADERA' || mat.id === 'MDF') Object.assign(base, { roughness: 0.8 });
  if (mat.id === 'PACF') Object.assign(base, { roughness: 0.7, metalness: 0.15 });
  if (opts.emissive) Object.assign(base, { emissive: opts.emissive, emissiveIntensity: 0.9 });
  if (P.tech === 'fdm' || P.tech === 'resin') Object.assign(base, { roughness: P.tech === 'resin' ? 0.3 : 0.5 });
  return new THREE.MeshStandardMaterial(base);
}

// Líneas de capa reales (según la altura en el mundo) + franja de plástico caliente en la capa que se está imprimiendo.
// tech: 'fdm' (capas marcadas), 'resin' (capas finísimas), resto sin capas.
export function applyLayers(mats, tech, scale = 0.1) {
  if (tech !== 'fdm' && tech !== 'resin') return;
  const layer = tech === 'fdm' ? 0.0011 : 0.00035; // metros (exagerado un poco para que se vea)
  for (const m of mats) {
    if (m.transparent) continue;
    m.userData.cut = { value: 1e9 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uCut = m.userData.cut;
      sh.uniforms.uLayer = { value: layer };
      sh.uniforms.uHot = { value: tech === 'fdm' ? 1 : 0 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float uCut;\nuniform float uLayer;\nuniform float uHot;')
        .replace('#include <color_fragment>', `#include <color_fragment>
        float lf = fract(vWPos.y / uLayer);
        float ridge = smoothstep(0.0, 0.22, lf) * smoothstep(1.0, 0.78, lf);
        diffuseColor.rgb *= mix(0.84, 1.0, ridge);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (1.0 - ridge) * 0.18, 0.0, 1.0);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float dh = uCut - vWPos.y;
        float hot = uHot * (1.0 - smoothstep(0.0, uLayer * 3.0, dh)) * step(0.0, dh);
        totalEmissiveRadiance += vec3(1.0, 0.42, 0.12) * hot * 0.9;`);
    };
    m.customProgramCacheKey = () => 'layers-' + tech;
    m.needsUpdate = true;
  }
}

// Cada builder agrega mallas al grupo. c = colores [principal, secundario, terciario]
const B = {
  llavero(add, c) {
    const s = roundRect(0.9, 0.5, 0.12);
    const hole = new THREE.Path(); hole.absarc(-0.32, 0.12, 0.07, 0, Math.PI * 2, true); s.holes.push(hole);
    add(g('llav', () => flat(s, 0.08)), c[0]);
    for (let i = 0; i < 4; i++) add(g('llavL', () => new THREE.BoxGeometry(0.1, 0.06, 0.22)), c[1], [-0.1 + i * 0.14, 0.12, 0.02]);
  },
  benchy(add, c) {
    const hull = new THREE.Shape();
    hull.moveTo(-0.48, 0.18); hull.lineTo(0.5, 0.18); hull.quadraticCurveTo(0.42, 0.02, 0.28, 0); hull.lineTo(-0.36, 0); hull.quadraticCurveTo(-0.5, 0.05, -0.48, 0.18);
    add(g('bh', () => upright(hull, 0.42, 0.02)), c[0]);
    add(g('bc', () => new THREE.BoxGeometry(0.42, 0.3, 0.36)), c[0], [-0.05, 0.36, 0]);
    add(g('br', () => new THREE.BoxGeometry(0.5, 0.05, 0.42)), c[0], [-0.05, 0.53, 0]);
    add(g('bch', () => new THREE.CylinderGeometry(0.06, 0.07, 0.24, 16)), c[0], [0.06, 0.66, 0]);
    add(g('bw', () => new THREE.CylinderGeometry(0.06, 0.06, 0.38, 16).rotateX(Math.PI / 2)), '#1a1a22', [-0.02, 0.36, 0]);
  },
  soporte(add, c) {
    const s = new THREE.Shape();
    s.moveTo(-0.45, 0); s.lineTo(0.45, 0); s.lineTo(0.45, 0.08); s.lineTo(0.18, 0.08); s.lineTo(0.18, 0.18); s.lineTo(0.1, 0.18);
    s.lineTo(-0.2, 0.75); s.lineTo(-0.32, 0.72); s.lineTo(-0.1, 0.08); s.lineTo(-0.45, 0.08); s.lineTo(-0.45, 0);
    add(g('sop', () => upright(s, 0.6, 0.02)), c[0]);
  },
  maceta(add, c) {
    add(g('mac', () => new THREE.CylinderGeometry(0.45, 0.3, 0.62, 7, 1)), c[0], [0, 0.31, 0], true);
    add(g('macIn', () => new THREE.CylinderGeometry(0.4, 0.4, 0.02, 7)), '#2b1d12', [0, 0.6, 0], true);
    add(g('macLeaf', () => new THREE.ConeGeometry(0.1, 0.35, 5)), '#3fbf6a', [0.05, 0.75, 0], true);
    add(g('macLeaf2', () => new THREE.ConeGeometry(0.08, 0.28, 5).rotateZ(0.5)), '#2fa557', [-0.1, 0.7, 0.05], true);
  },
  figura(add, c) { // mini BATI
    add(g('fBody', () => new THREE.CylinderGeometry(0.2, 0.24, 0.36, 8)), c[0], [0, 0.22, 0], true);
    add(g('fHead', () => new THREE.CylinderGeometry(0.28, 0.28, 0.3, 8)), c[0], [0, 0.56, 0], true);
    add(g('fFace', () => new THREE.BoxGeometry(0.34, 0.2, 0.05)), c[1] || '#0c1131', [0, 0.56, 0.26]);
    add(g('fEar', () => new THREE.ConeGeometry(0.09, 0.3, 4)), c[0], [-0.18, 0.84, 0], true);
    add(g('fEar', () => new THREE.ConeGeometry(0.09, 0.3, 4)), c[0], [0.18, 0.84, 0], true);
    add(g('fWing', () => new THREE.ConeGeometry(0.14, 0.4, 3).rotateZ(Math.PI / 2)), c[2] || '#3cc4ae', [-0.38, 0.28, 0], true);
    add(g('fWing2', () => new THREE.ConeGeometry(0.14, 0.4, 3).rotateZ(-Math.PI / 2)), c[2] || '#3cc4ae', [0.38, 0.28, 0], true);
    add(g('fBase', () => new THREE.CylinderGeometry(0.34, 0.36, 0.05, 24)), '#2a2d34', [0, 0.025, 0]);
  },
  gancho(add, c) {
    add(g('gPlate', () => new THREE.BoxGeometry(0.3, 0.6, 0.06)), c[0], [0, 0.3, -0.25]);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.45, -0.22), new THREE.Vector3(0, 0.45, 0.05), new THREE.Vector3(0, 0.2, 0.2), new THREE.Vector3(0, 0.08, 0.05), new THREE.Vector3(0, 0.2, -0.05)]);
    add(g('gHook', () => new THREE.TubeGeometry(curve, 40, 0.06, 12)), c[0]);
  },
  engranaje(add, c) { add(g('gear', () => flat(gearShape(0.38, 12), 0.18)), c[0]); add(g('gearHub', () => new THREE.CylinderGeometry(0.2, 0.2, 0.26, 24)), c[0], [0, 0.13, 0]); },
  topes(add, c) {
    for (let i = 0; i < 3; i++) add(g('tope' + i, () => new THREE.CylinderGeometry(0.4 - i * 0.08, 0.42 - i * 0.08, 0.12, 24)), c[0], [0, 0.06 + i * 0.13, 0]);
  },
  organizador(add, c) {
    const W = 0.9, D = 0.6, H = 0.35, t = 0.03;
    add(g('oB', () => new THREE.BoxGeometry(W, t, D)), c[0], [0, t / 2, 0]);
    add(g('oS1', () => new THREE.BoxGeometry(W, H, t)), c[0], [0, H / 2, D / 2]);
    add(g('oS1', () => new THREE.BoxGeometry(W, H, t)), c[0], [0, H / 2, -D / 2]);
    add(g('oS2', () => new THREE.BoxGeometry(t, H, D)), c[0], [W / 2, H / 2, 0]);
    add(g('oS2', () => new THREE.BoxGeometry(t, H, D)), c[0], [-W / 2, H / 2, 0]);
    add(g('oS2', () => new THREE.BoxGeometry(t, H, D)), c[0], [-0.12, H / 2, 0]);
    add(g('oS3', () => new THREE.BoxGeometry(0.33, H, t)), c[0], [-0.29, H / 2, 0]);
  },
  carcasa(add, c) {
    add(g('car', () => new THREE.BoxGeometry(0.8, 0.32, 0.55)), c[0], [0, 0.16, 0]);
    for (let i = 0; i < 6; i++) add(g('carV', () => new THREE.BoxGeometry(0.04, 0.02, 0.3)), '#2a2d34', [-0.25 + i * 0.1, 0.33, 0]);
    add(g('carP', () => new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16).rotateX(Math.PI / 2)), '#2a2d34', [0.28, 0.16, 0.28]);
  },
  casco(add, c) {
    add(g('casco', () => new THREE.SphereGeometry(0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62)), c[0], [0, 0.18, 0]);
    add(g('cascoN', () => new THREE.CylinderGeometry(0.38, 0.42, 0.2, 24, 1, true)), c[0], [0, 0.1, 0]);
    add(g('visor', () => new THREE.SphereGeometry(0.47, 24, 8, -0.9, 1.8, 1.1, 0.5)), '#131D47', [0, 0.16, 0]);
    add(g('cresta', () => new THREE.BoxGeometry(0.06, 0.12, 0.7)), c[1] || '#F78EB6', [0, 0.62, -0.05]);
  },
  lampara(add, c) {
    const pts = [];
    for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector2(0.22 + Math.sin(i / 10 * Math.PI) * 0.18, i * 0.085));
    for (let k = 0; k < 3; k++) {
      const part = pts.slice(k * 3, k * 3 + 5);
      add(g('lamp' + k, () => new THREE.LatheGeometry(part, 9)), c[k % c.length], [0, 0, 0], true);
    }
    add(g('lampTop', () => new THREE.CylinderGeometry(0.2, 0.26, 0.04, 9)), c[0], [0, 0.86, 0], true);
  },
  maqueta(add, c) {
    add(g('mqBase', () => new THREE.BoxGeometry(0.95, 0.04, 0.75)), '#d8d8d8', [0, 0.02, 0]);
    const blocks = [[-0.3, 0.6, -0.2, 0.22], [0.05, 0.85, -0.15, 0.2], [0.32, 0.45, -0.18, 0.22], [-0.28, 0.32, 0.18, 0.26], [0.2, 0.25, 0.2, 0.34]];
    blocks.forEach(([x, h, z, w], i) => add(g('mqB' + i, () => new THREE.BoxGeometry(w, h, w)), c[0], [x, 0.04 + h / 2, z]));
    add(g('mqTree', () => new THREE.SphereGeometry(0.06, 8, 6)), '#7cc48a', [-0.05, 0.1, 0.25]);
  },
  dron(add, c) {
    add(g('dA', () => new THREE.BoxGeometry(1.0, 0.05, 0.1).rotateY(Math.PI / 4)), c[0], [0, 0.05, 0]);
    add(g('dB', () => new THREE.BoxGeometry(1.0, 0.05, 0.1).rotateY(-Math.PI / 4)), c[0], [0, 0.05, 0]);
    add(g('dC', () => new THREE.BoxGeometry(0.28, 0.08, 0.22)), c[0], [0, 0.08, 0]);
    for (const [x, z] of [[0.33, 0.33], [-0.33, 0.33], [0.33, -0.33], [-0.33, -0.33]]) add(g('dM', () => new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16)), '#5DDADB', [x, 0.1, z]);
  },
  armadura(add, c) {
    add(g('arT', () => new THREE.CylinderGeometry(0.3, 0.24, 0.55, 10)), c[0], [0, 0.42, 0], true);
    add(g('arC', () => new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), c[0], [0, 0.69, 0], true);
    add(g('arS', () => new THREE.SphereGeometry(0.15, 10, 8)), c[1] || '#F78EB6', [-0.36, 0.66, 0], true);
    add(g('arS', () => new THREE.SphereGeometry(0.15, 10, 8)), c[1] || '#F78EB6', [0.36, 0.66, 0], true);
    add(g('arB', () => new THREE.CylinderGeometry(0.26, 0.3, 0.14, 10)), '#3a3f4a', [0, 0.08, 0], true);
    add(g('arCore', () => new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16).rotateX(Math.PI / 2)), '#5DDADB', [0, 0.55, 0.27], false, '#5DDADB');
  },
  silla(add, c) {
    add(g('slS', () => new THREE.BoxGeometry(0.7, 0.07, 0.65)), c[0], [0, 0.48, 0]);
    add(g('slB', () => new THREE.BoxGeometry(0.7, 0.55, 0.07)), c[0], [0, 0.78, -0.3]);
    for (const [x, z] of [[0.3, 0.27], [-0.3, 0.27], [0.3, -0.27], [-0.3, -0.27]]) add(g('slL', () => new THREE.CylinderGeometry(0.03, 0.04, 0.46, 8)), c[0], [x, 0.23, z]);
  },
  miniatura(add, c) {
    add(g('miB', () => new THREE.CylinderGeometry(0.3, 0.32, 0.06, 24)), '#4a4f5c', [0, 0.03, 0]);
    add(g('miL', () => new THREE.CylinderGeometry(0.13, 0.16, 0.38, 10)), c[0], [0, 0.25, 0]);
    add(g('miT', () => new THREE.CylinderGeometry(0.16, 0.13, 0.25, 10)), c[0], [0, 0.56, 0]);
    add(g('miH', () => new THREE.SphereGeometry(0.11, 14, 10)), c[0], [0, 0.78, 0]);
    add(g('miSw', () => new THREE.BoxGeometry(0.04, 0.6, 0.06).rotateZ(-0.3)), '#d9dde5', [0.24, 0.6, 0.05]);
    add(g('miSh', () => new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16).rotateZ(Math.PI / 2)), c[0], [-0.2, 0.5, 0.05]);
  },
  anillo(add, c) {
    add(g('ring', () => new THREE.TorusGeometry(0.3, 0.07, 14, 40)), c[0], [0, 0.37, 0]);
    add(g('gem', () => new THREE.OctahedronGeometry(0.13)), '#5DDADB', [0, 0.76, 0]);
    add(g('ringBase', () => new THREE.BoxGeometry(0.12, 0.06, 0.12)), c[0], [0, 0.03, 0]);
  },
  dental(add, c) {
    add(g('dentBase', () => new THREE.TorusGeometry(0.32, 0.12, 10, 24, Math.PI).rotateX(Math.PI / 2)), '#f0a6b8', [0, 0.1, -0.05]);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      add(g('tooth', () => new THREE.BoxGeometry(0.09, 0.16, 0.1)), c[0], [Math.cos(a) * 0.32, 0.27, -0.05 + Math.sin(a) * 0.32]);
    }
  },
  busto(add, c) {
    add(g('buB', () => new THREE.BoxGeometry(0.5, 0.12, 0.4)), '#2a2d34', [0, 0.06, 0]);
    add(g('buS', () => new THREE.CylinderGeometry(0.22, 0.4, 0.3, 14, 1, false, 0, Math.PI * 2)), c[0], [0, 0.27, 0], true);
    add(g('buN', () => new THREE.CylinderGeometry(0.09, 0.1, 0.12, 10)), c[0], [0, 0.47, 0], true);
    add(g('buH', () => new THREE.SphereGeometry(0.2, 16, 12)), c[0], [0, 0.66, 0.02], true);
  },
  placa(add, c) {
    const s = roundRect(0.85, 0.55, 0.1);
    const hole = new THREE.Path(); hole.absarc(-0.32, 0.15, 0.06, 0, Math.PI * 2, true); s.holes.push(hole);
    add(g('placa', () => flat(s, 0.05, 0.005)), c[0]);
    add(g('placaE', () => new THREE.BoxGeometry(0.4, 0.01, 0.12)), '#ffffff', [0.1, 0.06, 0]);
  },
  posavasos(add, c) {
    add(g('pos', () => new THREE.CylinderGeometry(0.45, 0.45, 0.04, 40)), c[0], [0, 0.02, 0]);
    add(g('posR', () => new THREE.TorusGeometry(0.32, 0.015, 6, 40).rotateX(Math.PI / 2)), '#3b2414', [0, 0.04, 0]);
    add(g('posR2', () => new THREE.TorusGeometry(0.18, 0.015, 6, 40).rotateX(Math.PI / 2)), '#3b2414', [0, 0.04, 0]);
  },
  caja(add, c) {
    for (let i = 0; i < 3; i++) {
      add(g('cajaP', () => new THREE.BoxGeometry(0.42, 0.03, 0.3)), c[0], [-0.24 + (i % 2) * 0.48, 0.015, -0.18 + Math.floor(i / 2) * 0.36]);
      for (let k = 0; k < 4; k++) add(g('cajaT', () => new THREE.BoxGeometry(0.05, 0.031, 0.03)), '#3b2414', [-0.24 + (i % 2) * 0.48 - 0.15 + k * 0.1, 0.016, -0.18 + Math.floor(i / 2) * 0.36 + 0.14]);
    }
    add(g('cajaP', () => new THREE.BoxGeometry(0.42, 0.03, 0.3)), c[0], [0.24, 0.015, 0.18]);
  },
  cartel(add, c) {
    add(g('cart', () => flat(roundRect(0.95, 0.5, 0.06), 0.05, 0.005)), c[0], [0, 0, 0], false, c[0]);
    for (let i = 0; i < 5; i++) add(g('cartL', () => new THREE.BoxGeometry(0.1, 0.02, 0.22)), '#ffffff', [-0.3 + i * 0.15, 0.065, 0]);
  },
  mural(add, c) {
    const s = roundRect(0.98, 0.98, 0.02);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const h = new THREE.Path(); h.absarc(-0.33 + i * 0.22, -0.33 + k * 0.22, 0.07, 0, Math.PI * 2, true); s.holes.push(h); }
    add(g('mural', () => flat(s, 0.04, 0.004)), c[0]);
  },
  tabla(add, c) {
    const s = roundRect(0.9, 0.5, 0.14);
    add(g('tabla', () => flat(s, 0.08, 0.01)), c[0]);
    add(g('tablaG', () => new THREE.TorusGeometry(0.2, 0.012, 6, 40).rotateX(Math.PI / 2)), '#3b2414', [0.05, 0.095, 0]);
    add(g('tablaH', () => new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16)), '#3b2414', [-0.36, 0.05, 0]);
  },
  cartelmad(add, c) {
    add(g('cmB', () => flat(roundRect(0.95, 0.5, 0.05), 0.07, 0.01)), c[0]);
    for (let i = 0; i < 5; i++) add(g('cmL', () => new THREE.BoxGeometry(0.11, 0.06, 0.26)), '#5b3a1c', [-0.3 + i * 0.15, 0.1, 0]);
  },
  alu(add, c) {
    add(g('aluB', () => new THREE.BoxGeometry(0.7, 0.2, 0.45)), c[0], [0, 0.1, 0]);
    add(g('aluT', () => new THREE.BoxGeometry(0.35, 0.18, 0.45)), c[0], [-0.17, 0.29, 0]);
    for (const x of [0.15, 0.27]) add(g('aluH', () => new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16)), '#2a2d34', [x, 0.1, 0]);
  },
  mueble(add, c) {
    add(g('muT', () => new THREE.BoxGeometry(0.95, 0.06, 0.55)), c[0], [0, 0.7, 0]);
    add(g('muS', () => new THREE.BoxGeometry(0.06, 0.67, 0.5)), c[0], [-0.43, 0.335, 0]);
    add(g('muS', () => new THREE.BoxGeometry(0.06, 0.67, 0.5)), c[0], [0.43, 0.335, 0]);
    add(g('muM', () => new THREE.BoxGeometry(0.8, 0.04, 0.5)), c[0], [0, 0.3, 0]);
  },
};

// Construye la pieza de un producto. Devuelve { group, height, mats }.
export function buildPiece(pid) {
  const P = PRODUCTS[pid];
  const group = new THREE.Group();
  const colors = P.colors || [P.color, '#F78EB6', '#3cc4ae'];
  const mats = [];
  const add = (geo, color, pos = [0, 0, 0], flatShade = false, emissive = null) => {
    const m = matFor(pid, color, { flat: flatShade, emissive });
    mats.push(m);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  };
  (B[P.shape] || B.organizador)(add, colors);
  const box = new THREE.Box3().setFromObject(group);
  return { group, height: Math.max(0.05, box.max.y), width: box.max.x - box.min.x, mats };
}
