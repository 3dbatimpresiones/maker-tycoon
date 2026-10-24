// Los que viven en el taller: el gato y el sobrino ayudante.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const mat = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };

// ---------- Gato (gris con pecho blanco, para que se vea sobre camas y carcasas oscuras) ----------
// Mide ~0.45 de largo (como un gato de verdad al lado de una impresora). Mira hacia +x.
export function makeCat({ lying = true, fur = '#7b7f8a', stripe = '#55585f' } = {}) {
  const g = new THREE.Group();
  const furM = mat(fur), white = mat('#eceae4'), dark = mat(stripe), pink = mat('#f2a3b4', 0.7);
  const body = mesh(new THREE.SphereGeometry(0.1, 20, 14), furM, g, 0, lying ? 0.07 : 0.1, 0);
  body.scale.set(1.7, lying ? 0.75 : 1, 1);
  for (const x of [-0.08, 0, 0.08]) { const s = mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 16, Math.PI), dark, g, x, lying ? 0.075 : 0.1, 0); s.rotation.y = Math.PI / 2; s.scale.set(1, lying ? 0.75 : 1, 1); }
  const chest = mesh(new THREE.SphereGeometry(0.06, 14, 10), white, g, 0.12, lying ? 0.06 : 0.1, 0); chest.scale.set(0.8, 0.9, 1);
  const head = new THREE.Group(); head.position.set(0.19, lying ? 0.1 : 0.2, 0); g.add(head);
  mesh(new THREE.SphereGeometry(0.065, 18, 14), furM, head);
  const muzzle = mesh(new THREE.SphereGeometry(0.032, 12, 10), white, head, 0.045, -0.018, 0); muzzle.scale.set(0.9, 0.7, 1.2);
  mesh(new THREE.SphereGeometry(0.008, 8, 6), pink, head, 0.074, -0.008, 0);
  for (const z of [-0.035, 0.035]) {
    const ear = mesh(new THREE.ConeGeometry(0.026, 0.055, 4), furM, head, 0.0, 0.065, z); ear.rotation.x = z > 0 ? -0.25 : 0.25;
    mesh(new THREE.ConeGeometry(0.014, 0.03, 4), pink, head, 0.008, 0.062, z * 0.95).rotation.x = z > 0 ? -0.25 : 0.25;
    const eye = mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffb703', emissiveIntensity: 0.6, roughness: 0.2 }), head, 0.055, 0.012, z * 0.7);
    eye.scale.set(0.6, lying ? 0.35 : 1, 1); // dormido: ojitos entrecerrados
  }
  for (const [x, z] of (lying ? [[0.17, -0.05], [0.17, 0.05]] : [[0.12, -0.05], [0.12, 0.05], [-0.1, -0.06], [-0.1, 0.06]])) {
    const paw = mesh(new THREE.CylinderGeometry(0.018, 0.02, lying ? 0.03 : 0.1, 10), white, g, x, lying ? 0.015 : 0.05, z);
    if (lying) paw.rotation.z = Math.PI / 2;
  }
  // Cola: segmentos que se mueven con wag()
  const tail = new THREE.Group(); tail.position.set(-0.16, lying ? 0.05 : 0.08, 0); g.add(tail);
  let prev = tail;
  const segs = [];
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group(); seg.position.set(i === 0 ? 0 : -0.04, 0, 0); prev.add(seg);
    mesh(new THREE.SphereGeometry(0.016 - i * 0.0012, 8, 6), i === 5 ? dark : furM, seg).scale.set(1.6, 1, 1);
    segs.push(seg); prev = seg;
  }
  g.userData = { body, head, segs, lying };
  return g;
}

// Respira y mueve la cola (y la cabeza de vez en cuando).
export function animateCat(cat, t, k = 1) {
  const u = cat.userData;
  if (!u.segs) return;
  u.body.scale.y = (u.lying ? 0.75 : 1) * (1 + Math.sin(t * 1.8) * 0.035 * k);
  u.segs.forEach((s, i) => { s.rotation.y = Math.sin(t * 2.2 - i * 0.6) * 0.32 * k; s.rotation.z = (u.lying ? 0.05 : 0.35) * (i ? 1 : 0); });
  u.head.rotation.y = Math.sin(t * 0.35) * 0.35 * k;
}

// ---------- Sobrino ayudante ----------
// Persona low-poly (~1,55 de alto), remera rosa 3DBAT y gorra cian. Camina por el pasillo de adelante.
export function makeSobrino() {
  const g = new THREE.Group();
  const skin = mat('#e2b48e', 0.7), shirt = mat('#F78EB6', 0.75), jeans = mat('#2f4a7a', 0.85), shoes = mat('#f2f2f2', 0.6), cap = mat('#5DDADB', 0.6), hair = mat('#2b1d14', 0.9);
  const legs = [];
  for (const z of [-0.08, 0.08]) {
    const hip = new THREE.Group(); hip.position.set(0, 0.78, z); g.add(hip);
    mesh(new RoundedBoxGeometry(0.13, 0.74, 0.13, 2, 0.04), jeans, hip, 0, -0.37, 0);
    mesh(new RoundedBoxGeometry(0.2, 0.08, 0.12, 2, 0.03), shoes, hip, 0.04, -0.74, 0);
    legs.push(hip);
  }
  mesh(new RoundedBoxGeometry(0.26, 0.56, 0.38, 3, 0.07), shirt, g, 0, 1.06, 0);
  // logo en la remera
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ color: '#131D47' }));
  logo.position.set(0.131, 1.14, 0); logo.rotation.y = Math.PI / 2; g.add(logo);
  const arms = [];
  for (const z of [-0.23, 0.23]) {
    const sh = new THREE.Group(); sh.position.set(0, 1.3, z); g.add(sh);
    mesh(new RoundedBoxGeometry(0.1, 0.24, 0.1, 2, 0.04), shirt, sh, 0, -0.1, 0);
    mesh(new RoundedBoxGeometry(0.085, 0.36, 0.085, 2, 0.035), skin, sh, 0, -0.36, 0);
    arms.push(sh);
  }
  const head = new THREE.Group(); head.position.set(0, 1.47, 0); g.add(head);
  mesh(new THREE.SphereGeometry(0.12, 20, 16), skin, head);
  const hr = mesh(new THREE.SphereGeometry(0.125, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.2), hair, head, -0.01, 0.01, 0);
  hr.rotation.z = 0.15;
  const capTop = mesh(new THREE.SphereGeometry(0.128, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), cap, head, 0, 0.03, 0); capTop.scale.y = 0.9;
  mesh(new RoundedBoxGeometry(0.16, 0.02, 0.2, 2, 0.008), cap, head, 0.13, 0.04, 0);
  for (const z of [-0.045, 0.045]) mesh(new THREE.SphereGeometry(0.016, 8, 6), mat('#1b1b1f', 0.3), head, 0.11, 0.0, z);
  // Lo que lleva en las manos (pieza, bobina o caja)
  const hands = new THREE.Group(); hands.position.set(0.24, 0.98, 0); g.add(hands);
  const carry = {
    box: mesh(new RoundedBoxGeometry(0.26, 0.2, 0.3, 2, 0.02), mat('#c9a46a', 0.9), hands),
    spool: (() => { const s = new THREE.Group(); hands.add(s); const sm = mat('#5DDADB', 0.6); mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 24), sm, s).rotation.z = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.012, 24), mat('#1d1f24', 0.5), s, 0.04, 0, 0).rotation.z = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.012, 24), mat('#1d1f24', 0.5), s, -0.04, 0, 0).rotation.z = Math.PI / 2; return s; })(),
    piece: mesh(new RoundedBoxGeometry(0.12, 0.08, 0.12, 2, 0.02), mat('#F78EB6', 0.5), hands),
  };
  Object.values(carry).forEach((o) => { o.visible = false; });
  g.userData = { legs, arms, head, carry, hands };
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Máquina de estados del sobrino.
// world = { level, packing, shelf, door, rest, doneTargets(), aisleZ, frontZ, sideX }
//   aisleZ: pasillo de adelante · frontZ: donde se para frente a la primera fila
//   sideX: pasillos laterales (las columnas de bancos están muy juntas para pasar entre ellas)
export class SobrinoBrain {
  constructor(group) {
    this.g = group; this.queue = []; this.wait = 0; this.holding = null; this.phase = 0; this.speed = 0.95;
  }
  hold(kind) { const c = this.g.userData.carry; for (const k of Object.keys(c)) c[k].visible = k === kind; this.holding = kind; }
  // Camino sin atravesar bancos: sale al pasillo de adelante (por un costado si está entre filas),
  // camina por el pasillo y entra (por un costado si el destino está entre filas de atrás).
  route(to, w) {
    const p = this.g.position;
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    const inner = (z) => z < w.frontZ - 0.05;
    const side = (x) => (x < 0 ? -w.sideX : w.sideX);
    if (inner(p.z)) this.queue.push(V(side(p.x), p.z), V(side(p.x), w.aisleZ));
    else this.queue.push(V(p.x, w.aisleZ));
    if (inner(to.z)) this.queue.push(V(side(to.x), w.aisleZ), V(side(to.x), to.z), V(to.x, to.z));
    else this.queue.push(V(to.x, w.aisleZ), V(to.x, to.z));
  }
  plan(w) {
    if (w.level >= 2) {
      // Logística: busca bobinas en la estantería, arma la caja en el packing y la despacha.
      const step = this.phase++ % 3;
      if (step === 0) { this.route(w.shelf, w); this.after = () => this.hold('spool'); }
      else if (step === 1) { this.route(w.packing, w); this.after = () => this.hold('box'); }
      else { this.route(w.door, w); this.after = () => this.hold(null); }
      return;
    }
    const t = w.doneTargets();
    if (this.holding === 'piece') { this.route(w.packing, w); this.after = () => this.hold(null); return; }
    if (t.length) {
      const p = this.g.position;
      t.sort((a, b) => a.distanceTo(p) - b.distanceTo(p));
      this.route(t[0], w); this.after = () => this.hold('piece');
      return;
    }
    // Nada para retirar: espera cerca del packing mirando el taller.
    this.route(w.rest, w); this.after = null; this.wait = 2.5;
  }
  update(dt, t, w, still) {
    const u = this.g.userData;
    if (!this.queue.length) {
      if (this.wait > 0) { this.wait -= dt; this.pose(t, false, still); return; }
      if (this.after) { this.after(); this.after = null; this.wait = 0.7; this.pose(t, false, still); return; }
      this.plan(w);
    }
    const target = this.queue[0];
    if (!target) { this.pose(t, false, still); return; }
    const p = this.g.position;
    const dx = target.x - p.x, dz = target.z - p.z;
    const dist = Math.hypot(dx, dz);
    const stepLen = this.speed * dt;
    if (dist <= stepLen || dist < 0.01) { p.x = target.x; p.z = target.z; this.queue.shift(); }
    else {
      p.x += (dx / dist) * stepLen; p.z += (dz / dist) * stepLen;
      const want = Math.atan2(-dz, dx);
      let d = want - this.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.g.rotation.y += d * Math.min(1, dt * 10);
    }
    this.pose(t, true, still);
    u.carry && (u.hands.visible = true);
  }
  pose(t, walking, still) {
    const u = this.g.userData;
    const sw = walking && !still ? Math.sin(t * 9) * 0.5 : 0;
    u.legs[0].rotation.z = sw; u.legs[1].rotation.z = -sw;
    const carrying = !!this.holding;
    u.arms.forEach((a, i) => { a.rotation.z = carrying ? 1.15 : (i ? sw : -sw) * 0.8; });
    this.g.position.y = walking && !still ? Math.abs(Math.sin(t * 9)) * 0.025 : 0;
    u.head.rotation.y = walking ? 0 : Math.sin(t * 0.8) * 0.4;
  }
}
