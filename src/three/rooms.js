// Ambientes del taller (uno por espacio) y distribución de los lugares.
import * as THREE from 'three';
import { M, std, TEX } from './materials.js';
import { buildPiece } from './pieces.js';
import { MATERIALS, MATERIAL_ORDER, UNIT } from '../game/data.js';

const GRID = { 2: [2, 1], 4: [4, 1], 8: [4, 2], 12: [4, 3], 16: [4, 4], 20: [5, 4], 24: [6, 4] };
export const SX = 1.2, SZ = 1.45, BENCH_H = 0.76;

function box(w, h, d, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function plane(w, h, mat, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.receiveShadow = true; parent.add(m);
  return m;
}

export function slotLayout(n) {
  const [cols, rows] = GRID[n] || [Math.ceil(Math.sqrt(n)), Math.ceil(n / Math.ceil(Math.sqrt(n)))];
  const pos = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols && pos.length < n; c++) {
    pos.push(new THREE.Vector3((c - (cols - 1) / 2) * SX, 0, (r - (rows - 1) / 2) * SZ - 0.1));
  }
  const W = cols * SX + 2.6, D = rows * SZ + 2.8;
  return { pos, cols, rows, W, D };
}

// Banco de trabajo / escritorio para un lugar
export function buildBench(style) {
  const g = new THREE.Group();
  const top = style === 'desk' ? std('#ffffff', 0.7, 0, { map: TEX.wood([1, 1], '#7a5536') })
    : style === 'steel' ? std('#8c95a5', 0.4, 0.7) : std('#ffffff', 0.75, 0, { map: TEX.wood([1, 1], '#9a7650') });
  box(1.0, 0.05, 0.68, top, 0, BENCH_H - 0.025, 0, g);
  const leg = style === 'desk' ? std('#1d1f24', 0.5, 0.4) : std('#2b2f38', 0.45, 0.6);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.045, BENCH_H - 0.05, 0.045, leg, x * 0.46, (BENCH_H - 0.05) / 2, z * 0.3, g);
  box(0.95, 0.03, 0.6, leg, 0, 0.18, 0, g);
  if (style === 'desk') box(0.32, 0.4, 0.6, std('#2a2d34', 0.55, 0.2), 0.32, 0.5, 0, g);
  return g;
}

function spoolMesh(color) {
  const g = new THREE.Group();
  const f = std('#1f2228', 0.6, 0.1);
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 24), f); a.rotation.x = Math.PI / 2; a.position.z = 0.035; g.add(a);
  const b = a.clone(); b.position.z = -0.035; g.add(b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 24), std(color, 0.45, 0.05)); c.rotation.x = Math.PI / 2; g.add(c);
  g.traverse((o) => { o.castShadow = true; });
  return g;
}

export function buildRoom(space, n) {
  const L = slotLayout(n);
  const g = new THREE.Group();
  const W = L.W, D = L.D;
  const wallH = space >= 4 ? 4.2 : space >= 2 ? 3.2 : 2.8;
  const room = { group: g, layout: L, W, D, wallH, updaters: [], lights: [] };
  // Piso
  const floorMat = space <= 1 ? std('#ffffff', 0.75, 0, { map: TEX.wood([W / 2, D / 2], '#5b3d26') })
    : space === 3 ? std('#ffffff', 0.35, 0.05, { map: TEX.tiles([W / 1.2, D / 1.2]) })
      : space === 6 ? std('#ffffff', 0.28, 0.1, { map: TEX.epoxy([W / 3, D / 3]) })
        : std('#ffffff', 0.85, 0.05, { map: TEX.concrete([W / 3, D / 3], space >= 4 ? '#30343e' : '#3a3f4b') });
  const floor = plane(W, D, floorMat, g); floor.rotation.x = -Math.PI / 2;
  // Paredes (fondo e izquierda)
  const wallColor = ['#252b57', '#2a2f63', '#3b4150', '#2b2f5e', '#343a4a', '#2c3140', '#323a5c'][space];
  const wallMat = std(wallColor, 0.9, 0);
  const back = plane(W, wallH, wallMat, g); back.position.set(0, wallH / 2, -D / 2);
  const left = plane(D, wallH, wallMat, g); left.position.set(-W / 2, wallH / 2, 0); left.rotation.y = Math.PI / 2;
  box(W, 0.1, 0.03, std('#15182e', 0.6, 0), 0, 0.05, -D / 2 + 0.015, g);
  box(0.03, 0.1, D, std('#15182e', 0.6, 0), -W / 2 + 0.015, 0.05, 0, g);
  room.backZ = -D / 2; room.leftX = -W / 2;

  const add = (o) => { g.add(o); return o; };
  const emissive = (color, i = 2) => M.glow(color, i);

  // Estantería de materiales (refleja el stock)
  const shelf = new THREE.Group();
  const shelfW = Math.min(2.4, D * 0.6);
  shelf.position.set(-W / 2 + 0.22, 0, -D / 2 + shelfW / 2 + 0.4);
  for (let i = 0; i < 3; i++) box(0.36, 0.03, shelfW, std('#2b2f38', 0.5, 0.5), 0, 0.9 + i * 0.42, 0, shelf);
  for (const z of [-1, 1]) box(0.36, 1.9, 0.03, std('#2b2f38', 0.5, 0.5), 0, 0.95, z * shelfW / 2, shelf);
  add(shelf);
  room.shelf = shelf; room.shelfW = shelfW;
  room.setStock = (mat) => {
    if (room.stockKey === JSON.stringify(mat)) return;
    room.stockKey = JSON.stringify(mat);
    if (room.spools) shelf.remove(room.spools);
    const sg = new THREE.Group();
    const list = [];
    for (const k of MATERIAL_ORDER) { const cnt = Math.min(8, Math.ceil((mat[k] || 0) / UNIT)); for (let i = 0; i < cnt; i++) list.push(MATERIALS[k].color); }
    list.slice(0, 27).forEach((c, i) => {
      const s = spoolMesh(c);
      const row = Math.floor(i / 9), col = i % 9;
      s.position.set(0.02, 1.0 + row * 0.42, -shelfW / 2 + 0.16 + col * ((shelfW - 0.3) / 8));
      s.rotation.y = Math.PI / 2;
      sg.add(s);
    });
    room.spools = sg; shelf.add(sg);
  };

  // Tira LED superior
  const led = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#5DDADB', emissiveIntensity: 2.2 });
  room.ledMat = led;
  if (space >= 1) {
    box(W, 0.025, 0.02, led, 0, wallH - 0.15, -D / 2 + 0.03, g, false);
    box(0.02, 0.025, D, led, -W / 2 + 0.03, wallH - 0.15, 0, g, false);
  }

  if (space === 0) {
    // Ventana nocturna, póster, lámpara, monitor y mate
    const win = plane(1.4, 1.0, std('#0b1438', 1, 0, { emissive: '#1a2a6a', emissiveIntensity: 0.6 }), g); win.position.set(-W / 2 + 0.01, 1.7, 0.4); win.rotation.y = Math.PI / 2;
    for (let i = 0; i < 14; i++) { const l = plane(0.04, 0.06, emissive(i % 3 ? '#ffd27a' : '#5DDADB', 1.4), g); l.position.set(-W / 2 + 0.015, 1.3 + (i % 4) * 0.14, -0.1 + i * 0.07); l.rotation.y = Math.PI / 2; }
    box(1.5, 0.05, 0.08, std('#1d1f24', 0.5, 0.3), -W / 2 + 0.04, 1.2, 0.4, g);
    const poster = plane(0.7, 0.98, std('#ffffff', 0.8, 0, { map: TEX.poster('MAKE', 'STUFF') }), g); poster.position.set(0.9, 1.75, -D / 2 + 0.01);
    room.posterSlot = { pos: new THREE.Vector3(-0.6, 1.7, -D / 2 + 0.012), size: [0.8, 1.04] };
    // Escritorio lateral con monitor (slicer abierto), mate, termo y lámpara
    const side = new THREE.Group(); side.position.set(L.cols * SX / 2 + 0.72, 0, -0.35); g.add(side);
    const deskTop = std('#ffffff', 0.7, 0, { map: TEX.wood([1, 1], '#7a5536') });
    box(1.1, 0.05, 0.6, deskTop, 0, 0.74, 0, side);
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) box(0.04, 0.72, 0.04, std('#1d1f24', 0.5, 0.4), x * 0.5, 0.36, z * 0.26, side);
    box(0.62, 0.36, 0.03, std('#15171c', 0.4, 0.3), 0, 1.03, -0.18, side);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.32), std('#ffffff', 0.4, 0, { map: TEX.slicer(), emissive: '#ffffff', emissiveMap: TEX.slicer(), emissiveIntensity: 0.85 }));
    scr.position.set(0, 1.03, -0.163); side.add(scr);
    box(0.06, 0.12, 0.06, std('#15171c', 0.4, 0.3), 0, 0.82, -0.18, side);
    box(0.4, 0.015, 0.14, std('#22252c', 0.6, 0.2), -0.02, 0.775, 0.08, side);
    const mate = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.08, 16), std('#6b3f22', 0.6, 0)); mate.position.set(0.38, 0.81, 0.1); side.add(mate);
    const bomb = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8), M.alu()); bomb.position.set(0.39, 0.86, 0.1); bomb.rotation.z = 0.25; side.add(bomb);
    const yerba = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 16), std('#5c7a2e', 0.9, 0)); yerba.position.set(0.38, 0.85, 0.1); side.add(yerba);
    const termo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 20), std('#2f6f4f', 0.35, 0.6)); termo.position.set(0.46, 0.92, -0.05); side.add(termo);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 20), std('#1d1f24', 0.5, 0.3)); tapa.position.set(0.46, 1.09, -0.05); side.add(tapa);
    const arm = new THREE.Group(); arm.position.set(-0.42, 0.77, -0.1); side.add(arm);
    box(0.12, 0.02, 0.12, std('#1d1f24', 0.5, 0.4), 0, 0, 0, arm);
    const a1 = box(0.02, 0.4, 0.02, std('#1d1f24', 0.5, 0.4), 0, 0.2, 0, arm); a1.rotation.z = -0.25;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 20, 1, true), std('#F78EB6', 0.5, 0.2, { side: THREE.DoubleSide })); shade.position.set(0.12, 0.38, 0); shade.rotation.z = 0.9; arm.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), M.glow('#ffd9a0', 3)); bulb.position.set(0.15, 0.35, 0); arm.add(bulb);
    side.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const lampLight = new THREE.PointLight('#ffcf8a', 2.4, 4, 2); lampLight.position.set(L.cols * SX / 2 + 0.45, 1.25, -0.35); g.add(lampLight); room.lights.push(lampLight);
  }
  if (space === 1) {
    room.posterSlot = { pos: new THREE.Vector3(0.4, 1.75, -D / 2 + 0.012), size: [0.9, 1.17] };
    const rug = plane(2.6, 1.6, std('#3437A2', 0.95, 0), g); rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.004, 0.9);
    const p = new THREE.PointLight('#F78EB6', 2, 5, 2); p.position.set(W / 2 - 0.6, 2.2, -D / 2 + 0.6); g.add(p); room.lights.push(p);
  }
  if (space === 2) {
    const door = plane(2.6, 2.4, std('#ffffff', 0.5, 0.6, { map: TEX.corrugated([10, 1]) }), g); door.position.set(0.6, 1.2, -D / 2 + 0.01);
    const peg = plane(1.8, 1.0, std('#ffffff', 0.8, 0, { map: TEX.pegboard([7, 4]) }), g); peg.position.set(-W / 2 + 0.01, 1.6, D / 2 - 1.4); peg.rotation.y = Math.PI / 2;
    for (let i = 0; i < 6; i++) box(0.04, 0.22 + (i % 3) * 0.08, 0.06, std(i % 2 ? '#e63946' : '#c9ced8', 0.4, 0.6), -W / 2 + 0.05, 1.55, D / 2 - 2.1 + i * 0.25, g);
    box(0.6, 0.9, 0.45, std('#c62828', 0.4, 0.5), W / 2 - 0.5, 0.45, -D / 2 + 0.35, g);
    for (let i = 0; i < 3; i++) { const tube = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.4).rotateX(Math.PI / 2), emissive('#e8f4ff', 2.2)); tube.position.set((i - 1) * 2.2, wallH - 0.05, 0); g.add(tube); }
  }
  if (space === 3) {
    const neon = plane(2.4, 0.6, new THREE.MeshStandardMaterial({ map: TEX.label('3DBAT', '#F78EB6'), emissive: '#ffffff', emissiveMap: TEX.label('3DBAT', '#F78EB6'), emissiveIntensity: 1.6, transparent: true }), g);
    neon.position.set(0.4, 2.3, -D / 2 + 0.02);
    const sub = plane(2.4, 0.3, new THREE.MeshStandardMaterial({ map: TEX.label('IMPRESIONES', '#5DDADB'), emissive: '#ffffff', emissiveMap: TEX.label('IMPRESIONES', '#5DDADB'), emissiveIntensity: 1.2, transparent: true }), g);
    sub.position.set(0.4, 1.95, -D / 2 + 0.02);
    const win = plane(D * 0.7, 2.2, M.glass('#9fd4ff', 0.25), g); win.position.set(-W / 2 + 0.02, 1.3, 0.3); win.rotation.y = Math.PI / 2;
    const street = plane(D * 0.7, 2.2, std('#0b1438', 1, 0, { emissive: '#22306e', emissiveIntensity: 0.7 }), g); street.position.set(-W / 2 + 0.005, 1.3, 0.3); street.rotation.y = Math.PI / 2;
    box(1.8, 0.95, 0.6, std('#ffffff', 0.6, 0, { map: TEX.wood([2, 1], '#3b2a1c') }), W / 2 - 1.2, 0.475, -D / 2 + 0.6, g);
    const p = new THREE.PointLight('#F78EB6', 3, 6, 2); p.position.set(0.4, 2.2, -D / 2 + 0.6); g.add(p); room.lights.push(p);
    room.vitrinaPos = new THREE.Vector3(W / 2 - 1.2, 0.95, -D / 2 + 0.6);
  }
  if (space >= 4 && space <= 5) {
    for (let i = 0; i < 5; i++) {
      const w = plane(1.4, 0.8, std('#0b1438', 1, 0, { emissive: '#4a6fb5', emissiveIntensity: 0.45 }), g);
      w.position.set(-W / 2 + 1.2 + i * (W - 2.4) / 4, wallH - 0.8, -D / 2 + 0.01);
    }
    for (let i = 0; i < 4; i++) box(0.22, wallH, 0.22, std('#c9a227', 0.5, 0.6), -W / 2 + 0.3 + i * (W - 0.6) / 3, wallH / 2, -D / 2 + 0.12, g);
    box(W, 0.3, 0.25, std('#c9a227', 0.5, 0.6), 0, wallH - 0.2, -D / 2 + 0.6, g);
    const lineMat = std('#f2c94c', 0.6, 0);
    const lw = L.cols * SX + 0.4, ld = L.rows * SZ + 0.4;
    for (const z of [-1, 1]) { const l = plane(lw, 0.08, lineMat, g); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.003, z * ld / 2 - 0.1); }
    for (const x of [-1, 1]) { const l = plane(0.08, ld, lineMat, g); l.rotation.x = -Math.PI / 2; l.position.set(x * lw / 2, 0.003, -0.1); }
    const rows = space === 5 ? 3 : 2;
    for (let r = 0; r < rows; r++) for (let i = 0; i < 4; i++) {
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24).rotateX(Math.PI / 2), emissive('#f4f8ff', 1.1)); lamp.position.set(-W / 2 + 1.5 + i * (W - 3) / 3, wallH - 0.4, -D / 2 + 1.5 + r * (D - 3) / Math.max(1, rows - 1)); g.add(lamp);
    }
    const label = space === 5 ? 'NAVE 3DBAT' : 'TALLER 3DBAT';
    const neon = plane(3.6, 0.6, new THREE.MeshStandardMaterial({ map: TEX.label(label, '#5DDADB'), emissive: '#ffffff', emissiveMap: TEX.label(label, '#5DDADB'), emissiveIntensity: 1.6, transparent: true }), g);
    neon.position.set(0.6, wallH - 1.7, -D / 2 + 0.03);
  }
  if (space === 6) {
    const neon = plane(4.4, 0.9, new THREE.MeshStandardMaterial({ map: TEX.label('PLANTA 3DBAT', '#F78EB6'), emissive: '#ffffff', emissiveMap: TEX.label('PLANTA 3DBAT', '#F78EB6'), emissiveIntensity: 1.7, transparent: true }), g);
    neon.position.set(0.5, wallH - 1.2, -D / 2 + 0.03);
    const glassWall = plane(D * 0.8, 2.6, M.glass('#7fb6e8', 0.14), g); glassWall.position.set(-W / 2 + 0.05, 1.3, 0); glassWall.rotation.y = Math.PI / 2;
    // Cinta transportadora con cajas
    const belt = new THREE.Group(); belt.position.set(0, 0, -D / 2 + 0.55); g.add(belt);
    box(W - 1.2, 0.08, 0.5, std('#1d1f24', 0.6, 0.3), 0, 0.72, 0, belt);
    for (const x of [-1, 1]) for (let i = 0; i < 6; i++) box(0.05, 0.7, 0.05, std('#8c95a5', 0.4, 0.7), x * 0.2 - (W - 1.4) / 2 + i * (W - 1.4) / 5, 0.35, 0, belt);
    const boxes = [];
    for (let i = 0; i < 7; i++) { const b = box(0.3, 0.22, 0.3, std('#c49a6c', 0.85, 0), 0, 0.87, 0, belt); boxes.push(b); }
    room.updaters.push((t) => { boxes.forEach((b, i) => { const span = W - 1.6; b.position.x = ((t * 0.25 + i / boxes.length) % 1) * span - span / 2; }); });
    for (let i = 0; i < 5; i++) for (let r = 0; r < 2; r++) { const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2).rotateX(Math.PI / 2), emissive('#dfe8ff', 1.1)); lamp.position.set(-W / 2 + 1.6 + i * (W - 3.2) / 4, wallH - 0.2, -D / 4 + r * D / 2); g.add(lamp); }
  }
  room.setLed = (color) => led.emissive.set(color);
  room.setVitrina = (list) => {
    if (!room.vitrinaPos) return;
    const key = list.map((v) => v.p).join(',');
    if (room.vitKey === key) return;
    room.vitKey = key;
    if (room.vitGroup) g.remove(room.vitGroup);
    const vg = new THREE.Group(); vg.position.copy(room.vitrinaPos);
    list.slice(-6).forEach((v, i) => { const pc = buildPiece(v.p); pc.group.scale.setScalar(0.22); pc.group.position.set(-0.7 + i * 0.28, 0, 0); vg.add(pc.group); });
    room.vitGroup = vg; g.add(vg);
  };
  return room;
}
