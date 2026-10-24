// Máquinas en 3D (medidas aproximadas en metros). Cada builder devuelve un objeto con
// root (Group), pieceSlot (donde va la pieza), update(st) para animar y utilidades.
import * as THREE from 'three';
import { M, std, TEX } from './materials.js';
import { buildPiece } from './pieces.js';
import { MACHINES, MATERIALS, PRODUCTS } from '../game/data.js';

function box(w, h, d, mat, x = 0, y = 0, z = 0, parent = null, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, parent = null, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const STATUS_COLORS = { print: '#5DDADB', done: '#34D399', event: '#FBBF24', nofil: '#EF4444', idle: '#4b5279', pause: '#F78EB6', start: '#5DDADB' };

// Bobina (para soportes y AMS)
function spool(r, w, color, parent) {
  const g = new THREE.Group();
  const flange = std('#22252c', 0.6, 0.1);
  const fil = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const a = cyl(r, r, 0.006, flange, 0, 0, w / 2, g, 28); a.rotation.x = Math.PI / 2;
  const b = cyl(r, r, 0.006, flange, 0, 0, -w / 2, g, 28); b.rotation.x = Math.PI / 2;
  const core = cyl(r * 0.85, r * 0.85, w, fil, 0, 0, 0, g, 28); core.rotation.x = Math.PI / 2;
  const hub = cyl(r * 0.3, r * 0.3, w + 0.01, std('#0f1014', 0.7, 0), 0, 0, 0, g, 16); hub.rotation.x = Math.PI / 2;
  if (parent) parent.add(g);
  g.userData.fil = fil;
  return g;
}

function toolhead(frameMat, accent, parent, scale = 1) {
  const h = new THREE.Group();
  box(0.07 * scale, 0.085 * scale, 0.065 * scale, frameMat, 0, 0.055 * scale, 0, h);
  box(0.058 * scale, 0.06 * scale, 0.006 * scale, std(accent, 0.4, 0.2), 0, 0.058 * scale, 0.034 * scale, h);
  const fan = cyl(0.021 * scale, 0.021 * scale, 0.006 * scale, std('#0d0e11', 0.6, 0.2), 0, 0.055 * scale, 0.039 * scale, h, 18);
  fan.rotation.x = Math.PI / 2;
  const blades = box(0.034 * scale, 0.006 * scale, 0.003 * scale, std('#3a3f4a', 0.5, 0.3), 0, 0.055 * scale, 0.043 * scale, h, false);
  box(0.03 * scale, 0.018 * scale, 0.03 * scale, M.alu(), 0, 0.006 * scale, 0, h);
  const noz = new THREE.Mesh(new THREE.ConeGeometry(0.008 * scale, 0.016 * scale, 12), M.brass());
  noz.rotation.x = Math.PI; noz.position.set(0, -0.009 * scale, 0); h.add(noz);
  if (parent) parent.add(h);
  h.userData.blades = blades;
  return h;
}

// Objeto base con utilidades comunes
function baseRig(model) {
  const def = MACHINES[model];
  const rig = {
    model, def, root: new THREE.Group(), pieceSlot: new THREE.Group(), pieceMode: 'up',
    pieceScale: 0.16, emissives: [], spools: [], parts: {}, pieceGroups: [], extra: new THREE.Group(),
    footprint: 0.5, height: 0.5, floor: false, statusMat: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#4b5279', emissiveIntensity: 2.2, roughness: 1 }),
  };
  rig.root.userData.machineRig = rig;
  return rig;
}

// ---------- Tipos ----------
function bedSlinger(rig, a, mini = false) {
  const k = a.big || 1;
  const frame = M.frame(a.frame), accent = a.accent;
  const W = (mini ? 0.32 : 0.44) * k, D = (mini ? 0.32 : 0.42) * k, H = (mini ? 0.38 : 0.46) * k;
  const R = rig.root;
  box(W, 0.055, D * 0.9, frame, 0, 0.0275, 0, R);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.03, 0.012, 0.03, M.rubber(), x * (W / 2 - 0.03), -0.006, z * (D * 0.45 - 0.03), R, false);
  const scr = box(0.085, 0.05, 0.008, M.screen(accent), W * 0.28, 0.035, D * 0.45 + 0.005, R, false);
  rig.emissives.push(scr.material);
  box(0.04, 0.03, D * 0.92, M.dark(), 0, 0.07, 0, R);
  const status = box(0.05, 0.008, 0.006, rig.statusMat, -W * 0.3, 0.035, D * 0.45 + 0.004, R, false);
  rig.parts.status = status;
  // Cama (se mueve en Z)
  const bed = new THREE.Group(); bed.position.y = 0.088; R.add(bed);
  const bw = (mini ? 0.19 : 0.27) * k;
  box(bw * 1.05, 0.014, bw * 1.05, M.bedDark(), 0, 0, 0, bed);
  box(bw, 0.005, bw, M.pei(), 0, 0.0095, 0, bed);
  rig.pieceSlot.position.y = 0.012; bed.add(rig.pieceSlot);
  rig.pieceScale = bw * 0.55;
  rig.parts.bed = bed;
  rig.parts.bedTravel = bw * 0.28;
  // Estructura Z
  let gantry, head;
  if (mini) {
    box(0.055, H, 0.06, frame, -W / 2 + 0.03, H / 2 + 0.05, -0.04, R);
    gantry = new THREE.Group(); R.add(gantry);
    box(W * 0.85, 0.04, 0.05, std(a.frame, 0.45, 0.1), W * 0.05, 0, -0.03, gantry);
    head = toolhead(std('#d9dce3', 0.45, 0.1), accent, gantry, 0.9);
    head.position.z = 0.0;
    rig.parts.headTravel = W * 0.28;
    rig.parts.headCenter = W * 0.08;
    const sp = spool(0.07, 0.055, '#5DDADB', R); sp.position.set(-W / 2 + 0.03, H + 0.12, -0.04); sp.rotation.y = Math.PI / 2;
    rig.spools.push(sp);
  } else {
    for (const sx of [-1, 1]) box(0.04, H, 0.04, frame, sx * (W / 2 - 0.025), H / 2 + 0.05, -0.03, R);
    if (a.top) box(W, 0.035, 0.045, frame, 0, H + 0.065, -0.03, R);
    gantry = new THREE.Group(); R.add(gantry);
    box(W - 0.03, 0.04, 0.04, std('#2a2d34', 0.4, 0.6), 0, 0, -0.03, gantry);
    head = toolhead(frame, accent, gantry);
    head.position.z = 0.01;
    rig.parts.headTravel = W * 0.3;
    rig.parts.headCenter = 0;
    const sp = spool(0.075 * Math.min(k, 1.2), 0.06, '#5DDADB', R);
    if (a.top) {
      sp.position.set(0, H + 0.16, -0.03);
      box(0.02, 0.07, 0.02, frame, 0, H + 0.1, -0.03, R);
    } else {
      // soporte lateral sobre el parante izquierdo (como la Ender-3)
      box(0.02, 0.02, 0.09, frame, -W / 2 + 0.025, H + 0.06, -0.03, R);
      sp.position.set(-W / 2 + 0.025, H + 0.06 + 0.075 * Math.min(k, 1.2) - 0.01, -0.03);
      sp.rotation.y = Math.PI / 2;
    }
    rig.spools.push(sp);
  }
  rig.parts.gantry = gantry; rig.parts.head = head;
  rig.parts.zBase = 0.088 + 0.012 + 0.012;
  rig.footprint = Math.max(W, D);
  rig.height = H + 0.2;
  rig.anim = 'bed';
}

function cube(rig, a, opts = {}) {
  const k = a.big || 1;
  const frame = M.frame(a.frame);
  const W = 0.4 * k, D = 0.41 * k, H = 0.47 * k;
  const R = rig.root;
  const base = 0.085 * k;
  box(W, base, D, frame, 0, base / 2, 0, R);
  const t = 0.022;
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(t, H - base, t, frame, x * (W / 2 - t / 2), base + (H - base) / 2, z * (D / 2 - t / 2), R);
  box(W, 0.03, D, frame, 0, H - 0.015, 0, R);
  // Paneles
  box(W - 0.01, H - base - 0.03, 0.006, std(a.frame, 0.6, 0.2), 0, base + (H - base - 0.03) / 2, -D / 2 + 0.004, R);
  const side = M.glass('#3b4357', 0.42);
  box(0.004, H - base - 0.03, D - 0.02, side, -W / 2 + 0.004, base + (H - base - 0.03) / 2, 0, R, false);
  box(0.004, H - base - 0.03, D - 0.02, side, W / 2 - 0.004, base + (H - base - 0.03) / 2, 0, R, false);
  const door = box(W - 0.03, H - base - 0.04, 0.004, M.glass(a.glass || '#9fb4d8', 0.13), 0, base + (H - base - 0.04) / 2, D / 2 - 0.004, R, false);
  box(0.012, 0.09, 0.012, std(a.accent, 0.4, 0.3), W / 2 - 0.04, base + (H - base) * 0.5, D / 2 + 0.006, R);
  box(W - 0.03, 0.004, D - 0.03, M.glass('#9fb4d8', 0.12), 0, H + 0.001, 0, R, false);
  rig.parts.door = door;
  const scr = box(0.09 * k, 0.045 * k, 0.006, M.screen(a.accent === '#16171a' ? '#fa6831' : a.accent), -W * 0.22, base * 0.55, D / 2 + 0.004, R, false);
  rig.emissives.push(scr.material);
  const status = box(0.06, 0.008, 0.006, rig.statusMat, W * 0.25, base * 0.55, D / 2 + 0.004, R, false);
  rig.parts.status = status;
  // Luz interior
  const lamp = box(W * 0.6, 0.006, 0.02, M.glow('#fff4e0', 1.2), 0, H - 0.04, D / 2 - 0.05, R, false);
  rig.emissives.push(lamp.material);
  // Cama que baja
  const bed = new THREE.Group(); R.add(bed);
  const bw = W * 0.62;
  box(bw * 1.05, 0.012, bw * 1.05, M.bedDark(), 0, 0, 0, bed);
  box(bw, 0.004, bw, M.pei(), 0, 0.008, 0, bed);
  for (const sx of [-1, 1]) cyl(0.006, 0.006, H - base - 0.05, M.rail(), sx * bw * 0.4, base + (H - base) / 2, -D / 2 + 0.04, R, 10);
  rig.pieceSlot.position.y = 0.0105; bed.add(rig.pieceSlot);
  rig.pieceScale = bw * 0.5;
  rig.parts.bed = bed;
  rig.parts.bedTop = H - 0.165;
  rig.parts.bedDrop = (H - base - 0.2);
  // Pórtico CoreXY
  const gy = H - 0.075;
  for (const sx of [-1, 1]) box(0.018, 0.018, D - 0.05, M.rail(), sx * (W / 2 - 0.03), gy, 0, R);
  const beam = new THREE.Group(); beam.position.y = gy; R.add(beam);
  box(W - 0.06, 0.02, 0.022, M.rail(), 0, 0, 0, beam);
  const head = toolhead(std(a.frame === '#e8eaee' ? '#e8eaee' : '#2a2d34', 0.45, 0.2), a.accent, beam, 0.85);
  head.position.y = -0.06;
  rig.parts.beam = beam; rig.parts.head = head;
  rig.parts.headTravel = W * 0.28; rig.parts.beamTravel = D * 0.22;
  if (opts.voron) for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.04, 0.04, 0.04, std(a.accent, 0.45, 0.1), x * (W / 2 - 0.018), H - 0.02, z * (D / 2 - 0.018), R);
  rig.footprint = Math.max(W, D);
  rig.height = H + 0.02;
  rig.parts.H = H; rig.parts.W = W; rig.parts.D = D;
  rig.anim = 'cube';
}
function addAms(rig, a, colors) {
  if (rig.parts.ams) return;
  const { W, D, H } = rig.parts;
  const g = new THREE.Group(); g.position.set(0, H + 0.003, -D * 0.12);
  box(W * 0.95, 0.11, D * 0.62, M.frame(a.frame), 0, 0.055, 0, g);
  box(W * 0.93, 0.004, D * 0.6, M.glass('#2b3040', 0.55), 0, 0.112, 0, g, false);
  colors.forEach((c, i) => { const s = spool(0.045, 0.05, c, g); s.position.set(-W * 0.33 + i * W * 0.22, 0.06, 0); s.rotation.y = Math.PI / 2; });
  rig.root.add(g);
  rig.parts.ams = g;
  rig.height = H + 0.13;
}

function prusaXL(rig, a) {
  const k = a.big || 1.5;
  const frame = M.frame(a.frame);
  const W = 0.5 * k, D = 0.5 * k, H = 0.55 * k;
  const R = rig.root;
  box(W, 0.07, D, M.frame('#16171a'), 0, 0.035, 0, R);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.035, H, 0.035, frame, x * (W / 2 - 0.02), H / 2, z * (D / 2 - 0.02), R);
  box(W, 0.035, 0.035, frame, 0, H, D / 2 - 0.02, R); box(W, 0.035, 0.035, frame, 0, H, -D / 2 + 0.02, R);
  box(0.035, 0.035, D, frame, W / 2 - 0.02, H, 0, R); box(0.035, 0.035, D, frame, -W / 2 + 0.02, H, 0, R);
  const scr = box(0.1, 0.05, 0.006, M.screen('#fa6831'), W * 0.25, 0.045, D / 2 + 0.004, R, false); rig.emissives.push(scr.material);
  rig.parts.status = box(0.06, 0.008, 0.006, rig.statusMat, -W * 0.25, 0.045, D / 2 + 0.004, R, false);
  // Dock de cabezales
  const cols = ['#5DDADB', '#F78EB6', '#ffd166', '#7c83ff', '#e9ebef'];
  cols.forEach((c, i) => { const h = toolhead(std('#16171a', 0.5, 0.2), c, R, 0.8); h.position.set(-W / 2 + 0.06, H - 0.12, -D / 2 + 0.08 + i * (D - 0.16) / 4); });
  const bed = new THREE.Group(); R.add(bed);
  const bw = W * 0.7;
  box(bw, 0.012, bw, M.bedDark(), 0, 0, 0, bed); box(bw * 0.97, 0.004, bw * 0.97, M.pei(), 0, 0.008, 0, bed);
  rig.pieceSlot.position.y = 0.0105; bed.add(rig.pieceSlot);
  rig.pieceScale = bw * 0.45;
  rig.parts.bed = bed; rig.parts.bedTop = H - 0.145; rig.parts.bedDrop = H - 0.25;
  const beam = new THREE.Group(); beam.position.y = H - 0.05; R.add(beam);
  box(W - 0.05, 0.025, 0.03, M.rail(), 0, 0, 0, beam);
  const head = toolhead(std('#16171a', 0.5, 0.2), '#fa6831', beam, 0.9); head.position.y = -0.065;
  rig.parts.beam = beam; rig.parts.head = head; rig.parts.headTravel = W * 0.26; rig.parts.beamTravel = D * 0.2;
  rig.footprint = W; rig.height = H + 0.05; rig.floor = true;
  rig.parts.H = H; rig.parts.W = W; rig.parts.D = D;
  rig.anim = 'cube';
}

function giga(rig, a) {
  const W = 1.0, D = 1.0, legH = 0.55, frame = M.frame(a.frame);
  const R = rig.root;
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.05, legH, 0.05, frame, x * (W / 2 - 0.03), legH / 2, z * (D / 2 - 0.03), R);
  box(W, 0.06, D, frame, 0, legH, 0, R);
  box(W * 0.9, 0.012, D * 0.9, M.pei(), 0, legH + 0.036, 0, R);
  for (const sx of [-1, 1]) box(0.04, 0.05, D, std(a.accent, 0.4, 0.3), sx * (W / 2 - 0.02), legH + 0.055, 0, R);
  rig.pieceSlot.position.set(0, legH + 0.042, 0); R.add(rig.pieceSlot);
  rig.pieceScale = W * 0.38;
  const scr = box(0.14, 0.08, 0.008, M.screen('#ff7a1a'), W * 0.3, legH - 0.08, D / 2, R, false); rig.emissives.push(scr.material);
  rig.parts.status = box(0.1, 0.012, 0.008, rig.statusMat, -W * 0.3, legH - 0.08, D / 2, R, false);
  const bridge = new THREE.Group(); R.add(bridge);
  for (const sx of [-1, 1]) box(0.05, 0.75, 0.06, frame, sx * (W / 2 + 0.01), legH + 0.4, 0, bridge);
  const beam = new THREE.Group(); bridge.add(beam);
  box(W + 0.06, 0.06, 0.06, std('#2a2d34', 0.4, 0.6), 0, 0, 0, beam);
  const head = toolhead(frame, a.accent, beam, 1.6); head.position.y = -0.14;
  rig.parts.bridge = bridge; rig.parts.beam = beam; rig.parts.head = head;
  rig.parts.headTravel = W * 0.3; rig.parts.bridgeTravel = D * 0.25;
  rig.parts.zBase = legH + 0.042;
  const rack = new THREE.Group(); rack.position.set(W / 2 + 0.12, legH, -0.2); R.add(rack);
  box(0.04, 0.5, 0.5, frame, 0, 0.25, 0, rack);
  ['#5DDADB', '#ff7a1a', '#e9ebef'].forEach((c, i) => { const s = spool(0.09, 0.07, c, rack); s.position.set(0.06, 0.12 + i * 0.16, 0); s.rotation.y = Math.PI / 2; rig.spools.push(s); });
  rig.footprint = 1.25; rig.height = legH + 0.8; rig.floor = true;
  rig.anim = 'giga';
}

function farmRack(rig, a) {
  const n = a.n || 8;
  const cols = 2, rows = Math.ceil(n / cols);
  const W = 0.9, D = 0.45, rowH = a.pro ? 0.5 : 0.38;
  const H = rows * rowH + 0.1;
  const frame = M.frame(a.frame);
  const R = rig.root;
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.03, H, 0.03, frame, x * (W / 2 - 0.015), H / 2, z * (D / 2 - 0.015), R);
  rig.units = [];
  for (let r = 0; r < rows; r++) {
    const y = 0.06 + r * rowH;
    box(W, 0.02, D, std('#4a505c', 0.5, 0.6), 0, y, 0, R);
    for (let c = 0; c < cols && rig.units.length < n; c++) {
      const u = new THREE.Group(); u.position.set((c - 0.5) * W * 0.5, y + 0.01, 0); R.add(u);
      const sw = a.pro ? 0.3 : 0.24;
      if (a.pro) {
        box(sw, rowH - 0.06, sw * 0.95, std('#1b1c1f', 0.5, 0.3), 0, (rowH - 0.06) / 2, 0, u);
        box(sw * 0.9, rowH - 0.1, 0.004, M.glass('#8fa3c2', 0.15), 0, (rowH - 0.06) / 2, sw * 0.48, u, false);
      } else {
        box(sw, 0.03, sw * 0.9, M.white(), 0, 0.015, 0, u);
        box(0.025, rowH - 0.1, 0.03, M.white(), -sw / 2 + 0.02, (rowH - 0.1) / 2 + 0.03, -0.04, u);
      }
      const bed = new THREE.Group(); bed.position.y = a.pro ? 0.06 : 0.035; u.add(bed);
      box(sw * 0.55, 0.004, sw * 0.55, M.pei(), 0, 0, 0, bed);
      const slot = new THREE.Group(); slot.position.y = 0.003; bed.add(slot);
      const arm = new THREE.Group(); arm.position.y = rowH * 0.45; u.add(arm);
      box(sw * 0.8, 0.018, 0.025, std('#d9dce3', 0.45, 0.1), 0.01, 0, -0.01, arm);
      const head = toolhead(std('#d9dce3', 0.45, 0.1), a.accent, arm, 0.5);
      head.position.y = -0.035;
      const led = box(0.04, 0.006, 0.004, rig.statusMat, sw * 0.3, 0.02, sw * 0.47, u, false);
      rig.units.push({ group: u, bed, slot, arm, head, phase: rig.units.length * 1.7, led });
    }
  }
  rig.parts.status = rig.units[0].led;
  rig.pieceSlot = rig.units[0].slot;
  rig.pieceScale = 0.075;
  rig.footprint = W; rig.height = H; rig.floor = true;
  rig.anim = 'rack';
}

function resin(rig, a) {
  const k = a.big || 1;
  const W = 0.24 * k, D = 0.24 * k, baseH = 0.14 * k;
  const frame = M.frame(a.frame);
  const R = rig.root;
  box(W, baseH, D, frame, 0, baseH / 2, 0, R);
  const scr = box(W * 0.45, baseH * 0.35, 0.006, M.screen(a.lid), 0, baseH * 0.5, D / 2 + 0.003, R, false); rig.emissives.push(scr.material);
  rig.parts.status = box(0.05, 0.007, 0.006, rig.statusMat, 0, baseH * 0.16, D / 2 + 0.003, R, false);
  // Cubeta con resina
  const vatY = baseH + 0.015;
  box(W * 0.7, 0.03, D * 0.55, M.alu(), 0, vatY, 0.01, R);
  const liquid = box(W * 0.64, 0.004, D * 0.5, new THREE.MeshStandardMaterial({ color: '#7fa89a', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }), 0, vatY + 0.013, 0.01, R, false);
  rig.parts.liquid = liquid;
  const uv = box(W * 0.6, 0.002, D * 0.45, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#6b5bff', emissiveIntensity: 0, roughness: 1 }), 0, baseH + 0.001, 0.01, R, false);
  rig.parts.uv = uv;
  // Eje Z y plataforma
  box(0.03 * k, 0.32 * k, 0.03 * k, M.alu(), 0, baseH + 0.16 * k, -D / 2 + 0.03, R);
  const carriage = new THREE.Group(); R.add(carriage);
  box(0.035, 0.03, D * 0.5, M.alu(), 0, 0, -D * 0.2, carriage);
  const plate = box(W * 0.55, 0.012, D * 0.42, M.rail(), 0, -0.012, 0.01, carriage);
  rig.pieceSlot.position.set(0, -0.019, 0.01); rig.pieceSlot.rotation.x = Math.PI; carriage.add(rig.pieceSlot);
  rig.pieceScale = W * 0.32;
  rig.pieceMode = 'down';
  rig.parts.carriage = carriage; rig.parts.vatTop = vatY + 0.017;
  rig.parts.plate = plate;
  // Tapa UV teñida
  const lidH = 0.34 * k;
  box(W * 0.98, lidH, D * 0.98, M.tinted(a.lid, a.pro ? 0.55 : 0.42), 0, baseH + lidH / 2, 0, R, false);
  rig.footprint = Math.max(W, D); rig.height = baseH + lidH;
  rig.anim = 'resin';
}

function laser(rig, a, enclosed) {
  const k = a.big || 1;
  const W = (enclosed ? 0.66 : 0.6) * k, D = (enclosed ? 0.5 : 0.56) * k;
  const R = rig.root;
  const frame = M.frame(a.frame);
  let bedY = 0.03;
  if (enclosed) {
    const H = 0.2 * k;
    box(W, 0.06, D, frame, 0, 0.03, 0, R);
    box(W, H - 0.06, 0.02, frame, 0, H / 2 + 0.03, -D / 2 + 0.01, R);
    box(0.02, H - 0.06, D, frame, -W / 2 + 0.01, H / 2 + 0.03, 0, R);
    box(0.02, H - 0.06, D, frame, W / 2 - 0.01, H / 2 + 0.03, 0, R);
    box(W, H * 0.35, 0.02, frame, 0, 0.06 + H * 0.175, D / 2 - 0.01, R);
    box(W, 0.008, D, M.tinted(a.lid, 0.45), 0, H + 0.035, 0, R, false);
    box(W * 0.98, H * 0.6, 0.006, M.tinted(a.lid, 0.4), 0, H * 0.65 + 0.03, D / 2 - 0.01, R, false);
    const strip = box(W * 0.3, 0.01, 0.006, M.glow('#5DDADB', 1.5), -W * 0.25, 0.04, D / 2 + 0.002, R, false); rig.emissives.push(strip.material);
    rig.parts.status = box(0.05, 0.01, 0.006, rig.statusMat, W * 0.3, 0.04, D / 2 + 0.002, R, false);
    bedY = 0.07;
    rig.height = H + 0.05;
  } else {
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.03, 0.04, 0.03, M.rubber(), x * (W / 2 - 0.02), 0.02, z * (D / 2 - 0.02), R);
    for (const sx of [-1, 1]) box(0.03, 0.03, D, M.alu(), sx * (W / 2 - 0.015), 0.055, 0, R);
    box(W, 0.03, 0.03, M.alu(), 0, 0.055, -D / 2 + 0.015, R);
    rig.parts.status = box(0.04, 0.01, 0.01, rig.statusMat, W / 2 - 0.015, 0.075, D / 2 - 0.05, R, false);
    rig.height = 0.15;
  }
  const honey = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, D * 0.82), std('#ffffff', 0.7, 0.4, { map: TEX.honeycomb() }));
  honey.rotation.x = -Math.PI / 2; honey.position.y = bedY; honey.receiveShadow = true; R.add(honey);
  const sheet = box(W * 0.6, 0.004, D * 0.55, std('#b98a5a', 0.85, 0), 0, bedY + 0.002, 0.02, R);
  rig.parts.sheet = sheet;
  rig.pieceSlot.position.set(0, bedY + 0.004, 0.02); R.add(rig.pieceSlot);
  rig.pieceScale = W * 0.4;
  rig.pieceMode = 'z';
  const gy = bedY + (enclosed ? 0.085 : 0.08);
  const beam = new THREE.Group(); beam.position.y = gy; R.add(beam);
  box(W - 0.04, 0.025, 0.03, std('#1d1f24', 0.45, 0.4), 0, 0, 0, beam);
  const head = new THREE.Group(); beam.add(head);
  box(0.05, 0.08, 0.05, std('#16171a', 0.5, 0.3), 0, -0.02, 0.03, head);
  box(0.03, 0.03, 0.006, std(a.accent || a.lid || '#3a86ff', 0.4, 0.2), 0, 0, 0.056, head);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#7a6cff', emissiveIntensity: 0 }));
  dot.position.set(0, gy * -1 + bedY + 0.008, 0.03); head.add(dot);
  rig.parts.dot = dot;
  rig.parts.beam = beam; rig.parts.head = head;
  rig.parts.headTravel = W * 0.28; rig.parts.beamTravel = D * 0.25;
  rig.footprint = Math.max(W, D);
  rig.anim = 'laser';
}

function cnc(rig, a, enclosed) {
  const k = a.big || 1;
  const W = 0.5 * k, D = 0.46 * k;
  const R = rig.root;
  const frame = M.frame(a.frame);
  const bedY = 0.05;
  box(W, 0.04, D, std('#3b3f4a', 0.6, 0.5), 0, 0.02, 0, R);
  box(W * 0.85, 0.012, D * 0.8, std('#ffffff', 0.85, 0, { map: TEX.wood([1, 1], '#8a6a45') }), 0, 0.046, 0, R);
  for (const sx of [-1, 1]) box(0.035, 0.05, D, M.alu(), sx * (W / 2 - 0.02), 0.065, 0, R);
  const stock = box(W * 0.5, 0.03, D * 0.4, std('#a0703f', 0.8, 0), 0, bedY + 0.017, 0.02, R);
  rig.parts.stock = stock;
  rig.pieceSlot.position.set(0, bedY + 0.033, 0.02); R.add(rig.pieceSlot);
  rig.pieceScale = W * 0.36;
  rig.pieceMode = 'z';
  const bridge = new THREE.Group(); R.add(bridge);
  const bh = 0.26 * k;
  for (const sx of [-1, 1]) box(0.04, bh, 0.06, frame, sx * (W / 2 - 0.02), 0.06 + bh / 2, 0, bridge);
  box(W, 0.05, 0.06, frame, 0, 0.06 + bh, 0, bridge);
  const carriage = new THREE.Group(); carriage.position.set(0, 0.06 + bh, 0.05); bridge.add(carriage);
  box(0.08, 0.12, 0.03, std('#2a2d34', 0.4, 0.5), 0, -0.02, 0, carriage);
  const spindle = new THREE.Group(); carriage.add(spindle);
  cyl(0.026, 0.026, 0.12, M.alu(), 0, -0.07, 0.03, spindle, 20);
  const bit = new THREE.Group(); bit.position.set(0, -0.135, 0.03); spindle.add(bit);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.035, 8), M.steel()); cone.rotation.x = Math.PI; bit.add(cone);
  box(0.004, 0.03, 0.012, M.steel(), 0, 0.005, 0, bit, false);
  rig.parts.bridge = bridge; rig.parts.carriage = carriage; rig.parts.spindle = spindle; rig.parts.bit = bit;
  rig.parts.headTravel = W * 0.25; rig.parts.bridgeTravel = D * 0.22;
  rig.parts.status = box(0.05, 0.012, 0.01, rig.statusMat, W / 2 - 0.05, 0.03, D / 2 + 0.002, R, false);
  rig.height = 0.38 * k;
  if (enclosed) {
    const H = 0.5 * k;
    box(W + 0.06, H, 0.02, M.frame(a.frame), 0, H / 2, -D / 2 - 0.03, R);
    box(0.02, H, D + 0.06, M.frame(a.frame), -W / 2 - 0.03, H / 2, 0, R);
    box(0.02, H, D + 0.06, M.frame(a.frame), W / 2 + 0.03, H / 2, 0, R);
    box(W + 0.06, 0.02, D + 0.06, M.frame(a.frame), 0, H, 0, R);
    box(W + 0.02, H - 0.04, 0.006, M.tinted(a.lid, 0.38), 0, H / 2, D / 2 + 0.03, R, false);
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
    case 'bed': bedSlinger(rig, a); break;
    case 'mini': bedSlinger(rig, a, true); break;
    case 'cube': cube(rig, a, { voron: model === 'voron' }); if (a.ams) addAms(rig, a, ['#F78EB6', '#5DDADB', '#ffd166', '#e9ebef']); break;
    case 'pxl': prusaXL(rig, a); break;
    case 'giga': giga(rig, a); break;
    case 'rack': farmRack(rig, a); break;
    case 'resin': resin(rig, a); break;
    case 'laser': laser(rig, a, false); break;
    case 'laserbox': laser(rig, a, true); break;
    case 'cnc': cnc(rig, a, false); break;
    case 'cncbox': cnc(rig, a, true); break;
    default: bedSlinger(rig, a);
  }
  rig.root.add(rig.extra);
  rig.piece = null;
  rig.setMulti = (on) => { if (on && a.type === 'cube' && !a.ams) addAms(rig, a, ['#F78EB6', '#5DDADB', '#ffd166', '#7c83ff']); };
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
  const slots = rig.units ? rig.units.map((u) => u.slot) : [rig.pieceSlot];
  for (const slot of slots) {
    const pc = buildPiece(pid);
    const sc = rig.pieceScale * (PRODUCTS[pid].size === 'XL' ? 1.6 : PRODUCTS[pid].size === 'L' ? 1.3 : PRODUCTS[pid].size === 'S' ? 0.8 : 1);
    pc.group.scale.setScalar(sc);
    pc.scale = sc;
    pc.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    for (const m of pc.mats) { m.clippingPlanes = [pc.plane]; m.clipShadows = true; }
    slot.add(pc.group);
    pc.slot = slot;
    rig.pieceGroups.push(pc);
  }
  const mat = MATERIALS[PRODUCTS[pid].mat];
  for (const sp of rig.spools) sp.userData.fil.color.set(PRODUCTS[pid].colors?.[0] || mat.color);
  if (rig.parts.sheet) rig.parts.sheet.material = std(mat.color, mat.id === 'ACRILICO' ? 0.1 : 0.85, 0, mat.id === 'ACRILICO' ? { transparent: true, opacity: 0.55 } : {});
  if (rig.parts.stock) rig.parts.stock.material = std(mat.color, mat.id === 'ALU' ? 0.3 : 0.8, mat.id === 'ALU' ? 0.85 : 0);
  if (rig.parts.liquid) rig.parts.liquid.material.color.set(PRODUCTS[pid].color === '#ffd166' ? '#c9a54a' : '#7fa89a');
}

// Efectos de problema: spaghetti, gato, fuego, humo
function setEvent(rig, id) {
  if (rig.eventId === id) return;
  rig.eventId = id;
  while (rig.extra.children.length) rig.extra.remove(rig.extra.children[0]);
  rig.fx = null;
  if (!id) return;
  const at = new THREE.Vector3();
  rig.pieceSlot.getWorldPosition(at);
  rig.root.worldToLocal(at);
  if (id === 'spaghetti') {
    const pts = [];
    let seed = 7;
    const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 26; i++) pts.push(new THREE.Vector3((r() - 0.5) * 0.14, 0.01 + r() * 0.08, (r() - 0.5) * 0.14));
    const color = rig.pid ? PRODUCTS[rig.pid].color : '#ffffff';
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.0035, 6), std(color, 0.5, 0));
    tube.position.copy(at); tube.castShadow = true;
    rig.extra.add(tube);
  } else if (id === 'gato') {
    const cat = new THREE.Group();
    const fur = std('#141418', 0.85, 0);
    box(0.11, 0.06, 0.06, fur, 0, 0.035, 0, cat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), fur); head.position.set(0.065, 0.075, 0); cat.add(head);
    for (const z of [-0.018, 0.018]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 4), fur); e.position.set(0.07, 0.11, z); cat.add(e); }
    for (const z of [-0.012, 0.012]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), M.glow('#ffd166', 2)); eye.position.set(0.098, 0.08, z); cat.add(eye); }
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16, Math.PI), fur); tail.position.set(-0.07, 0.06, 0); tail.rotation.z = Math.PI / 2; cat.add(tail);
    cat.position.copy(at); cat.position.y += 0.005; cat.rotation.y = -0.6;
    cat.traverse((o) => { o.castShadow = true; });
    rig.extra.add(cat);
    rig.fx = { cat };
  } else if (id === 'llama') {
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 10), M.glow('#ff7a1a', 4));
    fire.position.copy(at); fire.position.y += 0.04;
    rig.extra.add(fire);
    rig.fx = { fire };
  } else if (id === 'humo' || id === 'viruta') {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: id === 'humo' ? '#9aa3b2' : '#c49a6c', transparent: true, opacity: 0.45, roughness: 1, depthWrite: false });
    for (let i = 0; i < 10; i++) { const sph = new THREE.Mesh(new THREE.SphereGeometry(0.02 + (i % 3) * 0.01, 8, 6), mat); sph.position.set((i % 4 - 1.5) * 0.04, 0.03 + (i % 5) * 0.025, ((i * 7) % 5 - 2) * 0.03); g.add(sph); }
    g.position.copy(at);
    rig.extra.add(g);
    rig.fx = { smoke: g };
  }
}

const tmpV = new THREE.Vector3();
function update(rig, st) {
  const P = rig.parts;
  const t = st.t;
  const run = st.running;
  const sp = st.anim === 'soft' ? 0.45 : st.anim === 'min' ? 0 : 1;
  const tt = t * sp;
  const p = st.p;
  // Luz de estado
  const sc = STATUS_COLORS[st.status] || STATUS_COLORS.idle;
  rig.statusMat.emissive.set(st.blackout ? '#000000' : sc);
  rig.statusMat.emissiveIntensity = st.status === 'event' ? 1.5 + Math.sin(t * 8) * 1.2 : 2.2;
  for (const m of rig.emissives) m.emissiveIntensity = st.blackout ? 0 : (m.userData.base ?? (m.userData.base = m.emissiveIntensity));
  // Piezas: altura según progreso + plano de corte
  const showP = rig.pid ? p : 0;
  for (const pc of rig.pieceGroups) {
    pc.group.visible = !!rig.pid;
    pc.slot.getWorldPosition(tmpV);
    const h = pc.height * pc.scale, w = pc.width * pc.scale;
    if (rig.pieceMode === 'up') { pc.plane.normal.set(0, -1, 0); pc.plane.constant = tmpV.y + h * showP + 0.0005; }
    else if (rig.pieceMode === 'down') { pc.plane.normal.set(0, 1, 0); pc.plane.constant = -(tmpV.y - h * showP - 0.0005); }
    else { pc.plane.normal.set(0, 0, -1); pc.plane.constant = tmpV.z - w * 0.6 + w * 1.2 * showP; }
  }
  const pieceH = rig.pieceGroups[0] ? rig.pieceGroups[0].height * rig.pieceGroups[0].scale : 0.05;
  const moving = run && sp > 0;
  if (rig.anim === 'bed') {
    const hx = moving ? Math.sin(tt * 3.1) * 0.7 + Math.sin(tt * 7.3) * 0.3 : (st.status === 'done' ? 1 : 0);
    P.head.position.x = P.headCenter + hx * P.headTravel;
    P.bed.position.z = moving ? Math.sin(tt * 2.3 + 1) * P.bedTravel : 0;
    P.gantry.position.y = P.zBase + pieceH * showP + 0.012 + (st.status === 'done' ? 0.04 : 0);
  } else if (rig.anim === 'cube') {
    const hx = moving ? Math.sin(tt * 3.6) * 0.8 + Math.sin(tt * 9.1) * 0.2 : (st.status === 'done' ? 1 : 0);
    const bz = moving ? Math.sin(tt * 2.7 + 0.5) : -0.8;
    P.head.position.x = hx * P.headTravel;
    P.beam.position.z = bz * P.beamTravel;
    P.bed.position.y = P.bedTop - Math.min(P.bedDrop, pieceH * showP) - (st.status === 'done' ? 0.02 : 0);
  } else if (rig.anim === 'giga') {
    P.head.position.x = moving ? Math.sin(tt * 1.6) * P.headTravel : P.headTravel;
    P.bridge.position.z = moving ? Math.sin(tt * 1.1) * P.bridgeTravel : -P.bridgeTravel;
    P.beam.position.y = P.zBase + pieceH * showP + 0.16;
  } else if (rig.anim === 'rack') {
    for (const u of rig.units) {
      u.head.position.x = moving ? Math.sin(tt * 3.2 + u.phase) * 0.06 : 0.07;
      u.bed.position.z = moving ? Math.sin(tt * 2.4 + u.phase) * 0.03 : 0;
      u.arm.position.y = (rig.def.art.pro ? 0.06 : 0.035) + pieceH * showP + 0.045;
      u.led.material = rig.statusMat;
    }
  } else if (rig.anim === 'resin') {
    const layer = moving ? (Math.sin(tt * 2.2) * 0.5 + 0.5) * 0.012 : 0.05;
    P.carriage.position.y = P.vatTop + 0.019 + pieceH * showP + layer;
    P.uv.material.emissiveIntensity = moving && Math.sin(tt * 2.2) < -0.2 && !st.blackout ? 2.2 : 0;
  } else if (rig.anim === 'laser') {
    const hx = moving ? Math.sin(tt * 6.5) : 0.9;
    P.head.position.x = hx * P.headTravel;
    P.beam.position.z = moving ? (-1 + 2 * showP) * P.beamTravel * 0.9 : -P.beamTravel;
    P.dot.material.emissiveIntensity = moving && !st.blackout ? 3 + Math.random() * 2 : 0;
  } else if (rig.anim === 'cnc') {
    P.carriage.position.x = moving ? Math.sin(tt * 2.8) * P.headTravel : P.headTravel;
    P.bridge.position.z = moving ? (-1 + 2 * showP) * P.bridgeTravel * 0.9 : -P.bridgeTravel;
    P.spindle.position.y = moving ? -0.03 : 0.02;
    if (moving) P.bit.rotation.y += 0.9;
  }
  if (P.head?.userData.blades && moving) P.head.userData.blades.rotation.z += 0.6;
  // Efectos
  if (rig.fx?.fire) { rig.fx.fire.scale.y = 0.8 + Math.random() * 0.6; }
  if (rig.fx?.cat) { rig.fx.cat.position.y += Math.sin(t * 3) * 0.0002; }
  if (rig.fx?.smoke) { rig.fx.smoke.rotation.y += 0.01; rig.fx.smoke.position.y += Math.sin(t * 2) * 0.0003; }
}
