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

// Cerebro del sobrino: trabaja con "trabajos" concretos que le da el taller (world.nextJob):
//   retirar (va a la impresora, agarra la pieza, la lleva al packing) · entregar (lleva la caja
//   de un pedido a la salida) · reponer (trae bobinas de la entrada a la estantería) · esperar.
// Un trabajo es una lista de pasos { to, then(brain), wait, valid() }.
// world = { nextJob(brain), aisleZ, frontZ, sideX }
export class SobrinoBrain {
  constructor(group) { this.g = group; this.queue = []; this.job = null; this.step = null; this.wait = 0; this.holding = null; this.speed = 1.05; }
  hold(kind) { const c = this.g.userData.carry; for (const k of Object.keys(c)) c[k].visible = k === kind; this.holding = kind; }
  // Adelante del taller se camina derecho; para ir entre filas se entra por los pasillos laterales
  // (las columnas de bancos están muy juntas para pasar entre ellas).
  route(to, w) {
    const p = this.g.position;
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    const inner = (z) => z < w.frontZ - 0.05;
    const side = (x) => (x < 0 ? -w.sideX : w.sideX);
    this.queue = [];
    if (Math.hypot(to.x - p.x, to.z - p.z) < 0.05) return;
    if (inner(p.z)) this.queue.push(V(side(p.x), p.z), V(side(p.x), w.aisleZ));
    if (inner(to.z)) this.queue.push(V(side(to.x), w.aisleZ), V(side(to.x), to.z), V(to.x, to.z));
    else this.queue.push(V(to.x, to.z));
  }
  update(dt, t, w, still) {
    if (this.wait > 0) { this.wait -= dt; this.pose(t, false, still); return; }
    if (!this.step) {
      if (!this.job || !this.job.steps.length) this.job = w.nextJob(this);
      this.step = this.job?.steps.shift() || null;
      if (!this.step) { this.pose(t, false, still); return; }
      this.route(this.step.to, w);
    }
    // El trabajo dejó de tener sentido (por ejemplo, la pieza ya la retiraron): se busca otro.
    if (this.step.valid && !this.step.valid()) { this.step = null; this.job = null; this.queue = []; return; }
    const target = this.queue[0];
    if (!target) {
      this.step.then?.(this);
      if (this.step.face != null) this.g.rotation.y = this.step.face;
      this.wait = this.step.wait ?? 0.4;
      this.step = null;
      this.pose(t, false, still);
      return;
    }
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

// ---------- Gato que se sube a la impresora ----------
// Duerme en su almohadón; cuando hay evento "gato" camina hasta la máquina, salta arriba
// y se acuesta. Al resolverlo, se baja de un salto y vuelve al almohadón.
export class CatActor {
  constructor(scene, home) {
    this.g = new THREE.Group(); scene.add(this.g);
    this.lying = makeCat({ lying: true }); this.standing = makeCat({ lying: false });
    this.g.add(this.lying, this.standing);
    this.home = home.clone(); this.g.position.copy(this.home); this.g.position.y = 0.075; this.g.rotation.y = -0.6;
    this.g.scale.setScalar(1.25);
    this.state = 'sleep'; this.show('lying'); this.k = 0;
  }
  show(which) { this.lying.visible = which === 'lying'; this.standing.visible = which === 'standing'; }
  dispose(scene) { scene.remove(this.g); }
  face(dx, dz) { this.g.rotation.y = Math.atan2(-dz, dx); }
  walkTo(to, dt, speed = 1.3) {
    const p = this.g.position; const dx = to.x - p.x, dz = to.z - p.z; const d = Math.hypot(dx, dz);
    if (d < speed * dt || d < 0.01) { p.x = to.x; p.z = to.z; return true; }
    p.x += (dx / d) * speed * dt; p.z += (dz / d) * speed * dt; p.y = Math.abs(Math.sin(this.k * 14)) * 0.02; this.face(dx, dz);
    return false;
  }
  // target = { id, front: Vector3 (piso adelante del banco), top: Vector3 (donde se acuesta) } o null
  update(dt, t, target, anim) {
    this.k += dt;
    const p = this.g.position;
    if (this.state === 'sleep') {
      if (target) { this.state = 'go'; this.goal = target; this.show('standing'); p.y = 0; }
      else { if (anim) animateCat(this.lying, t); return; }
    }
    if (target && this.goal && target.id !== this.goal.id && (this.state === 'go')) this.goal = target;
    if (this.state === 'go') {
      if (!target) { this.state = 'home'; return; }
      if (this.walkTo(this.goal.front, dt)) { this.state = 'up'; this.j = 0; this.from = p.clone(); }
      if (anim) animateCat(this.standing, t * 2, 0.6);
      return;
    }
    if (this.state === 'up' || this.state === 'down') {
      const to = this.state === 'up' ? this.goal.top : this.goal.front;
      this.j = Math.min(1, this.j + dt / 0.55);
      p.lerpVectors(this.from, to, this.j);
      p.y += Math.sin(this.j * Math.PI) * 0.45;
      this.face(to.x - this.from.x || 0.001, to.z - this.from.z);
      if (this.j >= 1) {
        if (this.state === 'up') { this.state = 'on'; this.show('lying'); }
        else { this.state = 'home'; this.show('standing'); p.y = 0; }
      }
      return;
    }
    if (this.state === 'on') {
      p.copy(this.goal.top);
      if (anim) animateCat(this.lying, t);
      if (!target || target.id !== this.goal.id) { this.state = 'down'; this.j = 0; this.from = p.clone(); this.show('standing'); }
      return;
    }
    if (this.state === 'home') {
      if (target) { this.goal = target; this.state = 'go'; return; }
      if (this.walkTo(this.home, dt)) { this.state = 'sleep'; this.show('lying'); p.y = 0.075; this.g.rotation.y = -0.6; }
      if (anim) animateCat(this.standing, t * 2, 0.6);
    }
  }
}
