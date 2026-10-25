// Miniaturas 3D (máquinas y productos) para la tienda y los menús.
// Se generan de a una, en segundo plano, con un renderer chico aparte.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildMachine } from './machines.js';
import { buildPiece } from './pieces.js';
import { MACHINES, PRODUCTS } from '../game/data.js';

// Las miniaturas se guardan en el navegador: desde la segunda vez cargan al instante (sin dibujar de nuevo).
const STORE = 'mt3dbat.thumbs.v2';
const cache = new Map();
try { const o = JSON.parse(localStorage.getItem(STORE) || '{}'); for (const [k, v] of Object.entries(o)) if (typeof v === 'string') cache.set(k, v); } catch { /* sin almacenamiento */ }
let saveT = null;
function persist() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { const o = {}; for (const [k, v] of cache) if (v) o[k] = v; localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* lleno: no pasa nada */ }
  }, 1500);
}
const listeners = new Set();
const queue = [];
let ctx = null;
let busy = false;

const DEMO = { fdm: 'benchy', resin: 'miniatura', laser: 'cartel', cnc: 'tabla' };

function setup() {
  if (ctx) return ctx;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(192, 192, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  scene.add(new THREE.HemisphereLight('#dfe6ff', '#1a1f3a', 1.2));
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight('#F78EB6', 1.2); rim.position.set(-3, 2, -2); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  ctx = { renderer, scene, camera };
  return ctx;
}

function frameObject(camera, obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z) * 0.62;
  const dist = r / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  const dir = new THREE.Vector3(0.65, 0.45, 1).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.lookAt(center);
  camera.near = dist / 50; camera.far = dist * 5;
  camera.updateProjectionMatrix();
}

function renderOne(key) {
  const { renderer, scene, camera } = setup();
  const [kind, id] = key.split(':');
  const root = new THREE.Group();
  scene.add(root);
  let cleanup = () => {};
  if (kind === 'm') {
    const rig = buildMachine(id);
    root.add(rig.root);
    rig.setPiece(DEMO[MACHINES[id].tech]);
    rig.update({ t: 1.3, running: false, p: 0.7, status: 'print', blackout: false, anim: 'full' });
    rig.root.updateMatrixWorld(true);
    rig.update({ t: 1.3, running: false, p: 0.7, status: 'print', blackout: false, anim: 'full' });
  } else {
    const pc = buildPiece(id);
    root.add(pc.group);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.06, 40), new THREE.MeshStandardMaterial({ color: '#1a2560', roughness: 0.4, metalness: 0.3 }));
    ped.position.y = -0.03; root.add(ped);
    cleanup = () => pc.mats.forEach((m) => m.dispose());
  }
  root.updateMatrixWorld(true);
  frameObject(camera, root);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/webp', 0.86);
  scene.remove(root);
  cleanup();
  return url;
}

function pump() {
  if (busy) return;
  const key = queue.shift();
  if (!key) return;
  busy = true;
  const go = () => {
    try { if (!cache.has(key)) { cache.set(key, renderOne(key)); persist(); } } catch { cache.set(key, null); }
    listeners.forEach((fn) => fn(key));
    busy = false;
    setTimeout(pump, 40); // de a una y con respiro: no traba la página
  };
  if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 300 }); else setTimeout(go, 16);
}

export function getThumb(kind, id) {
  const key = `${kind}:${id}`;
  if (cache.has(key)) return cache.get(key);
  if (!queue.includes(key)) { queue.push(key); pump(); }
  return undefined;
}
export function onThumb(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export const thumbsSupported = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
};
