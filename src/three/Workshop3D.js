// Taller 3D: escena, cámara, luces, máquinas, efectos y selección. Lo maneja Scene3D.jsx.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { buildMachine } from './machines.js';
import { buildRoom, buildBench, BENCH_H, SX } from './rooms.js';
import { makeCat, animateCat, makeSobrino, SobrinoBrain } from './crew.js';
import { MACHINES, SPACES, LED_COLORS } from '../game/data.js';
import { isMulti, has } from '../game/engine.js';

// alta = "Calidad" (PC) · media = "Equilibrado" · baja = "Rendimiento" (celulares humildes)
export function resolveQuality(q) {
  if (q && q !== 'auto') return q;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return coarse || window.innerWidth < 760 ? 'media' : 'alta';
}

// Textura redonda suave para partículas
function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Sistema de partículas simple (humo, viruta, polvo)
class Particles {
  constructor(scene, max, { color, size, blending = THREE.NormalBlending, opacity = 0.6 }) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.ttl = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ color, size, map: softDot(), transparent: true, opacity, depthWrite: false, blending, sizeAttenuation: true });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  emit(p, v, ttl) {
    const i = this.n < this.max ? this.n++ : Math.floor(Math.random() * this.max);
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = 0; this.ttl[i] = ttl;
  }
  step(dt, gravity = 0, drag = 0.98) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt;
      if (this.life[i] > this.ttl[i]) { this.pos[i * 3 + 1] = -99; continue; }
      this.vel[i * 3 + 1] -= gravity * dt;
      for (let k = 0; k < 3; k++) { this.vel[i * 3 + k] *= drag; this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt; }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

export class Workshop3D {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.quality = resolveQuality(opts.quality);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === 'media', powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    RectAreaLightUniformsLib.init();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0e22');
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.03, 80);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.8,
      minPolarAngle: 0.3, maxPolarAngle: 1.36, minAzimuthAngle: -1.1, maxAzimuthAngle: 1.1 });
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    // Luces: cielo suave, sol por la ventana (sombras), luz de área de ventana, techo cálido
    this.hemi = new THREE.HemisphereLight('#dfe6ff', '#2a2420', 0.55);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3e2', 1.8);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.015;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.window = new THREE.RectAreaLight('#eaf2ff', 2.0, 2.2, 1.6);
    this.scene.add(this.window);
    this.ceiling = new THREE.PointLight('#ffe4c2', 1.6, 9, 2);
    this.scene.add(this.ceiling);
    this.fill = new THREE.PointLight('#5DDADB', 0.5, 7, 2);
    this.scene.add(this.fill);
    this.smoke = new Particles(this.scene, 500, { color: '#b9c0cc', size: 0.035, opacity: 0.35 });
    this.chips = new Particles(this.scene, 500, { color: '#c49a6c', size: 0.012, opacity: 0.95 });
    // Efectos ganados en el juego online (solo estética)
    this.confA = new Particles(this.scene, 300, { color: '#F78EB6', size: 0.03, opacity: 0.95 });
    this.confB = new Particles(this.scene, 300, { color: '#5DDADB', size: 0.03, opacity: 0.95 });
    this.sparks = new Particles(this.scene, 300, { color: '#9ff7ff', size: 0.022, blending: THREE.AdditiveBlending, opacity: 0.9 });
    this.machines = new Map();
    this.benches = [];
    this.emptyMarks = [];
    this.space = -1;
    this.raycaster = new THREE.Raycaster();
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.lastT = 0;
    this.camAnim = null;
    this.ordersSeen = null;
    this.applyQuality();
  }

  applyQuality() {
    const q = this.quality;
    const dpr = Math.min(window.devicePixelRatio || 1, q === 'alta' ? 2 : q === 'media' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q !== 'baja';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const ms = q === 'alta' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(ms, ms);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.window.visible = q !== 'baja';
    this.composer = null;
    if (q === 'alta') {
      const size = this.renderer.getSize(new THREE.Vector2());
      const w = size.x || 800, h = size.y || 600;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.gtao = new GTAOPass(this.scene, this.camera, w, h);
      this.gtao.updateGtaoMaterial({ radius: 0.25, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 12 });
      this.gtao.blendIntensity = 0.85;
      this.composer.addPass(this.gtao);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.25, 0.35, 0.985);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.composer.addPass(new SMAAPass(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio()));
    }
    this.resize();
  }
  setQuality(q) {
    const r = resolveQuality(q);
    if (r === this.quality) return;
    this.quality = r;
    this.applyQuality();
  }

  resize() {
    const el = this.canvas.parentElement;
    if (!el) return;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.room && !this.userMoved) this.fit(true);
  }

  // Encuadre de todo el taller (instantáneo o animado)
  fit(instant = false) {
    if (!this.room) return;
    const { layout } = this.room;
    const spanW = layout.cols * 1.2 + 0.3, spanD = layout.rows * 1.45;
    const vt = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.camera.aspect || 1.5;
    const distW = (spanW * 0.5) / (vt * Math.min(aspect, 1.9));
    const distH = (spanD * 0.55 + 0.9) / vt;
    const dist = Math.max(2.2, Math.min(Math.max(distW, distH) * 0.98, 30));
    const target = new THREE.Vector3(0, aspect < 1 ? 0.75 : 0.95, -0.05 + (layout.rows > 1 ? 0.2 : 0));
    const dir = new THREE.Vector3(0.42, aspect < 1 ? 0.95 : 0.62, 1).normalize();
    const pos = target.clone().addScaledVector(dir, dist);
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = dist * 1.4;
    this.focused = null;
    this.userMoved = false;
    if (instant) { this.camera.position.copy(pos); this.controls.target.copy(target); this.controls.update(); this.camAnim = null; }
    else this.animateCamera(pos, target);
  }
  animateCamera(pos, target) {
    this.camAnim = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos, t1: target, k: 0 };
  }
  // Acercarse a una máquina para inspeccionarla
  focusMachine(id) {
    const e = this.machines.get(id);
    if (!e) return false;
    const h = e.rig.height * e.scale;
    const target = new THREE.Vector3(e.station.position.x, e.station.position.y + h * 0.5, e.station.position.z);
    const dist = Math.max(0.55, h * 2.1);
    const dir = new THREE.Vector3(0.35, 0.38, 1).normalize();
    this.animateCamera(target.clone().addScaledVector(dir, dist), target);
    this.focused = id;
    this.userMoved = true;
    return true;
  }

  buildSpace(space) {
    if (this.room) this.scene.remove(this.room.group);
    for (const b of this.benches) this.scene.remove(b);
    for (const m of this.emptyMarks) this.scene.remove(m);
    this.benches = []; this.emptyMarks = [];
    for (const [, e] of this.machines) this.scene.remove(e.station);
    this.machines.clear();
    const n = SPACES[space].slots;
    this.room = buildRoom(space, n);
    this.scene.add(this.room.group);
    this.space = space;
    this.buildCrew();
    const style = space === 0 ? 'desk' : space >= 4 ? 'steel' : 'wood';
    this.room.layout.pos.forEach((p, i) => {
      const b = buildBench(style);
      b.position.copy(p);
      b.userData.slot = i;
      this.scene.add(b);
      this.benches.push(b);
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.19, 40), new THREE.MeshBasicMaterial({ color: '#5DDADB', transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      mark.rotation.x = -Math.PI / 2; mark.position.set(p.x, BENCH_H + 0.006, p.z);
      mark.userData.slot = i;
      this.scene.add(mark);
      this.emptyMarks.push(mark);
    });
    const { W, D, wallH } = this.room;
    // Sol entrando en diagonal por la ventana (pared izquierda)
    this.sun.position.set(-W * 0.6, wallH + 3, D * 0.35);
    this.sun.target.position.set(0.5, 0, -0.2);
    const sc = this.sun.shadow.camera;
    sc.left = -W / 2 - 1.5; sc.right = W / 2 + 1.5; sc.top = D / 2 + 1.5; sc.bottom = -D / 2 - 1.5; sc.near = 0.5; sc.far = W + wallH + 14;
    sc.updateProjectionMatrix();
    this.window.position.set(-W / 2 + 0.05, Math.min(1.7, wallH * 0.6), 0.2);
    this.window.lookAt(0, 0.8, 0.2);
    this.window.width = Math.min(2.6, D * 0.6); this.window.height = 1.5;
    this.ceiling.position.set(0.3, wallH - 0.3, 0.2);
    this.ceiling.distance = Math.max(W, D) * 1.6;
    this.fill.position.set(W / 2 - 0.8, wallH - 0.6, -D / 2 + 0.8);
    this.scene.fog = new THREE.Fog('#0a0e22', Math.max(W, D) * 1.6, Math.max(W, D) * 4);
    this.fit(true);
  }

  sync(s) {
    if (s.space !== this.space) this.buildSpace(s.space);
    const seen = new Set();
    s.machines.forEach((m, i) => {
      seen.add(m.id);
      let e = this.machines.get(m.id);
      if (!e || e.model !== m.model) {
        if (e) this.scene.remove(e.station);
        const rig = buildMachine(m.model);
        const station = new THREE.Group();
        station.add(rig.root);
        station.userData.mid = m.id;
        this.scene.add(station);
        e = { rig, station, model: m.model, slot: -1, scale: 1 };
        this.machines.set(m.id, e);
      }
      if (e.slot !== i) {
        e.slot = i;
        const p = this.room.layout.pos[i] || this.room.layout.pos[0];
        const onFloor = e.rig.floor;
        const maxFoot = onFloor ? 1.12 : 0.95;
        const k = Math.min(1.6, maxFoot / e.rig.footprint);
        e.rig.root.scale.setScalar(k);
        e.station.position.set(p.x, onFloor ? 0 : BENCH_H, p.z);
        e.scale = k;
      }
      e.rig.setMulti(isMulti(s, MACHINES[m.model]));
      this.setPlinth(e, s.cosmetics?.skin || null);
    });
    for (const [id, e] of this.machines) if (!seen.has(id)) { this.scene.remove(e.station); this.machines.delete(id); }
    const occupied = new Map();
    for (const [, e] of this.machines) occupied.set(e.slot, e);
    this.benches.forEach((b, i) => { const e = occupied.get(i); b.visible = !(e && e.rig.floor); });
    this.emptyMarks.forEach((mk, i) => { mk.visible = !occupied.has(i); });
    this.room.setStock(s.mat);
    this.room.setLed(LED_COLORS[s.settings.led]?.color || '#5DDADB');
    this.room.setVitrina(s.prestige.vitrina || []);
    this.room.setZones?.(s);
    this.room.setDecor?.(s.cosmetics?.decor || []);
    // Sobrino: nivel 1 retira piezas; con la expulsión automática pasa a logística (nivel 2).
    const lvl = has(s, 'sobrino') ? (has(s, 'expulsion') ? 2 : 1) : 0;
    if (lvl && !this.sobrino) {
      const g = makeSobrino();
      g.position.set(this.world.rest.x, 0, this.world.rest.z);
      this.scene.add(g);
      this.sobrino = { g, brain: new SobrinoBrain(g) };
    } else if (!lvl && this.sobrino) { this.scene.remove(this.sobrino.g); this.sobrino = null; }
    if (this.world) this.world.level = lvl;
    this.effect = s.cosmetics?.effect || null;
    // Cajas de pedidos despachados en la zona de packing
    const orders = s.stats.orders || 0;
    if (this.ordersSeen == null) { this.ordersSeen = orders; this.room.setBoxes?.(Math.min(6, orders), false); }
    else if (orders > this.ordersSeen) { this.room.addBox?.(); this.ordersSeen = orders; }
  }

  frame(s, t) {
    const dt = Math.min(0.1, Math.max(0, t - (this.lastT || t)));
    this.lastT = t;
    const blackout = s.global?.id === 'corte';
    const anim = s.settings.anim;
    for (const m of s.machines) {
      const e = this.machines.get(m.id);
      if (!e) continue;
      const paused = m.pauseUntil > s.time;
      let status = 'idle';
      if (m.waitStart) status = 'start';
      else if (m.event) status = 'event';
      else if (m.state === 'done') status = 'done';
      else if (m.state === 'nofil') status = 'nofil';
      else if (paused) status = 'pause';
      else if (m.state === 'printing') status = 'print';
      // Efectos ganados: chispas al terminar una pieza, confeti al retirarla.
      if (this.effect && e.status && e.status !== status && anim !== 'min') {
        if (this.effect === 'e_chispas' && status === 'done') this.burst(e, this.sparks, null, 26);
        if (this.effect === 'e_confeti' && e.status === 'done' && status !== 'done') this.burst(e, this.confA, this.confB, 40);
      }
      e.status = status;
      e.rig.setPiece(m.cur || null);
      e.rig.setEvent(m.event?.id || null);
      e.rig.update({ t, running: status === 'print' && !blackout, p: m.state === 'done' ? 1 : m.need ? Math.min(1, m.progress / m.need) : 0, status, blackout, anim });
      // Efectos con lógica: humo del láser y viruta de la CNC mientras trabajan
      if (e.rig.active && anim !== 'min' && this.quality !== 'baja') {
        for (const em of e.rig.emitters) {
          if (Math.random() > em.rate * dt) continue;
          em.obj.getWorldPosition(this.tmp);
          if (em.kind === 'smoke') this.smoke.emit(this.tmp, this.tmp2.set((Math.random() - 0.5) * 0.02, 0.06 + Math.random() * 0.04, (Math.random() - 0.5) * 0.02), 1.6);
          else this.chips.emit(this.tmp, this.tmp2.set((Math.random() - 0.5) * 0.5, 0.15 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5), 0.9);
        }
      }
    }
    this.confA.step(dt, 1.4, 0.97); this.confB.step(dt, 1.4, 0.97); this.sparks.step(dt, 0.6, 0.94);
    this.smoke.step(dt, -0.02, 0.985);
    this.chips.step(dt, 1.6, 0.97);
    for (const mk of this.emptyMarks) if (mk.visible) mk.material.opacity = 0.3 + Math.sin(t * 2.5) * 0.15;
    for (const u of this.room.updaters) u(anim === 'min' ? 0 : t, dt);
    // El gato del taller respira y mueve la cola; el del evento también.
    if (this.pet && anim !== 'min') animateCat(this.pet, t);
    if (anim !== 'min') for (const [, e] of this.machines) if (e.rig.fx?.cat) animateCat(e.rig.fx.cat, t * 1.3);
    if (this.sobrino && this.world) {
      this.sobrino.brain.update(dt, t, this.world, anim === 'min');
    }
    this.hemi.intensity = blackout ? 0.18 : 0.55;
    this.sun.intensity = blackout ? 0.5 : 1.8;
    this.ceiling.intensity = blackout ? 0 : 1.6;
    this.window.intensity = blackout ? 0.9 : 2.0;
    this.fill.intensity = blackout ? 0 : 0.5;
    this.room.ledMat.emissiveIntensity = blackout ? 0 : 1.1;
    this.room.lights.forEach((l) => { l.visible = !blackout; });
    if (this.camAnim) {
      const a = this.camAnim;
      a.k = Math.min(1, a.k + dt * 2.2);
      const e = a.k < 0.5 ? 2 * a.k * a.k : 1 - Math.pow(-2 * a.k + 2, 2) / 2;
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.t0, a.t1, e);
      if (a.k >= 1) this.camAnim = null;
    }
    this.controls.update();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  // Puntos del taller por donde camina el sobrino y el rincón del gato.
  buildCrew() {
    const { W, D, layout } = this.room;
    const maxZ = Math.max(...layout.pos.map((p) => p.z));
    const half = (layout.cols * SX) / 2;
    const pk = this.room.packing?.position;
    const shelf = this.room.shelf?.position;
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    this.world = {
      level: this.world?.level || 0,
      aisleZ: maxZ + 0.78,
      frontZ: maxZ + 0.58,
      sideX: half + 0.32,
      packing: pk ? V(pk.x - 0.75, pk.z) : V(half + 0.6, maxZ + 1.2),
      shelf: shelf ? V(shelf.x + 0.5, shelf.z) : V(-half - 0.6, maxZ - 0.5),
      door: V(0, Math.min(D / 2 - 0.35, maxZ + 1.7)),
      rest: pk ? V(pk.x - 0.75, pk.z - 0.2) : V(half + 0.5, maxZ + 1.0),
      doneTargets: () => {
        const out = [];
        for (const [, e] of this.machines) if (e.status === 'done') { const p = e.station.position; out.push(V(p.x, p.z + 0.58)); }
        return out;
      },
    };
    if (this.sobrino) { this.sobrino.g.position.set(this.world.rest.x, 0, this.world.rest.z); this.sobrino.brain.queue = []; }
    // Gato del taller (desde el cuarto): duerme en su almohadón en el rincón de adelante.
    if (this.pet) { this.scene.remove(this.petBase); this.pet = null; }
    if (this.space >= 1) {
      const base = new THREE.Group();
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.08, 28), new THREE.MeshStandardMaterial({ color: '#3437A2', roughness: 0.95 }));
      cushion.position.y = 0.04; cushion.receiveShadow = true; cushion.castShadow = true; base.add(cushion);
      const cat = makeCat({ lying: true });
      cat.position.y = 0.075; cat.rotation.y = -0.6; cat.scale.setScalar(1.3); base.add(cat);
      base.position.set(-W / 2 + 0.6, 0, D / 2 - 0.65);
      this.scene.add(base);
      this.pet = cat; this.petBase = base;
    }
  }

  burst(e, pa, pb, n) {
    e.station.getWorldPosition(this.tmp);
    this.tmp.y += 0.45 * e.scale;
    for (let i = 0; i < n; i++) {
      const sys = pb && i % 2 ? pb : pa;
      sys.emit(this.tmp, this.tmp2.set((Math.random() - 0.5) * 1.1, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 1.1), 1.1 + Math.random() * 0.5);
    }
  }

  // Base debajo de cada máquina (premio de "bases"): no cambia los colores reales de los equipos.
  setPlinth(e, skin) {
    if (e.plinthSkin === skin) return;
    e.plinthSkin = skin;
    if (e.plinth) { e.station.remove(e.plinth); e.plinth = null; }
    const color = { s_rosa: '#F78EB6', s_cian: '#5DDADB', s_negro: '#16181d', s_blanco: '#e9ebf0' }[skin];
    if (!color) return;
    const neon = skin === 's_rosa' || skin === 's_cian';
    const w = Math.max(0.3, e.rig.footprint * 1.08) * e.scale;
    const mat = neon ? new THREE.MeshStandardMaterial({ color: '#0d1024', emissive: color, emissiveIntensity: 1.4, roughness: 0.4 })
      : new THREE.MeshStandardMaterial({ color, roughness: skin === 's_negro' ? 0.9 : 0.35, metalness: 0 });
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, w * 0.9), mat);
    p.position.y = 0.004; p.receiveShadow = true;
    e.station.add(p);
    e.plinth = p;
  }

  // Posición de cada máquina relativa a la cámara (para el sonido espacial)
  audioPositions() {
    const out = [];
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    for (const [id, e] of this.machines) {
      this.tmp.copy(e.station.position).sub(this.camera.position);
      const dist = this.tmp.length();
      out.push({ id, model: e.model, active: e.rig.active, dist, pan: Math.max(-1, Math.min(1, this.tmp.normalize().dot(right))) });
    }
    return out;
  }

  project(kind, id) {
    let obj, h;
    if (kind === 'machine') { const e = this.machines.get(id); if (!e) return null; obj = e.station; h = e.rig.height * e.scale + 0.06; }
    else { obj = this.benches[id]; if (!obj) return null; h = BENCH_H + 0.12; }
    this.tmp.set(obj.position.x, obj.position.y + h, obj.position.z);
    this.tmp.project(this.camera);
    const w = this.canvas.clientWidth, hh = this.canvas.clientHeight;
    return { x: (this.tmp.x * 0.5 + 0.5) * w, y: (-this.tmp.y * 0.5 + 0.5) * hh, behind: this.tmp.z > 1 };
  }

  pick(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = [...[...this.machines.values()].map((e) => e.station), ...this.benches, ...this.emptyMarks.filter((m) => m.visible)];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        if (o.userData.mid != null) return { type: 'machine', id: o.userData.mid };
        if (o.userData.slot != null) {
          const entry = [...this.machines.entries()].find(([, e]) => e.slot === o.userData.slot);
          return entry ? { type: 'machine', id: entry[0] } : { type: 'slot', index: o.userData.slot };
        }
        o = o.parent;
      }
    }
    return null;
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
  }
}
