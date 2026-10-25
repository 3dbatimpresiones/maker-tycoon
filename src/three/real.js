// Recursos realistas del taller: texturas fotográficas PBR, objetos 3D y la luz de un taller real.
// Todo es CC0 (dominio público) de Poly Haven (polyhaven.com): se puede usar libremente.
// Se carga de a poco y solo lo que necesita cada taller; en calidad «baja» no se usa nada de esto.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export const REAL = { on: true };
const BASE = `${import.meta.env.BASE_URL || './'}assets/`;

// ---------- Texturas PBR (color, relieve y rugosidad) ----------
const texLoader = new THREE.TextureLoader();
const texCache = new Map();
function tex(file, repeat, srgb) {
  const key = `${file}|${repeat[0].toFixed(2)}x${repeat[1].toFixed(2)}`;
  if (texCache.has(key)) return texCache.get(key);
  const t = texLoader.load(BASE + 'tex/' + file);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}
// Material con textura real. tint oscurece/colorea la foto (blanco = tal cual).
export function pbr(name, repeat = [1, 1], { tint = '#ffffff', metal = 0, rough = 1, normal = 1, side } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: tint, metalness: metal, roughness: rough,
    map: tex(`${name}_diff.webp`, repeat, true),
    normalMap: tex(`${name}_nor.webp`, repeat, false),
    roughnessMap: tex(`${name}_rough.webp`, repeat, false),
  });
  m.normalScale.set(normal, normal);
  if (side) m.side = side;
  return m;
}

// ---------- Objetos 3D (escala real, en metros) ----------
const gltf = new GLTFLoader();
gltf.setMeshoptDecoder(MeshoptDecoder);
const propCache = new Map();
export function loadProp(name) {
  if (!propCache.has(name)) {
    propCache.set(name, gltf.loadAsync(BASE + 'props/' + name + '.glb').then((g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return g.scene;
    }).catch(() => null));
  }
  return propCache.get(name);
}
// Pone un objeto en la escena. size: alto (o lado mayor con fit='max') deseado; si no, tamaño real.
// El objeto queda apoyado en y=0 y centrado en x/z del contenedor. onLoad(obj) se llama al aparecer.
export function placeProp(parent, name, { pos = [0, 0, 0], rotY = 0, size = null, fit = 'y', onLoad = null } = {}) {
  const holder = new THREE.Group();
  holder.position.set(pos[0], pos[1], pos[2]);
  holder.rotation.y = rotY;
  holder.userData.prop = name;
  parent.add(holder);
  loadProp(name).then((src) => {
    if (!src) return;
    const o = src.clone(true);
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    if (size) {
      const ref = fit === 'max' ? Math.max(s.x, s.y, s.z) : fit === 'x' ? s.x : fit === 'z' ? s.z : s.y;
      if (ref > 0) o.scale.multiplyScalar(size / ref);
    }
    const b2 = new THREE.Box3().setFromObject(o);
    const c = b2.getCenter(new THREE.Vector3());
    o.position.x -= c.x; o.position.z -= c.z; o.position.y -= b2.min.y;
    holder.add(o);
    onLoad?.(o, holder);
  });
  return holder;
}

// ---------- Personajes animados (Mixamo) ----------
// Devuelve { scene, clips } con una copia propia del esqueleto (se puede usar varias veces).
const skinnedCache = new Map();
export function loadCharacter(name) {
  if (!skinnedCache.has(name)) {
    skinnedCache.set(name, gltf.loadAsync(BASE + 'people/' + name + '.glb').then((g) => {
      // Las caminatas de Mixamo avanzan solas: se les saca el avance (lo mueve el juego).
      for (const c of g.animations) {
        for (const tr of c.tracks) {
          if (!/Hips\.position$/.test(tr.name)) continue;
          const v = tr.values; const x0 = v[0], z0 = v[2];
          for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
        }
      }
      return g;
    }).catch(() => null));
  }
  return skinnedCache.get(name).then((g) => {
    if (!g) return null;
    const scene = SkeletonUtils.clone(g.scene);
    scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    return { scene, clips: g.animations };
  });
}

// ---------- Luz y reflejos de un taller real (HDRI "Artist Workshop") ----------
let envP = null;
export function loadWorkshopEnv(renderer) {
  if (!envP) {
    envP = new HDRLoader().loadAsync(BASE + 'env/workshop_1k.hdr').then((t) => {
      const pm = new THREE.PMREMGenerator(renderer);
      const env = pm.fromEquirectangular(t).texture;
      t.dispose(); pm.dispose();
      return env;
    }).catch(() => null);
  }
  return envP;
}

// ---------- Bobina de filamento realista ----------
// Dos caras de plástico con agujeros (como las de 3N3 / Grilon3), cubo central y el filamento
// enrollado con sus vueltas marcadas.
let windTex = null;
function windingTexture() {
  if (windTex) return windTex;
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const x = c.getContext('2d');
  for (let i = 0; i < 64; i++) {
    const y = i * 4;
    const g = x.createLinearGradient(0, y, 0, y + 4);
    g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#5a5a5a');
    x.fillStyle = g; x.fillRect(0, y, 16, 4);
  }
  windTex = new THREE.CanvasTexture(c);
  windTex.wrapS = windTex.wrapT = THREE.RepeatWrapping;
  windTex.repeat.set(1, 1);
  return windTex;
}
let flangeGeo = null;
function flangeGeometry() {
  if (flangeGeo) return flangeGeo;
  const R = 0.1, r = 0.028;
  const shape = new THREE.Shape(); shape.absarc(0, 0, R, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); shape.holes.push(hole);
  // ventanas de la cara (se ve el filamento a través)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = new THREE.Path(); p.absarc(Math.cos(a) * 0.064, Math.sin(a) * 0.064, 0.016, 0, Math.PI * 2, true); shape.holes.push(p);
  }
  flangeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 28 });
  flangeGeo.translate(0, 0, -0.002);
  return flangeGeo;
}
const flangeMats = new Map();
export function realSpool(color, { flange = '#18191d', label = true } = {}) {
  const g = new THREE.Group();
  if (!flangeMats.has(flange)) flangeMats.set(flange, new THREE.MeshPhysicalMaterial({ color: flange, roughness: 0.42, metalness: 0, clearcoat: 0.3 }));
  const fm = flangeMats.get(flange);
  for (const z of [-0.036, 0.036]) { const f = new THREE.Mesh(flangeGeometry(), fm); f.position.z = z; g.add(f); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 24, 1, true), fm); hub.rotation.x = Math.PI / 2; g.add(hub);
  const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.068, 40, 1),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35, bumpMap: windingTexture(), bumpScale: 0.6 }));
  fil.rotation.x = Math.PI / 2; g.add(fil);
  if (label) {
    // etiqueta blanca en una cara (como las bobinas de verdad)
    const lab = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), new THREE.MeshStandardMaterial({ color: '#f2f2f0', roughness: 0.7 }));
    lab.position.set(0, 0.052, 0.0405); g.add(lab);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
