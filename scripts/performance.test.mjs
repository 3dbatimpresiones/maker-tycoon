import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sceneFps, startRenderLoop } from '../src/ui/renderLoop.js';
import { keepResource, keepObject, disposeObject, disposeComposer } from '../src/three/resources.js';
import { batchStatic, movingNodes } from '../src/three/batchStatic.js';

function harness(hz = 144) {
  let now = 0, id = 0, observer;
  const jobs = new Map();
  const doc = new EventTarget(); doc.visibilityState = 'visible';
  const win = new EventTarget();
  const add = (fn, delay) => { const key = ++id; jobs.set(key, { fn, at: now + delay }); return key; };
  const env = { document: doc, window: win, now: () => now,
    requestAnimationFrame: (fn) => add(() => fn(now), 1000 / hz), cancelAnimationFrame: (key) => jobs.delete(key),
    setTimeout: add, clearTimeout: (key) => jobs.delete(key),
    IntersectionObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() { observer = null; } },
  };
  const run = (ms) => {
    const until = now + ms;
    for (let i = 0; i < 10000; i++) {
      const next = [...jobs.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > until) { now = until; return; }
      now = next[1].at; jobs.delete(next[0]); next[1].fn();
    }
    throw Error('runaway scheduler');
  };
  return { env, doc, win, run, jobs, intersect: (visible) => observer?.([{ isIntersecting: visible }]) };
}

let frames = 0, pauses = 0, resumes = 0, paused = false;
const h = harness();
const stop = startRenderLoop({ element: {}, frame: () => frames++, fps: () => 30, paused: () => paused,
  onPause: () => pauses++, onResume: () => resumes++ }, h.env);
h.run(1000); assert(frames >= 24 && frames <= 31, `30 FPS cap on a 144 Hz display: ${frames}`);
const activeFrames = frames;
h.doc.visibilityState = 'hidden'; h.doc.dispatchEvent(new Event('visibilitychange'));
assert.equal(h.jobs.size, 0, 'no frame OR timeout left in a hidden tab');
h.run(10000); assert.equal(frames, activeFrames);
h.doc.visibilityState = 'visible'; h.doc.dispatchEvent(new Event('visibilitychange')); h.run(100);
assert(frames > activeFrames);
h.intersect(false); assert.equal(h.jobs.size, 0, 'offscreen workshop stops scheduling');
const offscreenFrames = frames; h.run(1000); assert.equal(frames, offscreenFrames);
h.intersect(true); h.run(100); assert(frames > offscreenFrames);
paused = true; h.win.dispatchEvent(new Event('mt-scene-pause')); assert.equal(h.jobs.size, 0, 'visits pause the own workshop');
paused = false; h.win.dispatchEvent(new Event('mt-scene-pause')); h.run(100);
stop(); stop(); assert.equal(h.jobs.size, 0);
h.doc.dispatchEvent(new Event('visibilitychange')); h.run(1000); assert.equal(h.jobs.size, 0, 'disposed loop cannot restart');
assert(pauses >= 3 && resumes >= 3);
assert.equal(sceneFps({ quality: 'auto' }), 30);
assert.equal(sceneFps({ quality: 'alta' }), 45);
assert.equal(sceneFps({ lite: true }), 15);
assert.equal(sceneFps({}, false), 15);
console.log(`OK visual clock: ${activeFrames} frames/second at 144 Hz; zero background/offscreen callbacks`);

const root = new THREE.Group(), scene = new THREE.Scene(); scene.add(root);
const sharedGeo = keepResource(new THREE.BoxGeometry()), sharedMat = keepResource(new THREE.MeshStandardMaterial());
const ownedGeo = new THREE.BoxGeometry(), ownedTexture = new THREE.Texture();
const ownedMat = new THREE.MeshStandardMaterial({ map: ownedTexture, emissiveMap: ownedTexture });
const counts = { geometry: 0, material: 0, texture: 0, shared: 0 };
ownedGeo.addEventListener('dispose', () => counts.geometry++);
ownedMat.addEventListener('dispose', () => counts.material++);
ownedTexture.addEventListener('dispose', () => counts.texture++);
sharedGeo.addEventListener('dispose', () => counts.shared++); sharedMat.addEventListener('dispose', () => counts.shared++);
root.add(new THREE.Mesh(ownedGeo, ownedMat), new THREE.Mesh(ownedGeo, ownedMat), new THREE.Mesh(sharedGeo, sharedMat));
disposeObject(root);
assert.equal(root.parent, null); assert.equal(root.userData.disposed, true);
assert.deepEqual(counts, { geometry: 1, material: 1, texture: 1, shared: 0 });
const cachedProp = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: new THREE.Texture() }));
let propDisposals = 0;
cachedProp.geometry.addEventListener('dispose', () => propDisposals++);
cachedProp.material.map.addEventListener('dispose', () => propDisposals++);
keepObject(cachedProp); disposeObject(cachedProp.clone()); assert.equal(propDisposals, 0, 'cached GLTF resources survive removal of a clone');
let passes = 0, targets = 0;
for (let i = 0; i < 20; i++) disposeComposer({ passes: [{ dispose() { passes++; } }, { dispose() { passes++; } }], dispose() { targets++; } });
assert.equal(passes, 40); assert.equal(targets, 20);
console.log('OK GPU ownership: owned geometry/material/texture disposed once; caches preserved; postprocessing targets released');

const machine = new THREE.Group(), head = new THREE.Group(), material = new THREE.MeshStandardMaterial();
machine.add(head); head.position.set(4, 2, 1);
for (let i = 0; i < 12; i++) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); mesh.position.x = i * 2; machine.add(mesh); }
const blade = new THREE.Mesh(new THREE.BoxGeometry(), material); blade.position.y = 3; head.add(blade);
for (let i = 0; i < 4; i++) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material); mesh.position.x = i; head.add(mesh); }
machine.updateMatrixWorld(true);
const beforeBounds = new THREE.Box3().setFromObject(machine);
const originalBladePosition = blade.position.clone();
batchStatic(machine, movingNodes({ head, fan: blade }));
machine.updateMatrixWorld(true);
const afterBounds = new THREE.Box3().setFromObject(machine);
assert(beforeBounds.min.distanceTo(afterBounds.min) < 1e-6 && beforeBounds.max.distanceTo(afterBounds.max) < 1e-6, 'batching preserves world bounds');
assert.equal(blade.parent, head); assert(blade.position.equals(originalBladePosition));
assert.equal(head.children.length, 2, 'fan remains independent of the static head enclosure');
let meshCount = 0; machine.traverse((node) => { if (node.isMesh) meshCount++; });
assert.equal(meshCount, 3, '17 meshes become 3 without flattening animated groups');
head.position.y += 1; machine.updateMatrixWorld(true);
assert.equal(blade.getWorldPosition(new THREE.Vector3()).y, 6, 'moving the head still moves its fan');
console.log('OK batching: 17 opaque meshes -> 3; bounds, hierarchy and moving parts preserved');
