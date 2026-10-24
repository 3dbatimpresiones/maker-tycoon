// Taller 3D: escena, cámara, luces, máquinas y selección. Lo maneja Scene3D.jsx.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildMachine } from './machines.js';
import { buildRoom, buildBench, BENCH_H } from './rooms.js';
import { MACHINES, SPACES, LED_COLORS } from '../game/data.js';
import { isMulti } from '../game/engine.js';

export function resolveQuality(q) {
  if (q && q !== 'auto') return q;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return coarse || window.innerWidth < 760 ? 'media' : 'alta';
}

export class Workshop3D {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.quality = resolveQuality(opts.quality);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality !== 'baja', powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1030');
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.8,
      minPolarAngle: 0.35, maxPolarAngle: 1.32, minAzimuthAngle: -1.05, maxAzimuthAngle: 1.05 });
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.hemi = new THREE.HemisphereLight('#c8d4ff', '#1a1f3a', 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1e0', 1.9);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.PointLight('#5DDADB', 1.4, 9, 2);
    this.scene.add(this.fill);
    this.machines = new Map(); // id -> { rig, station, bench, slot }
    this.benches = [];
    this.emptyMarks = [];
    this.space = -1;
    this.raycaster = new THREE.Raycaster();
    this.tmp = new THREE.Vector3();
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
    this.composer = null;
    if (q === 'alta') {
      const size = this.renderer.getSize(new THREE.Vector2());
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x || 800, size.y || 600), 0.5, 0.42, 0.93);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
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
    if (this.room && !this.userMoved) this.fit();
  }

  fit() {
    if (!this.room) return;
    const { layout } = this.room;
    const spanW = layout.cols * 1.2 + 0.3, spanD = layout.rows * 1.45;
    const vt = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.camera.aspect || 1.5;
    const distW = (spanW * 0.5) / (vt * Math.min(aspect, 1.9));
    const distH = (spanD * 0.55 + 0.9) / vt;
    const dist = Math.max(2.2, Math.min(Math.max(distW, distH) * 0.98, 30));
    const target = new THREE.Vector3(0, aspect < 1 ? 0.75 : 0.95, -0.05 + (layout.rows > 1 ? 0.2 : 0));
    const dirY = aspect < 1 ? 0.95 : 0.62;
    const dir = new THREE.Vector3(0.42, dirY, 1).normalize();
    this.camera.position.copy(target).addScaledVector(dir, dist);
    this.controls.target.copy(target);
    this.controls.minDistance = dist * 0.35;
    this.controls.maxDistance = dist * 1.35;
    this.controls.update();
    this.userMoved = false;
  }

  buildSpace(space) {
    if (this.room) { this.scene.remove(this.room.group); this.room.lights.forEach((l) => l.dispose?.()); }
    for (const b of this.benches) this.scene.remove(b);
    for (const m of this.emptyMarks) this.scene.remove(m);
    this.benches = []; this.emptyMarks = [];
    for (const [, e] of this.machines) this.scene.remove(e.station);
    this.machines.clear();
    const n = SPACES[space].slots;
    this.room = buildRoom(space, n);
    this.scene.add(this.room.group);
    this.space = space;
    const style = space === 0 ? 'desk' : space >= 4 ? 'steel' : 'wood';
    this.room.layout.pos.forEach((p, i) => {
      const b = buildBench(style);
      b.position.copy(p);
      b.userData.slot = i;
      this.scene.add(b);
      this.benches.push(b);
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 32), new THREE.MeshBasicMaterial({ color: '#5DDADB', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      mark.rotation.x = -Math.PI / 2; mark.position.set(p.x, BENCH_H + 0.006, p.z);
      mark.userData.slot = i;
      this.scene.add(mark);
      this.emptyMarks.push(mark);
    });
    // Luz principal cubriendo el ambiente
    const { W, D, wallH } = this.room;
    this.sun.position.set(W * 0.3, wallH + 3.5, D * 0.6);
    this.sun.target.position.set(0, 0, 0);
    const sc = this.sun.shadow.camera;
    sc.left = -W / 2 - 1; sc.right = W / 2 + 1; sc.top = D / 2 + 1; sc.bottom = -D / 2 - 1; sc.near = 0.5; sc.far = wallH + 12;
    sc.updateProjectionMatrix();
    this.fill.position.set(-W / 2 + 1, wallH - 0.6, D / 2 - 1);
    this.scene.fog = new THREE.Fog('#0b1030', Math.max(W, D) * 1.4, Math.max(W, D) * 3.5);
    this.fit();
  }

  // Sincroniza la escena con el estado del juego (barato si no cambió nada).
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
        rig.root.traverse((o) => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
        this.scene.add(station);
        e = { rig, station, model: m.model, slot: -1 };
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
    });
    for (const [id, e] of this.machines) if (!seen.has(id)) { this.scene.remove(e.station); this.machines.delete(id); }
    // Bancos: se ocultan debajo de máquinas de piso; marca de "lugar libre"
    const occupied = new Map();
    for (const [, e] of this.machines) occupied.set(e.slot, e);
    this.benches.forEach((b, i) => { const e = occupied.get(i); b.visible = !(e && e.rig.floor); });
    this.emptyMarks.forEach((mk, i) => { mk.visible = !occupied.has(i); });
    this.room.setStock(s.mat);
    this.room.setLed(LED_COLORS[s.settings.led]?.color || '#5DDADB');
    this.room.setVitrina(s.prestige.vitrina || []);
  }

  frame(s, t) {
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
      e.rig.setPiece(m.cur || null);
      e.rig.setEvent(m.event?.id || null);
      e.rig.update({ t, running: status === 'print' && !blackout, p: m.state === 'done' ? 1 : m.need ? Math.min(1, m.progress / m.need) : 0, status, blackout, anim });
    }
    for (const mk of this.emptyMarks) if (mk.visible) mk.material.opacity = 0.35 + Math.sin(t * 2.5) * 0.2;
    for (const u of this.room.updaters) u(anim === 'min' ? 0 : t);
    this.hemi.intensity = blackout ? 0.25 : 0.9;
    this.sun.intensity = blackout ? 0.35 : 1.9;
    this.fill.intensity = blackout ? 0 : 1.4;
    this.room.ledMat.emissiveIntensity = blackout ? 0 : 2.2;
    this.room.lights.forEach((l) => { l.visible = !blackout; });
    this.controls.update();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  // Coordenadas de pantalla (px dentro del canvas) del cartel de una máquina o lugar libre
  project(kind, id) {
    let obj, h;
    if (kind === 'machine') { const e = this.machines.get(id); if (!e) return null; obj = e.station; h = e.rig.height * e.scale + 0.08; }
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
          const occupied = [...this.machines.values()].some((e) => e.slot === o.userData.slot);
          return occupied ? { type: 'machine', id: [...this.machines.entries()].find(([, e]) => e.slot === o.userData.slot)[0] } : { type: 'slot', index: o.userData.slot };
        }
        o = o.parent;
      }
    }
    return null;
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
    this.composer?.dispose?.();
  }
}
