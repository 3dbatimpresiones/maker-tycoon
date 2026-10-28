// Máquinas en 3D con proporciones aproximadas a las reales (en metros).
// Cada builder arma un "rig": root (Group), pieceSlot (donde crece la pieza), partes móviles,
// luz de estado y emisores de efectos. update(st) anima todo según el estado del juego.
import * as THREE from 'three';
import { disposeObject } from './resources.js';
import { batchStatic, movingNodes } from './batchStatic.js';
import { MAT, rb, bx, cy, extrusion, spool, fan, mat } from './kit.js';
import { buildPiece, applyLayers } from './pieces.js';
import { MACHINES, MATERIALS, PRODUCTS } from '../game/data.js';

const STATUS_COLORS = { print: '#5DDADB', done: '#34D399', event: '#FBBF24', nofil: '#EF4444', idle: '#3a4060', pause: '#F78EB6', start: '#5DDADB' };
const AMS_COLORS = ['#f2f2f2', '#1f1f22', '#e8443a', '#3a7bd5'];

function baseRig(model) {
  const def = MACHINES[model];
  const rig = {
    model, def, root: new THREE.Group(), pieceSlot: new THREE.Group(), pieceMode: 'up', pieceScale: 0.12,
    emissives: [], spools: [], parts: {}, pieceGroups: [], extra: new THREE.Group(), emitters: [],
    footprint: 0.4, height: 0.45, floor: false, fans: [],
    statusMat: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#3a4060', emissiveIntensity: 2, roughness: 1 }),
  };
  rig.root.userData.machineRig = rig;
  return rig;
}
const statusBar = (rig, w, x, y, z, parent) => { const s = bx(w, 0.004, 0.003, rig.statusMat, x, y, z, parent, false); rig.parts.status = s; return s; };
const screen = (rig, w, h, accent, x, y, z, parent, tilt = 0) => {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = -tilt; parent.add(g);
  rb(w + 0.008, h + 0.008, 0.008, MAT.plastic('#0b0c0f', 0.3), 0, 0, 0, g, 0.003);
  const s = bx(w, h, 0.001, MAT.screen(accent), 0, 0, 0.0045, g, false);
  rig.emissives.push(s.material);
  return g;
};

// ---------- Cabezales ----------
function nozzleParts(h, k) {
  bx(0.02 * k, 0.012 * k, 0.026 * k, MAT.alu(), 0, -0.006 * k, 0, h);
  const noz = new THREE.Mesh(new THREE.ConeGeometry(0.004 * k, 0.01 * k, 14), MAT.brass()); noz.rotation.x = Math.PI; noz.position.y = -0.016 * k; h.add(noz);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.0025 * k, 10, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff6a1a', emissiveIntensity: 0 }));
  glow.position.y = -0.021 * k; h.add(glow);
  return glow;
}
function headBambu(body = '#d9dce2', face = '#2a2c31', parent, k = 1) {
  const h = new THREE.Group();
  rb(0.05 * k, 0.07 * k, 0.05 * k, MAT.plastic(body, 0.42), 0, 0.03 * k, 0, h, 0.008 * k);
  rb(0.044 * k, 0.05 * k, 0.004 * k, MAT.plastic(face, 0.35), 0, 0.034 * k, 0.026 * k, h, 0.004 * k);
  const f = fan(0.028 * k, MAT.plastic('#15161a', 0.5), h, 0, 0.036 * k, 0.029 * k);
  const glow = nozzleParts(h, k);
  if (parent) parent.add(h);
  h.userData = { fan: f.userData.blades, glow, tip: -0.021 * k };
  return h;
}
function headSprite(parent, k = 1) { // estilo Creality: bloque negro con disipador y ventilador
  const h = new THREE.Group();
  rb(0.05 * k, 0.075 * k, 0.045 * k, MAT.plastic('#141518', 0.45), 0, 0.034 * k, 0, h, 0.005 * k);
  for (let i = 0; i < 6; i++) bx(0.044 * k, 0.002 * k, 0.03 * k, MAT.anodized('#2a2c31'), 0, 0.012 * k + i * 0.007 * k, -0.026 * k, h);
  const f = fan(0.032 * k, MAT.plastic('#0e0f12', 0.5), h, 0, 0.036 * k, 0.026 * k);
  const glow = nozzleParts(h, k);
  if (parent) parent.add(h);
  h.userData = { fan: f.userData.blades, glow, tip: -0.021 * k };
  return h;
}
function headGeneric(frame, accent, parent, k = 1) {
  const h = new THREE.Group();
  rb(0.05 * k, 0.07 * k, 0.048 * k, MAT.plastic(frame, 0.45), 0, 0.032 * k, 0, h, 0.006 * k);
  rb(0.04 * k, 0.012 * k, 0.003 * k, MAT.plastic(accent, 0.4), 0, 0.055 * k, 0.025 * k, h, 0.002 * k);
  const f = fan(0.03 * k, MAT.plastic('#121316', 0.5), h, 0, 0.03 * k, 0.026 * k);
  const glow = nozzleParts(h, k);
  if (parent) parent.add(h);
  h.userData = { fan: f.userData.blades, glow, tip: -0.021 * k };
  return h;
}

// Cama: placa portadora + chapa PEI (dorada o negra)
function bedPlate(size, tone, parent, y = 0) {
  const g = new THREE.Group(); g.position.y = y; parent.add(g);
  rb(size * 1.06, 0.008, size * 1.06, MAT.anodized('#202226'), 0, 0, 0, g, 0.003);
  rb(size, 0.0025, size, MAT.pei(tone), 0, 0.0055, 0, g, 0.001);
  return g;
}

// ---------- Creality Ender-3 V3 SE ----------
function ender(rig) {
  const R = rig.root;
  const black = MAT.anodized('#1a1b1e');
  const W = 0.36, D = 0.38, H = 0.40;
  for (const x of [-0.06, 0.06]) extrusion(D, 'z', black, x, 0.03, 0, R, 0.02, 0.04);
  extrusion(W - 0.04, 'x', black, 0, 0.03, D / 2 - 0.02, R, 0.02, 0.04);
  extrusion(W - 0.04, 'x', black, 0, 0.03, -D / 2 + 0.02, R, 0.02, 0.04);
  rb(0.12, 0.07, 0.22, MAT.plastic('#141518', 0.5), W / 2 - 0.07, 0.035, 0.03, R, 0.006);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cy(0.012, 0.014, 0.012, MAT.rubber(), x * (W / 2 - 0.03), 0.006, z * (D / 2 - 0.03), R);
  screen(rig, 0.085, 0.055, '#2f7cff', W / 2 + 0.005, 0.075, D / 2 - 0.03, R, 0.5).rotation.y = -0.35;
  statusBar(rig, 0.05, -0.06, 0.012, D / 2 + 0.001, R);
  for (const x of [-0.06, 0.06]) { const rod = cy(0.004, 0.004, D * 0.95, MAT.chrome(), x, 0.06, 0, R, 12); rod.rotation.x = Math.PI / 2; }
  const bed = new THREE.Group(); bed.position.y = 0.07; R.add(bed);
  rb(0.24, 0.006, 0.24, MAT.alu('#9aa2ae'), 0, 0, 0, bed, 0.002);
  const plate = bedPlate(0.23, '#1d1e22', bed, 0.012);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cy(0.008, 0.008, 0.012, MAT.plastic('#2b6cff', 0.4), x * 0.105, 0.006, z * 0.105, bed, 12);
  rig.pieceSlot.position.y = 0.0075; plate.add(rig.pieceSlot);
  rig.parts.bed = bed; rig.parts.bedTravel = 0.06;
  for (const sx of [-1, 1]) {
    extrusion(H, 'y', black, sx * (W / 2 - 0.035), 0.05 + H / 2, -0.02, R, 0.02, 0.04);
    cy(0.004, 0.004, H * 0.9, MAT.steel(), sx * (W / 2 - 0.06), 0.05 + H / 2, -0.035, R, 10);
  }
  extrusion(W - 0.05, 'x', black, 0, 0.06 + H, -0.02, R, 0.02, 0.02);
  rb(0.03, 0.04, 0.02, MAT.plastic('#141518', 0.5), 0, 0.09 + H, -0.02, R, 0.004);
  const sp = spool(0.08, 0.065, '#5DDADB', R); sp.position.set(0, 0.17 + H, -0.02); sp.rotation.y = Math.PI / 2;
  rig.spools.push(sp);
  const gantry = new THREE.Group(); R.add(gantry);
  extrusion(W - 0.06, 'x', black, 0, 0.03, -0.03, gantry, 0.02, 0.02);
  for (const y of [0.012, 0.045]) { const rod = cy(0.0035, 0.0035, W - 0.08, MAT.chrome(), 0, y, -0.016, gantry, 10); rod.rotation.z = Math.PI / 2; }
  bx(W - 0.08, 0.006, 0.0015, MAT.belt(), 0, 0.03, -0.0195, gantry, false);
  const head = headSprite(gantry); head.position.z = 0.012;
  rig.parts.gantry = gantry; rig.parts.head = head; rig.parts.headTravel = 0.09; rig.parts.headCenter = 0;
  rig.parts.zBase = 0.07 + 0.012 + 0.0075 - head.userData.tip + 0.001;
  rig.fans.push(head.userData.fan);
  rig.footprint = Math.max(W + 0.05, D); rig.height = H + 0.26;
  rig.pieceScale = 0.105;
  rig.anim = 'bed';
}

// ---------- Bambu Lab A1 mini / A1 ----------
function bambuBed(rig, a, big) {
  const R = rig.root;
  const gray = MAT.plastic(a.frame || '#e3e5ea', 0.5);
  const dark = MAT.plastic('#2a2c31', 0.45);
  const W = big ? 0.42 : 0.33, D = big ? 0.42 : 0.32, H = big ? 0.38 : 0.33;
  const plateSize = big ? 0.256 : 0.18;
  const ox = big ? 0 : 0.02;
  rb(W * 0.82, 0.065, D * 0.95, gray, ox, 0.0325, 0, R, 0.014);
  rb(W * 0.78, 0.008, D * 0.9, dark, ox, 0.068, 0, R, 0.003);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cy(0.012, 0.012, 0.008, MAT.rubber(), x * W * 0.36 + ox, 0.004, z * D * 0.4, R);
  screen(rig, big ? 0.07 : 0.055, big ? 0.045 : 0.035, a.accent, W * (big ? 0.3 : 0.32), 0.05, D * 0.47 + 0.004, R, 0.45);
  statusBar(rig, 0.04, -W * 0.2, 0.06, D * 0.475 + 0.002, R);
  const bed = new THREE.Group(); bed.position.y = 0.074; R.add(bed);
  const plate = bedPlate(plateSize, '#b5893a', bed, 0.004);
  rig.pieceSlot.position.y = 0.007; plate.add(rig.pieceSlot);
  rig.parts.bed = bed; rig.parts.bedTravel = plateSize * 0.25;
  const gantry = new THREE.Group(); R.add(gantry);
  if (!big) {
    rb(0.045, H, 0.065, gray, -W * 0.42, H / 2 + 0.04, -0.03, R, 0.012);
    rb(0.03, H * 0.95, 0.002, MAT.anodized('#1d1e22'), -W * 0.42 + 0.024, H / 2 + 0.04, -0.03, R, 0.001);
    rb(W * 0.78, 0.04, 0.05, gray, -0.02, 0, -0.02, gantry, 0.01);
    const head = headBambu('#e8eaee', '#2a2c31', gantry, 0.95); head.position.set(0, -0.012, 0.022);
    rig.parts.head = head; rig.parts.headTravel = 0.07; rig.parts.headCenter = 0.03;
    const sp = spool(0.07, 0.06, '#5DDADB', R); sp.position.set(-W * 0.42, H + 0.13, -0.03); sp.rotation.y = Math.PI / 2;
    rb(0.03, 0.05, 0.03, gray, -W * 0.42, H + 0.065, -0.03, R, 0.006);
    rig.spools.push(sp);
  } else {
    for (const sx of [-1, 1]) rb(0.04, H, 0.055, gray, sx * (W * 0.42), H / 2 + 0.04, -0.03, R, 0.01);
    rb(W * 0.88, 0.04, 0.055, gray, 0, H + 0.06, -0.03, R, 0.01);
    rb(W * 0.8, 0.035, 0.045, gray, 0, 0, -0.02, gantry, 0.008);
    const head = headBambu('#e8eaee', '#2a2c31', gantry, 1.05); head.position.set(0, -0.014, 0.024);
    rig.parts.head = head; rig.parts.headTravel = 0.1; rig.parts.headCenter = 0;
    const sp = spool(0.08, 0.065, '#5DDADB', R); sp.position.set(W * 0.42, H + 0.15, -0.03); sp.rotation.y = Math.PI / 2;
    rb(0.03, 0.06, 0.03, gray, W * 0.42, H + 0.08, -0.03, R, 0.006);
    rig.spools.push(sp);
  }
  rig.parts.gantry = gantry;
  rig.parts.zBase = 0.074 + 0.004 + 0.007 - rig.parts.head.userData.tip + 0.001 - rig.parts.head.position.y;
  rig.fans.push(rig.parts.head.userData.fan);
  rig.parts.W = W; rig.parts.D = D; rig.parts.H = H;
  rig.footprint = Math.max(W, D); rig.height = H + 0.24;
  rig.pieceScale = plateSize * 0.5;
  rig.anim = 'bed';
}
function amsLite(rig, colors) {
  if (rig.parts.amsLite) return;
  const { W, H } = rig.parts;
  const g = new THREE.Group(); g.position.set(W * 0.62, 0, 0); rig.root.add(g);
  const gray = MAT.plastic('#e3e5ea', 0.5);
  rb(0.05, 0.03, 0.2, gray, 0, 0.015, 0, g, 0.008);
  rb(0.03, H * 0.75, 0.03, gray, 0, H * 0.375 + 0.03, 0, g, 0.008);
  colors.forEach((c, i) => {
    const s = spool(0.06, 0.05, c, g);
    const ang = (i / 4) * Math.PI * 2;
    s.position.set(Math.cos(ang) * 0.06, H * 0.55 + Math.sin(ang) * 0.06, 0.04);
  });
  rig.parts.amsLite = g;
  rig.footprint = W + 0.16;
}

// ---------- Cama que va y viene genérica (Hellbot, Kobra, Neptune, Prusa, Artillery) ----------
function bedGeneric(rig, a) {
  const R = rig.root;
  const k = a.big || 1;
  const frame = a.frame === '#fa6831' ? MAT.plastic('#fa6831', 0.45) : MAT.anodized(a.frame === '#e6e7ea' ? '#cfd2d8' : a.frame);
  const W = 0.4 * k, D = 0.42 * k, H = 0.42 * k;
  rb(W * 0.9, 0.06, D * 0.92, MAT.plastic(a.frame === '#e6e7ea' ? '#d6d8dd' : '#18191c', 0.5), 0, 0.03, 0, R, 0.01);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cy(0.012, 0.014, 0.01, MAT.rubber(), x * W * 0.4, 0.005, z * D * 0.42, R);
  screen(rig, 0.08, 0.05, a.accent === '#16171a' ? '#fa6831' : a.accent, W * 0.32, 0.05, D * 0.46 + 0.004, R, 0.4);
  statusBar(rig, 0.05, -W * 0.25, 0.04, D * 0.46 + 0.002, R);
  const bed = new THREE.Group(); bed.position.y = 0.07; R.add(bed);
  const ps = 0.235 * k;
  const plate = bedPlate(ps, a.bed === '#b8943d' ? '#b5893a' : '#1d1e22', bed, 0.006);
  rig.pieceSlot.position.y = 0.0075; plate.add(rig.pieceSlot);
  rig.parts.bed = bed; rig.parts.bedTravel = ps * 0.25;
  for (const sx of [-1, 1]) extrusion(H, 'y', frame, sx * (W / 2 - 0.02), 0.06 + H / 2, -0.03, R, 0.025, 0.04);
  if (a.top) extrusion(W, 'x', frame, 0, 0.07 + H, -0.03, R, 0.025, 0.025);
  const gantry = new THREE.Group(); R.add(gantry);
  extrusion(W - 0.05, 'x', MAT.anodized('#202226'), 0, 0.03, -0.03, gantry, 0.02, 0.02);
  bx(W - 0.08, 0.006, 0.0015, MAT.belt(), 0, 0.03, -0.019, gantry, false);
  const head = headGeneric(a.frame === '#fa6831' ? '#16171a' : '#1b1c20', a.accent === '#16171a' ? '#fa6831' : a.accent, gantry, Math.min(k, 1.2));
  head.position.z = 0.012;
  rig.parts.gantry = gantry; rig.parts.head = head; rig.parts.headTravel = W * 0.28; rig.parts.headCenter = 0;
  rig.parts.zBase = 0.07 + 0.006 + 0.0075 - head.userData.tip + 0.001;
  rig.fans.push(head.userData.fan);
  const sp = spool(0.08, 0.065, '#5DDADB', R); sp.position.set(0, H + (a.top ? 0.17 : 0.13), -0.03); sp.rotation.y = Math.PI / 2;
  rb(0.025, 0.07, 0.025, frame, 0, H + 0.1, -0.03, R, 0.004);
  rig.spools.push(sp);
  rig.parts.W = W; rig.parts.D = D; rig.parts.H = H;
  rig.footprint = Math.max(W, D); rig.height = H + 0.3;
  rig.pieceScale = ps * 0.46;
  rig.anim = 'bed';
}

// ---------- CoreXY cerrada (P1S, X1C, K1C, K2 Pro, H2S, H2D, Core One, Voron) ----------
function cube(rig, a, model) {
  const R = rig.root;
  const k = a.big || 1;
  const light = ['#e3e5ea', '#e8eaee'].includes(a.frame);
  const shell = a.frame === '#fa6831' ? MAT.plastic('#fa6831', 0.42) : MAT.plastic(light ? '#e1e3e8' : a.frame, light ? 0.5 : 0.42);
  const trim = MAT.plastic(light ? '#2a2c31' : '#0f1012', 0.4);
  const W = 0.39 * k, D = 0.4 * k, H = 0.46 * k;
  const base = 0.07 * k;
  rb(W, base, D, shell, 0, base / 2, 0, R, 0.012);
  rb(W, 0.03, D, shell, 0, H - 0.015, 0, R, 0.01);
  for (const sx of [-1, 1]) rb(0.022, H - base - 0.02, D, shell, sx * (W / 2 - 0.011), base + (H - base - 0.02) / 2, 0, R, 0.008);
  rb(W - 0.04, H - base - 0.02, 0.012, MAT.matte(light ? '#c9ccd3' : '#121316'), 0, base + (H - base - 0.02) / 2, -D / 2 + 0.006, R, 0.004);
  const doorG = new THREE.Group(); doorG.position.set(0, base + (H - base - 0.03) / 2, D / 2 - 0.004); R.add(doorG);
  bx(W - 0.05, H - base - 0.045, 0.004, MAT.glass('#c9d6ea', 0.12), 0, 0, 0, doorG, false);
  rb(W - 0.04, 0.014, 0.008, trim, 0, (H - base - 0.04) / 2, 0.002, doorG, 0.003);
  rb(W - 0.04, 0.014, 0.008, trim, 0, -(H - base - 0.04) / 2, 0.002, doorG, 0.003);
  rb(0.012, 0.11 * k, 0.014, MAT.plastic(light ? '#2a2c31' : '#2b2e34', 0.35), W / 2 - 0.045, 0, 0.012, doorG, 0.004);
  bx(W - 0.05, 0.004, D - 0.05, MAT.glass('#c9d6ea', 0.1), 0, H + 0.001, 0, R, false);
  if (model === 'k1c' || model === 'k2') screen(rig, 0.07 * k, 0.045 * k, '#2f7cff', -W * 0.3, base * 0.55, D / 2 + 0.004, R);
  else screen(rig, 0.06 * k, 0.035 * k, a.accent === '#16171a' ? '#fa6831' : a.accent, -W * 0.3, base * 0.55, D / 2 + 0.004, R);
  statusBar(rig, 0.06, W * 0.22, base * 0.55, D / 2 + 0.002, R);
  const lamp = bx(W * 0.6, 0.004, 0.012, MAT.glow('#fff1d6', 1.4), 0, H - 0.035, D / 2 - 0.05, R, false);
  rig.emissives.push(lamp.material);
  if (model === 'voron') for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) rb(0.035, 0.035, 0.035, MAT.plastic(a.accent, 0.4), x * (W / 2 - 0.016), H - 0.016, z * (D / 2 - 0.016), R, 0.006);
  const bed = new THREE.Group(); R.add(bed);
  const ps = W * 0.62;
  const plate = bedPlate(ps, '#b5893a', bed, 0);
  for (const sx of [-1, 1]) cy(0.005, 0.005, H - base - 0.06, MAT.chrome(), sx * ps * 0.42, base + (H - base) / 2, -D / 2 + 0.04, R, 10);
  rig.pieceSlot.position.y = 0.0045; plate.add(rig.pieceSlot);
  rig.parts.bed = bed;
  const gy = H - 0.065;
  for (const sx of [-1, 1]) { const r = cy(0.005, 0.005, D - 0.06, MAT.steel(), sx * (W / 2 - 0.035), gy, 0, R, 10); r.rotation.x = Math.PI / 2; }
  const beam = new THREE.Group(); beam.position.y = gy; R.add(beam);
  const rod = cy(0.0055, 0.0055, W - 0.07, model === 'p1s' ? MAT.carbon() : MAT.steel(), 0, 0, 0, beam, 12); rod.rotation.z = Math.PI / 2;
  const head = (model === 'k1c' || model === 'k2') ? headSprite(beam, 0.95 * Math.min(k, 1.2)) : headBambu(light ? '#e8eaee' : '#cfd3da', '#2a2c31', beam, 0.95 * Math.min(k, 1.2));
  head.position.y = -0.055;
  rig.parts.beam = beam; rig.parts.head = head;
  rig.parts.headTravel = W * 0.27; rig.parts.beamTravel = D * 0.2;
  const nozzleY = gy - 0.055 + head.userData.tip;
  rig.parts.bedTop = nozzleY - 0.0045 - 0.001;
  rig.parts.bedDrop = H - base - 0.18;
  rig.fans.push(head.userData.fan);
  if (model === 'p1s' || model === 'h2') rig.fans.push(fan(0.08 * k, trim, R, -W / 2 + 0.03, base + 0.18 * k, 0, 'x').userData.blades);
  rig.parts.W = W; rig.parts.D = D; rig.parts.H = H;
  rig.footprint = Math.max(W, D); rig.height = H + 0.02;
  rig.pieceScale = ps * 0.42;
  rig.anim = 'cube';
}
// AMS (Bambu) o CFS (Creality) arriba de la impresora
function amsTop(rig, kind, colors = AMS_COLORS) {
  if (rig.parts.ams) return;
  const { W, D, H } = rig.parts;
  const g = new THREE.Group(); g.position.set(0, H + 0.003, -D * 0.06);
  const body = kind === 'cfs' ? MAT.plastic('#2b2d33', 0.45) : MAT.plastic('#d9dce2', 0.48);
  const AW = W * 0.95, AD = D * 0.72, AH = 0.18;
  rb(AW, AH * 0.62, AD, body, 0, AH * 0.31, 0, g, 0.012);
  const lid = new THREE.Group(); lid.position.set(0, AH * 0.62, 0); g.add(lid);
  bx(AW * 0.96, 0.004, AD * 0.94, MAT.smoked('#1c1f27', 0.55), 0, AH * 0.28, 0, lid, false);
  for (const sx of [-1, 1]) bx(0.004, AH * 0.56, AD * 0.94, MAT.smoked('#1c1f27', 0.55), sx * AW * 0.48, 0, 0, lid, false);
  bx(AW * 0.96, AH * 0.56, 0.004, MAT.smoked('#1c1f27', 0.55), 0, 0, AD * 0.47, lid, false);
  colors.forEach((c, i) => {
    const s = spool(Math.min(0.07, AW * 0.11), AD * 0.55, c, g);
    s.position.set(-AW * 0.36 + i * AW * 0.24, AH * 0.55, 0);
  });
  for (let i = 0; i < 4; i++) bx(0.012, 0.004, 0.002, MAT.glow(i === 0 ? '#34D399' : '#ffffff', 1.2), -AW * 0.36 + i * AW * 0.24, AH * 0.1, AD / 2 + 0.001, g, false);
  const tubeM = mat('ptfe', () => new THREE.MeshPhysicalMaterial({ color: '#f4f4f4', roughness: 0.3, transparent: true, opacity: 0.85 }));
  for (let i = 0; i < 4; i++) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-AW * 0.36 + i * AW * 0.24, 0.02, -AD / 2), new THREE.Vector3(-AW * 0.2 + i * 0.01, -0.02, -AD / 2 - 0.04), new THREE.Vector3(0, -0.02, -D * 0.44)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0025, 6), tubeM));
  }
  rig.root.add(g);
  rig.parts.ams = g;
  rig.height = H + AH + 0.02;
}

// ---------- Snapmaker U1 (cambiador de 4 cabezales) ----------
function snapU1(rig, a) {
  const R = rig.root;
  const W = 0.47, D = 0.44, H = 0.5;
  const frame = MAT.anodized('#2b2e35');
  rb(W, 0.08, D, MAT.plastic('#25272c', 0.45), 0, 0.04, 0, R, 0.012);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) extrusion(H - 0.08, 'y', frame, x * (W / 2 - 0.015), 0.08 + (H - 0.08) / 2, z * (D / 2 - 0.015), R, 0.03, 0.03);
  for (const z of [1, -1]) extrusion(W, 'x', frame, 0, H, z * (D / 2 - 0.015), R, 0.03, 0.03);
  for (const x of [1, -1]) extrusion(D, 'z', frame, x * (W / 2 - 0.015), H, 0, R, 0.03, 0.03);
  rb(W - 0.04, H - 0.1, 0.008, MAT.matte('#1a1b1f'), 0, 0.08 + (H - 0.1) / 2, -D / 2 + 0.01, R, 0.003);
  for (const sx of [-1, 1]) bx(0.004, H - 0.1, D - 0.04, MAT.smoked('#2b2f38', 0.35), sx * (W / 2 - 0.01), 0.08 + (H - 0.1) / 2, 0, R, false);
  screen(rig, 0.08, 0.05, a.accent, W * 0.3, 0.045, D / 2 + 0.004, R);
  statusBar(rig, 0.06, -W * 0.25, 0.045, D / 2 + 0.002, R);
  const dock = new THREE.Group(); dock.position.set(0, H - 0.1, -D / 2 + 0.06); R.add(dock);
  rb(W - 0.08, 0.02, 0.03, frame, 0, 0.04, 0, dock, 0.004);
  ['#e8443a', '#f2f2f2', '#3a7bd5', '#f5c518'].forEach((c, i) => { const h = headGeneric('#2b2e35', c, dock, 0.85); h.position.set(-W * 0.3 + i * W * 0.2, -0.02, 0.03); });
  const bed = new THREE.Group(); R.add(bed);
  const ps = 0.27;
  const plate = bedPlate(ps, '#b5893a', bed, 0);
  rig.pieceSlot.position.y = 0.0045; plate.add(rig.pieceSlot);
  rig.parts.bed = bed;
  const gy = H - 0.05;
  const beam = new THREE.Group(); beam.position.y = gy; R.add(beam);
  const rod = cy(0.006, 0.006, W - 0.06, MAT.steel(), 0, 0, 0, beam, 12); rod.rotation.z = Math.PI / 2;
  const head = headGeneric('#2b2e35', a.accent, beam, 1); head.position.y = -0.06;
  rig.parts.beam = beam; rig.parts.head = head; rig.parts.headTravel = W * 0.27; rig.parts.beamTravel = D * 0.18;
  rig.parts.bedTop = gy - 0.06 + head.userData.tip - 0.0055;
  rig.parts.bedDrop = H - 0.28;
  rig.fans.push(head.userData.fan);
  rig.parts.W = W; rig.parts.D = D; rig.parts.H = H;
  rig.footprint = Math.max(W, D); rig.height = H + 0.04;
  rig.pieceScale = ps * 0.42;
  rig.anim = 'cube';
}

// ---------- Prusa XL ----------
function prusaXL(rig, a) {
  const k = a.big || 1.5;
  const R = rig.root;
  const orange = MAT.plastic('#fa6831', 0.42), black = MAT.anodized('#16171a');
  const W = 0.5 * k, D = 0.5 * k, H = 0.55 * k;
  rb(W, 0.07, D, MAT.plastic('#18191c', 0.45), 0, 0.035, 0, R, 0.012);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) extrusion(H, 'y', black, x * (W / 2 - 0.02), H / 2, z * (D / 2 - 0.02), R, 0.035, 0.035);
  for (const z of [1, -1]) rb(W, 0.04, 0.04, orange, 0, H, z * (D / 2 - 0.02), R, 0.006);
  for (const x of [1, -1]) rb(0.04, 0.04, D, orange, x * (W / 2 - 0.02), H, 0, R, 0.006);
  screen(rig, 0.1, 0.06, '#fa6831', W * 0.25, 0.045, D / 2 + 0.004, R, 0.3);
  statusBar(rig, 0.06, -W * 0.25, 0.045, D / 2 + 0.002, R);
  ['#5DDADB', '#F78EB6', '#ffd166', '#7c83ff', '#e9ebef'].forEach((c, i) => { const h = headGeneric('#16171a', c, R, 0.9); h.position.set(-W / 2 + 0.07, H - 0.13, -D / 2 + 0.1 + i * (D - 0.2) / 4); });
  const bed = new THREE.Group(); R.add(bed);
  const ps = W * 0.7;
  const plate = bedPlate(ps, '#b5893a', bed, 0);
  rig.pieceSlot.position.y = 0.0045; plate.add(rig.pieceSlot);
  rig.parts.bed = bed;
  const gy = H - 0.05;
  const beam = new THREE.Group(); beam.position.y = gy; R.add(beam);
  rb(W - 0.06, 0.03, 0.035, black, 0, 0, 0, beam, 0.004);
  const head = headGeneric('#16171a', '#fa6831', beam, 1); head.position.y = -0.065;
  rig.parts.beam = beam; rig.parts.head = head; rig.parts.headTravel = W * 0.26; rig.parts.beamTravel = D * 0.2;
  rig.parts.bedTop = gy - 0.065 + head.userData.tip - 0.0055; rig.parts.bedDrop = H - 0.28;
  rig.fans.push(head.userData.fan);
  rig.parts.W = W; rig.parts.D = D; rig.parts.H = H;
  rig.footprint = W; rig.height = H + 0.05; rig.floor = true;
  rig.pieceScale = ps * 0.4;
  rig.anim = 'cube';
}

// ---------- Elegoo OrangeStorm Giga ----------
function giga(rig, a) {
  const W = 1.0, D = 1.0, legH = 0.55;
  const R = rig.root;
  const frame = MAT.anodized('#1b1c20'), accent = MAT.plastic(a.accent, 0.4);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) extrusion(legH, 'y', frame, x * (W / 2 - 0.03), legH / 2, z * (D / 2 - 0.03), R, 0.05, 0.05);
  rb(W, 0.06, D, frame, 0, legH, 0, R, 0.008);
  const plate = bedPlate(W * 0.9, '#1d1e22', R, legH + 0.035);
  for (const sx of [-1, 1]) rb(0.04, 0.05, D, accent, sx * (W / 2 - 0.02), legH + 0.055, 0, R, 0.006);
  rig.pieceSlot.position.y = 0.0045; plate.add(rig.pieceSlot);
  screen(rig, 0.14, 0.08, a.accent, W * 0.3, legH - 0.08, D / 2 + 0.004, R);
  statusBar(rig, 0.1, -W * 0.3, legH - 0.08, D / 2 + 0.002, R);
  const bridge = new THREE.Group(); R.add(bridge);
  for (const sx of [-1, 1]) extrusion(0.75, 'y', frame, sx * (W / 2 + 0.02), legH + 0.4, 0, bridge, 0.05, 0.06);
  const beam = new THREE.Group(); bridge.add(beam);
  extrusion(W + 0.08, 'x', frame, 0, 0, 0, beam, 0.06, 0.06);
  const head = headGeneric('#1b1c20', a.accent, beam, 1.6); head.position.y = -0.1;
  rig.parts.bridge = bridge; rig.parts.beam = beam; rig.parts.head = head;
  rig.parts.headTravel = W * 0.3; rig.parts.bridgeTravel = D * 0.25;
  rig.parts.zBase = legH + 0.035 + 0.0045 - head.userData.tip + 0.1 + 0.001;
  rig.fans.push(head.userData.fan);
  const rack = new THREE.Group(); rack.position.set(W / 2 + 0.12, legH, -0.2); R.add(rack);
  rb(0.04, 0.5, 0.5, frame, 0, 0.25, 0, rack, 0.006);
  ['#5DDADB', '#ff7a1a', '#e9ebef'].forEach((c, i) => { const s = spool(0.09, 0.07, c, rack); s.position.set(0.06, 0.12 + i * 0.16, 0); s.rotation.y = Math.PI / 2; rig.spools.push(s); });
  rig.footprint = 1.25; rig.height = legH + 0.8; rig.floor = true;
  rig.pieceScale = W * 0.36;
  rig.anim = 'giga';
}

// ---------- Rack de granja ----------
function farmRack(rig, a) {
  const n = a.n || 8;
  const cols = 2, rows = Math.ceil(n / cols);
  const W = a.unit ? 1.02 : 0.9, D = a.unit ? 0.5 : 0.45, rowH = a.combo ? (a.pro ? 0.61 : 0.5) : a.pro ? 0.5 : a.unit === 'a1' ? 0.43 : 0.38;
  const H = rows * rowH + 0.1;
  const R = rig.root;
  const frame = MAT.anodized(a.frame || '#3a3f4a');
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) extrusion(H, 'y', frame, x * (W / 2 - 0.015), H / 2, z * (D / 2 - 0.015), R, 0.03, 0.03);
  rig.units = [];
  for (let r = 0; r < rows; r++) {
    const y = 0.06 + r * rowH;
    rb(W, 0.02, D, MAT.anodized('#4a505c'), 0, y, 0, R, 0.003);
    for (let c = 0; c < cols && rig.units.length < n; c++) {
      const u = new THREE.Group(); u.position.set((c - 0.5) * W * 0.5, y + 0.01, 0); R.add(u);
      const sw = a.pro || a.unit === 'a1' ? 0.3 : 0.24;
      if (a.pro) {
        const bodyH = a.combo ? rowH - 0.17 : rowH - 0.06;
        const bodyColor = a.unit === 'k1c' ? '#222428' : '#1b1c1f';
        const shell = MAT.plastic(bodyColor, 0.42);
        rb(sw, bodyH, 0.02, shell, 0, bodyH / 2, -sw * 0.44, u, 0.005);
        for (const side of [-1, 1]) rb(0.018, bodyH, sw * 0.9, shell, side * (sw / 2 - 0.009), bodyH / 2, 0, u, 0.004);
        rb(sw, 0.02, sw * 0.95, shell, 0, bodyH - 0.01, 0, u, 0.005);
        bx(sw * 0.9, bodyH - 0.04, 0.004, MAT.glass('#c9d6ea', 0.12), 0, bodyH / 2, sw * 0.48, u, false);
        if (a.unit === 'k1c') for (let v = 0; v < 3; v++) bx(0.04, 0.005, 0.004, MAT.plastic('#858b94'), -0.09, 0.08 + v * 0.014, sw * 0.49, u, false);
      } else {
        rb(sw, 0.03, sw * 0.9, MAT.plastic('#e3e5ea', 0.5), 0, 0.015, 0, u, 0.008);
        rb(0.025, rowH - 0.1, 0.03, MAT.plastic('#e3e5ea', 0.5), -sw / 2 + 0.02, (rowH - 0.1) / 2 + 0.03, -0.04, u, 0.006);
        if (a.unit === 'a1') rb(0.025, rowH - 0.1, 0.03, MAT.plastic('#e3e5ea', 0.5), sw / 2 - 0.02, (rowH - 0.1) / 2 + 0.03, -0.04, u, 0.006);
      }
      // Lightweight modules: no nested full-printer rigs or extra render loops.
      if (a.combo) {
        const ams = new THREE.Group(); u.add(ams);
        ams.position.set(0, rowH - 0.13, 0);
        ams.userData.ams = true;
        rb(sw * 0.94, 0.025, 0.15, MAT.plastic(a.pro ? '#25292e' : '#dddddf'), 0, 0, 0, ams, 0.005);
        if (a.pro) bx(sw * 0.94, 0.07, 0.15, MAT.smoked('#8fa3b0', 0.2), 0, 0.04, 0, ams, false);
        for (let k = 0; k < 4; k++) {
          const reel = cy(0.025, 0.025, 0.035, MAT.plastic(AMS_COLORS[k]), (k - 1.5) * 0.065, 0.04, 0, ams, 10);
          reel.rotation.x = Math.PI / 2;
        }
      }
      const bed = new THREE.Group(); bed.position.y = a.pro ? 0.06 : 0.035; u.add(bed);
      rb(sw * 0.55, 0.003, sw * 0.55, MAT.pei('#b5893a'), 0, 0, 0, bed, 0.001);
      const slot = new THREE.Group(); slot.position.y = 0.002; bed.add(slot);
      const arm = new THREE.Group(); arm.position.y = rowH * 0.45; u.add(arm);
      rb(sw * 0.8, 0.018, 0.025, MAT.plastic('#d9dce3', 0.45), 0.01, 0, -0.01, arm, 0.004);
      const head = a.unit === 'k1c' ? headGeneric('#222428', '#9aa3b2', arm, 0.55) : headBambu('#e8eaee', '#2a2c31', arm, 0.55); head.position.y = -0.02;
      const led = bx(0.04, 0.006, 0.004, rig.statusMat, sw * 0.3, 0.02, sw * 0.47, u, false);
      rig.units.push({ group: u, bed, slot, arm, head, phase: rig.units.length * 1.7, led });
    }
  }
  rig.parts.status = rig.units[0].led;
  rig.pieceSlot = rig.units[0].slot;
  rig.pieceScale = 0.06;
  rig.footprint = W; rig.height = H; rig.floor = true;
  rig.anim = 'rack';
}

// ---------- Resina MSLA + estación de lavado y curado ----------
function resin(rig, a) {
  const k = a.big || 1;
  const R = rig.root;
  const W = 0.23 * k, D = 0.23 * k, baseH = 0.13 * k;
  const body = MAT.plastic(a.pro ? '#e7e8ea' : '#18191c', 0.45);
  rb(W, baseH, D, body, 0, baseH / 2, 0, R, 0.012);
  screen(rig, W * 0.42, baseH * 0.32, a.lid, 0, baseH * 0.5, D / 2 + 0.004, R, 0.2);
  statusBar(rig, 0.05, 0, baseH * 0.15, D / 2 + 0.002, R);
  const vatY = baseH + 0.014;
  rb(W * 0.72, 0.028, D * 0.56, MAT.alu(), 0, vatY, 0.01, R, 0.004);
  const liquid = bx(W * 0.66, 0.003, D * 0.5, MAT.liquid('#7fa89a'), 0, vatY + 0.0125, 0.01, R, false);
  rig.parts.liquid = liquid;
  const uv = bx(W * 0.6, 0.002, D * 0.45, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#6b5bff', emissiveIntensity: 0, roughness: 1 }), 0, baseH + 0.001, 0.01, R, false);
  rig.parts.uv = uv;
  rb(0.03 * k, 0.3 * k, 0.03 * k, MAT.alu(), 0, baseH + 0.15 * k, -D / 2 + 0.03, R, 0.004);
  const carriage = new THREE.Group(); R.add(carriage);
  rb(0.035, 0.03, D * 0.5, MAT.alu(), 0, 0, -D * 0.2, carriage, 0.004);
  rb(W * 0.55, 0.012, D * 0.42, MAT.alu('#c7ccd4'), 0, -0.012, 0.01, carriage, 0.003);
  rig.pieceSlot.position.set(0, -0.019, 0.01); rig.pieceSlot.rotation.x = Math.PI; carriage.add(rig.pieceSlot);
  rig.parts.carriage = carriage; rig.parts.vatTop = vatY + 0.014;
  const lidH = 0.32 * k;
  const lid = rb(W * 0.98, lidH, D * 0.98, MAT.tinted(a.lid, a.pro ? 0.6 : 0.45), 0, baseH + lidH / 2, 0, R, 0.01, false);
  lid.castShadow = false;
  const st = new THREE.Group(); st.position.set(W / 2 + 0.11 * k, 0, 0); R.add(st);
  rb(0.15, 0.06, 0.15, MAT.plastic('#18191c', 0.45), 0, 0.03, 0, st, 0.012);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.14, 32), MAT.tinted('#ffb000', 0.45)); dome.position.y = 0.13; st.add(dome);
  const uvRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.004, 8, 32), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#7a5cff', emissiveIntensity: 0 }));
  uvRing.rotation.x = Math.PI / 2; uvRing.position.y = 0.08; st.add(uvRing);
  const turn = new THREE.Group(); turn.position.y = 0.065; st.add(turn);
  cy(0.045, 0.045, 0.006, MAT.alu(), 0, 0, 0, turn, 32);
  rig.parts.cure = { uvRing, turn };
  rig.footprint = W + 0.24 * k; rig.height = baseH + lidH;
  rig.pieceScale = W * 0.3;
  rig.pieceMode = 'down';
  rig.anim = 'resin';
}

// ---------- Láser (abierto / cerrado) ----------
function laser(rig, a, enclosed) {
  const k = a.big || 1;
  const R = rig.root;
  const W = (enclosed ? 0.66 : 0.6) * k, D = (enclosed ? 0.5 : 0.56) * k;
  let bedY = 0.03;
  if (enclosed) {
    const H = 0.2 * k;
    const body = MAT.plastic(a.frame === '#e9eaee' ? '#e1e3e8' : a.frame, 0.45);
    rb(W, 0.06, D, body, 0, 0.03, 0, R, 0.01);
    rb(W, H - 0.06, 0.02, body, 0, H / 2 + 0.03, -D / 2 + 0.01, R, 0.006);
    for (const sx of [-1, 1]) rb(0.02, H - 0.06, D, body, sx * (W / 2 - 0.01), H / 2 + 0.03, 0, R, 0.006);
    rb(W, H * 0.35, 0.02, body, 0, 0.06 + H * 0.175, D / 2 - 0.01, R, 0.006);
    bx(W - 0.02, 0.006, D - 0.02, MAT.tinted(a.lid, 0.5), 0, H + 0.035, 0, R, false);
    bx(W - 0.03, H * 0.6, 0.005, MAT.tinted(a.lid, 0.45), 0, H * 0.65 + 0.03, D / 2 - 0.01, R, false);
    const strip = bx(W * 0.3, 0.008, 0.004, MAT.glow('#5DDADB', 1.4), -W * 0.25, 0.045, D / 2 + 0.001, R, false); rig.emissives.push(strip.material);
    statusBar(rig, 0.05, W * 0.3, 0.045, D / 2 + 0.001, R);
    rig.fans.push(fan(0.09, MAT.plastic('#1b1c20', 0.5), R, 0, H * 0.6, -D / 2 - 0.004).userData.blades);
    bedY = 0.07;
    rig.height = H + 0.05;
  } else {
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) cy(0.015, 0.018, 0.04, MAT.rubber(), x * (W / 2 - 0.02), 0.02, z * (D / 2 - 0.02), R);
    for (const sx of [-1, 1]) extrusion(D, 'z', MAT.anodized('#1b1c20'), sx * (W / 2 - 0.015), 0.055, 0, R, 0.03, 0.03);
    extrusion(W, 'x', MAT.anodized('#1b1c20'), 0, 0.055, -D / 2 + 0.015, R, 0.03, 0.03);
    statusBar(rig, 0.04, W / 2 - 0.015, 0.075, D / 2 - 0.05, R);
    rig.height = 0.16;
  }
  const honey = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, D * 0.82), new THREE.MeshStandardMaterial({ color: '#3a3d45', roughness: 0.6, metalness: 0.7 }));
  honey.rotation.x = -Math.PI / 2; honey.position.y = bedY; honey.receiveShadow = true; R.add(honey);
  const sheet = bx(W * 0.6, 0.004, D * 0.55, MAT.wood('#b98a5a'), 0, bedY + 0.002, 0.02, R);
  rig.parts.sheet = sheet;
  rig.pieceSlot.position.set(0, bedY + 0.004, 0.02); R.add(rig.pieceSlot);
  rig.pieceScale = W * 0.38;
  rig.pieceMode = 'z';
  const gy = bedY + (enclosed ? 0.085 : 0.08);
  const beam = new THREE.Group(); beam.position.y = gy; R.add(beam);
  extrusion(W - 0.04, 'x', MAT.anodized('#1d1f24'), 0, 0, 0, beam, 0.025, 0.03);
  const head = new THREE.Group(); beam.add(head);
  rb(0.05, 0.085, 0.05, MAT.plastic('#16171a', 0.45), 0, -0.02, 0.03, head, 0.006);
  rb(0.03, 0.025, 0.004, MAT.plastic(a.accent || a.lid || '#3a86ff', 0.4), 0, 0.005, 0.056, head, 0.003);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#8f7cff', emissiveIntensity: 0 }));
  dot.position.set(0, bedY + 0.008 - gy, 0.03); head.add(dot);
  rig.parts.dot = dot; rig.parts.beam = beam; rig.parts.head = head;
  rig.parts.headTravel = W * 0.28; rig.parts.beamTravel = D * 0.25;
  rig.emitters.push({ kind: 'smoke', obj: dot, rate: 14 });
  rig.footprint = Math.max(W, D);
  rig.anim = 'laser';
}

// ---------- CNC (abierta / cerrada) ----------
function cnc(rig, a, enclosed) {
  const k = a.big || 1;
  const R = rig.root;
  const W = 0.5 * k, D = 0.46 * k;
  const bedY = 0.05;
  rb(W, 0.04, D, MAT.anodized('#3b3f4a'), 0, 0.02, 0, R, 0.004);
  rb(W * 0.85, 0.012, D * 0.8, MAT.wood('#7d6040'), 0, 0.046, 0, R, 0.002);
  for (const sx of [-1, 1]) extrusion(D, 'z', MAT.alu(), sx * (W / 2 - 0.02), 0.065, 0, R, 0.035, 0.05);
  const stock = rb(W * 0.5, 0.03, D * 0.4, MAT.wood('#a0703f'), 0, bedY + 0.017, 0.02, R, 0.002);
  for (const sx of [-1, 1]) rb(0.02, 0.02, 0.05, MAT.anodized('#c0392b'), sx * W * 0.27, bedY + 0.02, 0.02, R, 0.003);
  rig.parts.stock = stock;
  rig.pieceSlot.position.set(0, bedY + 0.033, 0.02); R.add(rig.pieceSlot);
  rig.pieceScale = W * 0.34;
  rig.pieceMode = 'z';
  const frame = MAT.anodized(a.frame);
  const bridge = new THREE.Group(); R.add(bridge);
  const bh = 0.26 * k;
  for (const sx of [-1, 1]) rb(0.04, bh, 0.07, frame, sx * (W / 2 - 0.02), 0.06 + bh / 2, 0, bridge, 0.006);
  rb(W, 0.05, 0.07, frame, 0, 0.06 + bh, 0, bridge, 0.006);
  const carriage = new THREE.Group(); carriage.position.set(0, 0.06 + bh, 0.055); bridge.add(carriage);
  rb(0.08, 0.13, 0.035, MAT.anodized('#2a2d34'), 0, -0.02, 0, carriage, 0.004);
  const spindle = new THREE.Group(); carriage.add(spindle);
  cy(0.028, 0.028, 0.12, MAT.alu(), 0, -0.07, 0.035, spindle, 24);
  cy(0.012, 0.016, 0.02, MAT.steel(), 0, -0.14, 0.035, spindle, 16);
  const bit = new THREE.Group(); bit.position.set(0, -0.16, 0.035); spindle.add(bit);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03, 8), MAT.steel()); cone.rotation.x = Math.PI; bit.add(cone);
  rig.parts.bridge = bridge; rig.parts.carriage = carriage; rig.parts.spindle = spindle; rig.parts.bit = bit;
  rig.parts.headTravel = W * 0.25; rig.parts.bridgeTravel = D * 0.22;
  statusBar(rig, 0.05, W / 2 - 0.05, 0.03, D / 2 + 0.001, R);
  rig.emitters.push({ kind: 'chips', obj: bit, rate: 30 });
  rig.height = 0.4 * k;
  if (enclosed) {
    const H = 0.52 * k;
    const body = MAT.plastic(a.frame, 0.45);
    rb(W + 0.06, H, 0.02, body, 0, H / 2, -D / 2 - 0.03, R, 0.006);
    for (const sx of [-1, 1]) rb(0.02, H, D + 0.06, body, sx * (W / 2 + 0.03), H / 2, 0, R, 0.006);
    rb(W + 0.06, 0.02, D + 0.06, body, 0, H, 0, R, 0.006);
    bx(W + 0.02, H - 0.04, 0.006, MAT.tinted(a.lid, 0.4), 0, H / 2, D / 2 + 0.03, R, false);
    rig.height = H + 0.02;
  }
  rig.footprint = Math.max(W, D) + (enclosed ? 0.06 : 0);
  rig.anim = 'cnc';
}

// ---------- API ----------
export function buildMachine(model) {
  const def = MACHINES[model];
  const a = def.art;
  const rig = baseRig(model);
  switch (a.type) {
    case 'ender': ender(rig, a); break;
    case 'mini': bambuBed(rig, a, false); break;
    case 'a1': bambuBed(rig, a, true); break;
    case 'bed': bedGeneric(rig, a); break;
    case 'cube': cube(rig, a, a.model || model); if (a.ams) amsTop(rig, a.ams === 'cfs' ? 'cfs' : 'ams'); break;
    case 'u1': snapU1(rig, a); break;
    case 'pxl': prusaXL(rig, a); break;
    case 'giga': giga(rig, a); break;
    case 'rack': farmRack(rig, a); break;
    case 'resin': resin(rig, a); break;
    case 'laser': laser(rig, a, false); break;
    case 'laserbox': laser(rig, a, true); break;
    case 'cnc': cnc(rig, a, false); break;
    case 'cncbox': cnc(rig, a, true); break;
    default: bedGeneric(rig, a);
  }
  rig.root.add(rig.extra);
  batchStatic(rig.root, movingNodes(rig.parts, rig.fans, rig.spools, rig.units, rig.emitters));
  rig.setMulti = (on) => {
    if (!on) return;
    if (a.type === 'cube' && !a.ams) amsTop(rig, 'ams');
    if (a.type === 'mini' || a.type === 'a1') amsLite(rig, AMS_COLORS);
  };
  rig.setPiece = (pid) => setPiece(rig, pid);
  rig.setEvent = (id) => setEvent(rig, id);
  rig.update = (st) => update(rig, st);
  return rig;
}

function disposePiece(pg) {
  pg.group.parent?.remove(pg.group);
  for (const m of pg.mats) m.dispose();
}
function setPiece(rig, pid) {
  if (rig.pid === pid) return;
  rig.pid = pid;
  for (const pg of rig.pieceGroups) disposePiece(pg);
  rig.pieceGroups = [];
  if (!pid) return;
  const P = PRODUCTS[pid];
  const slots = rig.units ? rig.units.map((u) => u.slot) : [rig.pieceSlot];
  for (const slot of slots) {
    const pc = buildPiece(pid);
    const sc = rig.pieceScale * (P.size === 'XL' ? 1.6 : P.size === 'L' ? 1.3 : P.size === 'S' ? 0.8 : 1);
    pc.group.scale.setScalar(sc);
    pc.scale = sc;
    pc.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    applyLayers(pc.mats, P.tech, sc);
    for (const m of pc.mats) { m.clippingPlanes = [pc.plane]; m.clipShadows = true; }
    slot.add(pc.group);
    pc.slot = slot;
    rig.pieceGroups.push(pc);
  }
  const mat0 = MATERIALS[P.mat];
  if (!rig.parts.ams) for (const sp of rig.spools.slice(0, 1)) sp.userData.fil.color.set(P.colors?.[0] || P.color || mat0.color);
  if (rig.parts.sheet) rig.parts.sheet.material = mat0.id === 'ACRILICO' ? MAT.tinted(P.color, 0.6) : MAT.wood(mat0.color);
  if (rig.parts.stock) rig.parts.stock.material = mat0.id === 'ALU' ? MAT.alu() : MAT.wood(mat0.color);
  if (rig.parts.liquid) rig.parts.liquid.material = MAT.liquid(P.color === '#ffd166' ? '#c9a54a' : '#7fa89a');
}

// Efectos de problema: spaghetti, gato, fuego
function setEvent(rig, id) {
  if (rig.eventId === id) return;
  rig.eventId = id;
  while (rig.extra.children.length) disposeObject(rig.extra.children[0]);
  rig.fx = null;
  if (id !== 'gato') rig.catSpot = null;
  if (!id) return;
  const at = new THREE.Vector3();
  rig.pieceSlot.getWorldPosition(at);
  rig.root.worldToLocal(at);
  if (id === 'spaghetti') {
    const pts = [];
    let seed = 7;
    const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 30; i++) pts.push(new THREE.Vector3((r() - 0.5) * 0.12, 0.004 + r() * 0.06, (r() - 0.5) * 0.12));
    const color = rig.pid ? (PRODUCTS[rig.pid].colors?.[0] || PRODUCTS[rig.pid].color) : '#ffffff';
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.0018, 6), MAT.filament(color));
    tube.position.copy(at); tube.castShadow = true;
    rig.extra.add(tube);
  } else if (id === 'gato') {
    // El gato del taller camina hasta acá y se sube: arriba de la carcasa si la impresora es cerrada,
    // o acostado en la cama calentita si es abierta.
    const enclosed = !!rig.def?.enclosed || rig.def?.art?.type === 'cube';
    if (enclosed) {
      rig.root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(rig.root);
      const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
      rig.catSpot = rig.root.worldToLocal(top);
    } else {
      rig.catSpot = at.clone();
    }
  } else if (id === 'llama') {
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12), MAT.glow('#ff7a1a', 4));
    fire.position.copy(at); fire.position.y += 0.035;
    rig.extra.add(fire);
    rig.fx = { fire };
  }
}

const tmpV = new THREE.Vector3();
function update(rig, st) {
  const P = rig.parts;
  const t = st.t;
  const sp = st.anim === 'soft' ? 0.45 : st.anim === 'min' ? 0 : 1;
  const tt = t * sp;
  const p = st.p;
  const sc = STATUS_COLORS[st.status] || STATUS_COLORS.idle;
  rig.statusMat.emissive.set(st.blackout ? '#000000' : sc);
  rig.statusMat.emissiveIntensity = st.status === 'event' ? 1.4 + Math.sin(t * 8) * 1.1 : 2;
  for (const m of rig.emissives) m.emissiveIntensity = st.blackout ? 0 : (m.userData.base ?? (m.userData.base = m.emissiveIntensity));
  const showP = rig.pid ? p : 0;
  for (const pc of rig.pieceGroups) {
    pc.group.visible = !!rig.pid;
    pc.slot.getWorldPosition(tmpV);
    const h = pc.height * pc.scale, w = pc.width * pc.scale;
    let cut;
    if (rig.pieceMode === 'up') { pc.plane.normal.set(0, -1, 0); cut = tmpV.y + h * showP + 0.0004; pc.plane.constant = cut; }
    else if (rig.pieceMode === 'down') { pc.plane.normal.set(0, 1, 0); cut = tmpV.y - h * showP - 0.0004; pc.plane.constant = -cut; }
    else { pc.plane.normal.set(0, 0, -1); cut = tmpV.z - w * 0.6 + w * 1.2 * showP; pc.plane.constant = cut; }
    const hot = st.status === 'print' && rig.pieceMode === 'up' && showP < 0.999 ? cut : 1e9;
    for (const m of pc.mats) if (m.userData.cut) m.userData.cut.value = hot;
  }
  const pieceH = rig.pieceGroups[0] ? rig.pieceGroups[0].height * rig.pieceGroups[0].scale : 0.04;
  const moving = st.running && sp > 0;
  rig.active = st.running;
  if (rig.anim === 'bed') {
    const hx = moving ? Math.sin(tt * 3.1) * 0.7 + Math.sin(tt * 7.3) * 0.3 : (st.status === 'done' ? 1 : 0);
    P.head.position.x = P.headCenter + hx * P.headTravel;
    P.bed.position.z = moving ? Math.sin(tt * 2.3 + 1) * P.bedTravel : 0;
    P.gantry.position.y = P.zBase + pieceH * showP + (st.status === 'done' ? 0.03 : 0);
  } else if (rig.anim === 'cube') {
    const hx = moving ? Math.sin(tt * 3.6) * 0.8 + Math.sin(tt * 9.1) * 0.2 : (st.status === 'done' ? 1 : 0);
    P.head.position.x = hx * P.headTravel;
    P.beam.position.z = (moving ? Math.sin(tt * 2.7 + 0.5) : -0.8) * P.beamTravel;
    P.bed.position.y = P.bedTop - Math.min(P.bedDrop, pieceH * showP) - (st.status === 'done' ? 0.02 : 0);
  } else if (rig.anim === 'giga') {
    P.head.position.x = moving ? Math.sin(tt * 1.6) * P.headTravel : P.headTravel;
    P.bridge.position.z = moving ? Math.sin(tt * 1.1) * P.bridgeTravel : -P.bridgeTravel;
    P.beam.position.y = P.zBase + pieceH * showP;
  } else if (rig.anim === 'rack') {
    for (const u of rig.units) {
      u.head.position.x = moving ? Math.sin(tt * 3.2 + u.phase) * 0.06 : 0.07;
      u.bed.position.z = moving ? Math.sin(tt * 2.4 + u.phase) * 0.03 : 0;
      u.arm.position.y = (rig.def.art.pro ? 0.06 : 0.035) + pieceH * showP + 0.031;
      u.head.userData.glow.material.emissiveIntensity = moving ? 1.5 : 0;
    }
  } else if (rig.anim === 'resin') {
    const layer = moving ? (Math.sin(tt * 2.2) * 0.5 + 0.5) * 0.012 : 0.05;
    P.carriage.position.y = P.vatTop + 0.019 + pieceH * showP + layer;
    P.uv.material.emissiveIntensity = moving && Math.sin(tt * 2.2) < -0.2 && !st.blackout ? 2.4 : 0;
    const curing = st.status === 'done' && !st.blackout;
    P.cure.uvRing.material.emissiveIntensity = curing ? 2.2 : 0;
    if (curing && sp > 0) P.cure.turn.rotation.y += 0.04;
  } else if (rig.anim === 'laser') {
    const hx = moving ? Math.sin(tt * 6.5) : 0.9;
    P.head.position.x = hx * P.headTravel;
    P.beam.position.z = moving ? (-1 + 2 * showP) * P.beamTravel * 0.9 : -P.beamTravel;
    P.dot.material.emissiveIntensity = moving && !st.blackout ? 3.5 + Math.random() * 2 : 0;
  } else if (rig.anim === 'cnc') {
    P.carriage.position.x = moving ? Math.sin(tt * 2.8) * P.headTravel : P.headTravel;
    P.bridge.position.z = moving ? (-1 + 2 * showP) * P.bridgeTravel * 0.9 : -P.bridgeTravel;
    P.spindle.position.y = moving ? -0.03 : 0.02;
    if (moving) P.bit.rotation.y += 0.9;
  }
  if (P.head?.userData?.glow) P.head.userData.glow.material.emissiveIntensity = moving && !st.blackout ? 1.6 : 0;
  if (moving) for (const b of rig.fans) b.rotation.z += 0.7;
  if (rig.fx?.fire) rig.fx.fire.scale.y = 0.8 + Math.random() * 0.6;
  if (rig.fx?.cat) rig.fx.cat.rotation.y = -0.6 + Math.sin(t * 0.8) * 0.15;
}
