// Ambientación de cada piso de la Nave de producción y de la Planta 3DBAT.
// Al cambiar de piso tiene que sentirse otra fábrica: luces, paredes, objetos y carteles propios.
import * as THREE from 'three';
import { std, TEX, M } from './materials.js';
import { REAL, pbr, placeProp, realSpool } from './real.js';

export const FLOOR_THEME = {
  fdm: { led: '#5DDADB', accent: '#8b5cf6', wall: '#7d86c8', title: 'FDM LAB', color: '#5DDADB' },
  resin: { led: '#a855f7', accent: '#7c3aed', wall: '#4a4366', title: 'RESIN LAB', color: '#c084fc' },
  laser: { led: '#ef4444', accent: '#f59e0b', wall: '#8a8f99', title: 'LASER WORKSHOP', color: '#f87171' },
  cnc: { led: '#fb923c', accent: '#f8fafc', wall: '#9c8f80', title: 'CNC FACTORY', color: '#fdba74' },
};

function box(w, h, d, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m);
  return m;
}
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m);
  return m;
}
const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: '#000', emissive: c, emissiveIntensity: i });
// Cartel de seguridad (triángulo amarillo + texto)
function safetySign(text, parent, x, y, z, rotY = 0) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 320;
  const g = cv.getContext('2d');
  g.fillStyle = '#f7d038'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#111'; g.beginPath(); g.moveTo(128, 24); g.lineTo(226, 190); g.lineTo(30, 190); g.closePath(); g.fill();
  g.fillStyle = '#f7d038'; g.beginPath(); g.moveTo(128, 60); g.lineTo(196, 174); g.lineTo(60, 174); g.closePath(); g.fill();
  g.fillStyle = '#111'; g.font = '900 72px Arial'; g.textAlign = 'center'; g.fillText('!', 128, 166);
  g.font = '800 26px Arial'; text.split('\n').forEach((l, i) => g.fillText(l, 128, 236 + i * 32));
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  m.position.set(x, y, z); m.rotation.y = rotY; parent.add(m);
  return m;
}
// Pantalla con la producción en curso
function screen(parent, x, y, z, w = 1.1, h = 0.62, accent = '#5DDADB') {
  box(w + 0.06, h + 0.06, 0.04, std('#0f1116', 0.4, 0.4), x, y, z - 0.02, parent, false);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.screen(accent));
  s.position.set(x, y, z + 0.002); parent.add(s);
  return s;
}
// Cartel de neón del piso
function floorNeon(parent, text, color, x, y, z, w = 3.2) {
  const tex = TEX.label(text, color);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 1.6, transparent: true }));
  m.position.set(x, y, z); parent.add(m);
  return m;
}

// room: lo que armó buildRoom (W, D, wallH, group, updaters, lights); floor: fdm | resin | laser | cnc
export function decorateFloor(room, floor, space) {
  const { W, D, wallH, group: g } = room;
  const T = FLOOR_THEME[floor];
  const bz = -D / 2, lx = -W / 2, rx = W / 2, fz = D / 2;
  const premium = space >= 6;
  const deco = new THREE.Group(); g.add(deco);
  // Cartel del piso, bajo el neón de la nave
  const fn = floorNeon(deco, `PISO ${['fdm', 'resin', 'laser', 'cnc'].indexOf(floor) + 1} · ${T.title}`, T.color, lx + 0.035, wallH - 1.5, -0.2, 3.0);
  fn.rotation.y = Math.PI / 2; // en la pared izquierda, para no pisarse con el neón de la nave
  // Luz de ambiente del color del piso
  const amb = new THREE.PointLight(T.led, premium ? 3.2 : 2.4, Math.max(W, D) * 1.1, 2); amb.position.set(0, wallH - 0.6, 0); deco.add(amb); room.lights.push(amb);
  const acc = new THREE.PointLight(T.accent, 1.6, Math.max(W, D) * 0.8, 2); acc.position.set(lx + 1.2, wallH - 1.0, bz + 1.0); deco.add(acc); room.lights.push(acc);
  // Tiras de luz en el piso, a lo largo de la pared del fondo
  box(W - 0.4, 0.02, 0.03, glow(T.led, 2.4), 0, 0.012, bz + 0.12, deco, false);

  if (floor === 'fdm') {
    // Estanterías de filamento con bobinas de colores y pantallas de producción
    const cols = ['#5DDADB', '#F78EB6', '#f8fafc', '#1f2937', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'];
    for (let k = 0; k < 2; k++) {
      const sx = lx + 1.6 + k * 1.5;
      const rack = new THREE.Group(); rack.position.set(sx, 0, bz + 0.3); deco.add(rack);
      const mt = REAL.on ? pbr('metal', [0.6, 1], { tint: '#6c7380', metal: 0.8, rough: 0.5 }) : std('#3b4150', 0.5, 0.6);
      for (let i = 0; i < 4; i++) box(1.3, 0.025, 0.36, mt, 0, 0.4 + i * 0.42, 0, rack);
      for (const x of [-0.64, 0.64]) box(0.03, 1.8, 0.36, mt, x, 0.9, 0, rack);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
        const sp = REAL.on ? realSpool(cols[(i * 6 + j + k) % cols.length], { label: false }) : new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 18), std(cols[(i * 6 + j) % cols.length], 0.5, 0));
        if (!REAL.on) sp.rotation.x = Math.PI / 2;
        sp.position.set(-0.52 + j * 0.21, 0.52 + i * 0.42, 0); rack.add(sp);
      }
    }
    screen(deco, lx + 1.6, 2.35, bz + 0.03, 1.2, 0.66, '#5DDADB');
    screen(deco, lx + 3.1, 2.35, bz + 0.03, 1.2, 0.66, '#a855f7');
    // franjas de luz violeta en el techo
    for (let i = 0; i < 3; i++) box(W * 0.8, 0.03, 0.06, glow(i % 2 ? T.accent : T.led, 2.2), 0, wallH - 0.08, bz + 1.6 + i * (D - 3) / 2, deco, false);
  }

  if (floor === 'resin') {
    // Laboratorio oscuro: luz UV, estaciones de lavado y curado, frascos y carteles de seguridad
    for (let i = 0; i < 4; i++) box(0.05, 0.03, D * 0.75, glow('#8b5cf6', 2.6), lx + 1.4 + i * (W - 2.8) / 3, wallH - 0.08, 0, deco, false);
    const uv = new THREE.PointLight('#7c3aed', 2.6, 6, 2); uv.position.set(rx - 2, 1.6, bz + 1.2); deco.add(uv); room.lights.push(uv);
    const table = new THREE.Group(); table.position.set(lx + 2.4, 0, bz + 0.45); deco.add(table);
    box(2.6, 0.05, 0.6, REAL.on ? pbr('metal', [1, 0.3], { tint: '#cfd5df', metal: 0.7, rough: 0.35 }) : std('#cfd5df', 0.35, 0.6), 0, 0.82, 0, table);
    for (const x of [-1.25, 1.25]) for (const z of [-0.26, 0.26]) box(0.04, 0.8, 0.04, std('#2b2f38', 0.4, 0.7), x, 0.4, z, table);
    for (let i = 0; i < 3; i++) { // estación de lavado/curado: base + tapa ámbar
      const st = new THREE.Group(); st.position.set(-0.85 + i * 0.85, 0.845, 0); table.add(st);
      box(0.32, 0.12, 0.32, std('#1f2228', 0.45, 0.3), 0, 0.06, 0, st);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.3, 24), M.tinted('#ff9f1c', 0.55)); lid.position.y = 0.27; st.add(lid);
      const led = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 20), glow(i === 1 ? '#7c3aed' : '#3b0764', 3)); led.position.y = 0.13; st.add(led);
    }
    for (let i = 0; i < 6; i++) cyl(0.035, 0.04, 0.16, M.tinted(['#7c2d12', '#1e293b', '#a3a3a3'][i % 3], 0.85), -1.15 + i * 0.07, 0.925, 0.2, table, 14);
    safetySign('USAR GUANTES\nY ANTEOJOS', deco, lx + 0.02, 1.65, bz + 1.4, Math.PI / 2);
    safetySign('VENTILAR\nEL ÁREA', deco, lx + 4.0, 1.65, bz + 0.03);
    if (REAL.on) placeProp(deco, 'korean_fire_extinguisher_01', { pos: [rx - 0.35, 0, bz + 0.35], size: 0.55 });
  }

  if (floor === 'laser') {
    // Taller industrial: balizas rojas/amarillas, extractores, placas de MDF y acrílico
    const duct = std('#9aa2ae', 0.35, 0.85);
    const main = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, W * 0.85, 24), duct); main.rotation.z = Math.PI / 2; main.position.set(0, wallH - 0.4, bz + 0.25); main.castShadow = true; deco.add(main);
    for (let i = 0; i < 4; i++) cyl(0.07, 0.07, wallH - 1.2, duct, lx + 1.4 + i * (W - 2.8) / 3, (wallH - 0.4 + 0.8) / 2, bz + 0.25, deco, 16);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 28), std('#2b2f38', 0.5, 0.5)); fan.rotation.x = Math.PI / 2; fan.position.set(rx - 0.6, wallH - 0.4, bz + 0.14); deco.add(fan);
    const beacons = [];
    for (let i = 0; i < 3; i++) {
      const c = i % 2 ? '#f59e0b' : '#ef4444';
      const b = cyl(0.06, 0.07, 0.12, glow(c, 3), lx + 1.6 + i * 2.2, wallH - 0.2, bz + 0.06, deco, 16);
      const L = new THREE.PointLight(c, 1.4, 4, 2); L.position.copy(b.position).add(new THREE.Vector3(0, -0.2, 0.3)); deco.add(L); room.lights.push(L);
      beacons.push([b, L, i]);
    }
    room.updaters.push((t) => { for (const [b, L, i] of beacons) { const k = (Math.sin(t * 5 + i * 2) + 1) / 2; L.intensity = 0.4 + k * 1.6; b.material.emissiveIntensity = 1 + k * 2.5; } });
    // placas de MDF y acrílico apoyadas contra la pared
    const mdf = REAL.on ? pbr('plywood', [1, 1], { tint: '#c9a27a', rough: 0.9 }) : std('#b8916a', 0.9, 0);
    for (let i = 0; i < 4; i++) { const p = box(1.0, 1.4, 0.02, mdf, lx + 1.6 + i * 0.05, 0.7, bz + 0.25 + i * 0.03, deco); p.rotation.x = -0.12; }
    const acr = ['#ef4444', '#3b82f6', '#f8fafc', '#22c55e'];
    for (let i = 0; i < 4; i++) { const p = box(0.8, 1.1, 0.012, M.tinted(acr[i], 0.55), lx + 3.0 + i * 0.05, 0.55, bz + 0.25 + i * 0.03, deco); p.rotation.x = -0.12; }
    safetySign('RADIACIÓN\nLÁSER', deco, lx + 4.4, 1.7, bz + 0.03);
    // franjas de seguridad en el piso
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 0.12), new THREE.MeshStandardMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 16; const x = c.getContext('2d'); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#111' : '#f7d038'; x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 16, 0); x.lineTo(i * 16 + 8, 16); x.lineTo(i * 16 - 8, 16); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(8, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.006, bz + 1.0); deco.add(stripe);
  }

  if (floor === 'cnc') {
    // Fábrica pesada: aspiración de polvo, viruta, paneles metálicos, luz blanca y naranja
    const dc = new THREE.Group(); dc.position.set(rx - 0.8, 0, bz + 0.7); deco.add(dc);
    cyl(0.32, 0.32, 1.2, std('#f97316', 0.45, 0.3), 0, 0.6, 0, dc, 28);
    cyl(0.34, 0.34, 0.08, std('#1d1f24', 0.5, 0.3), 0, 1.24, 0, dc, 28);
    cyl(0.3, 0.26, 0.9, std('#f1f5f9', 0.95, 0), 0, 1.73, 0, dc, 24); // bolsa del filtro
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, W * 0.6, 16), std('#2b2f38', 0.7, 0)); hose.rotation.z = Math.PI / 2; hose.position.set(rx - 0.8 - W * 0.3, wallH - 0.5, bz + 0.3); deco.add(hose);
    // viruta en el piso
    const chipMat = std('#d6b07a', 0.9, 0);
    const geo = new THREE.PlaneGeometry(0.03, 0.012);
    let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 220; i++) { const c = new THREE.Mesh(geo, chipMat); c.rotation.x = -Math.PI / 2; c.rotation.z = r() * 6; c.position.set((r() - 0.5) * (W - 2), 0.004, (r() - 0.5) * (D - 2.5)); deco.add(c); }
    // paneles metálicos en la pared
    for (let i = 0; i < 5; i++) box(1.2, 1.6, 0.02, REAL.on ? pbr('metal', [1, 1.3], { tint: '#b6bcc6', metal: 0.85, rough: 0.45 }) : std('#9aa3b0', 0.45, 0.8), lx + 1.0 + i * 1.25, 0.95, bz + 0.02, deco, false);
    for (let i = 0; i < 3; i++) box(W * 0.8, 0.03, 0.08, glow(i % 2 ? '#fb923c' : '#f8fafc', 2.2), 0, wallH - 0.08, bz + 1.6 + i * (D - 3) / 2, deco, false);
    safetySign('USAR PROTECCIÓN\nAUDITIVA', deco, lx + 0.02, 1.7, bz + 1.6, Math.PI / 2);
    if (REAL.on) placeProp(deco, 'metal_tool_chest', { pos: [rx - 2.0, 0, bz + 0.4], size: 0.95 });
  }

  if (premium) {
    // Planta 3DBAT: recepción con marca, robots, cartelería digital y zona de despacho
    const rec = new THREE.Group(); rec.position.set(lx + 1.5, 0, fz - 0.6); deco.add(rec);
    box(2.0, 1.0, 0.5, std('#131D47', 0.35, 0.3), 0, 0.5, 0, rec);
    box(2.05, 0.04, 0.55, std('#f8fafc', 0.2, 0.2), 0, 1.02, 0, rec);
    floorNeon(rec, '3DBAT', '#F78EB6', 0, 0.55, 0.26, 1.6);
    for (let i = 0; i < 2; i++) { // brazos robóticos
      const arm = new THREE.Group(); arm.position.set(rx - 0.5, 0, -0.4 + i * 1.5); deco.add(arm); // contra la pared derecha, fuera de los bancos
      cyl(0.18, 0.22, 0.25, std('#f97316', 0.4, 0.4), 0, 0.12, 0, arm, 24);
      const j1 = new THREE.Group(); j1.position.y = 0.25; arm.add(j1);
      box(0.12, 0.7, 0.12, std('#f97316', 0.4, 0.4), 0, 0.35, 0, j1);
      const j2 = new THREE.Group(); j2.position.y = 0.7; j1.add(j2);
      box(0.1, 0.55, 0.1, std('#f1f5f9', 0.35, 0.4), 0, 0.27, 0, j2);
      room.updaters.push((t) => { j1.rotation.y = Math.sin(t * 0.8 + i) * 1.2; j2.rotation.z = -0.6 + Math.sin(t * 1.3 + i) * 0.4; });
    }
    screen(deco, rx - 2.5, wallH - 1.1, bz + 0.03, 1.6, 0.9, T.color);
  }
  return deco;
}
