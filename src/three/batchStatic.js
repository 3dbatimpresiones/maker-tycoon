import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Merge only opaque sibling meshes with identical render state. Moving parts keep
// their own Object3D, and moving groups keep their hierarchy and local transforms.
export function batchStatic(root, protectedNodes = new Set()) {
  root.traverse((parent) => {
    const groups = new Map();
    for (const mesh of [...parent.children]) {
      if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.children.length || protectedNodes.has(mesh) || !mesh.visible || Array.isArray(mesh.material)) continue;
      if (mesh.material.transparent || mesh.geometry.morphAttributes.position) continue;
      const geometry = mesh.geometry;
      const attributes = Object.entries(geometry.attributes).map(([name, attr]) => `${name}:${attr.itemSize}:${attr.normalized}:${attr.array.constructor.name}`).sort().join(',');
      const key = `${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${mesh.renderOrder}:${mesh.layers.mask}:${!!geometry.index}:${attributes}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(mesh);
    }
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue;
      const clones = meshes.map((mesh) => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      let geometry;
      try { geometry = mergeGeometries(clones, false); } finally { clones.forEach((clone) => clone.dispose()); }
      if (!geometry) continue;
      const first = meshes[0], merged = new THREE.Mesh(geometry, first.material);
      merged.castShadow = first.castShadow; merged.receiveShadow = first.receiveShadow;
      merged.renderOrder = first.renderOrder; merged.layers.mask = first.layers.mask;
      merged.name = 'static-batch';
      meshes.forEach((mesh) => parent.remove(mesh));
      parent.add(merged);
    }
  });
  return root;
}

export function movingNodes(...values) {
  const nodes = new Set(), seen = new Set();
  const collect = (value) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (value.isObject3D) { nodes.add(value); return; }
    if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) Object.values(value).forEach(collect);
  };
  values.forEach(collect);
  return nodes;
}
