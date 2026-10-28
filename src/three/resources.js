// Cached resources belong to the module, not to an individual room/thumbnail.
const shared = new WeakSet();
export function keepResource(resource) { if (resource) shared.add(resource); return resource; }
export function keepObject(root) {
  root.traverse((node) => {
    keepResource(node.geometry);
    const mats = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    for (const mat of mats) { keepResource(mat); for (const value of Object.values(mat)) if (value?.isTexture) keepResource(value); }
  });
  return root;
}
export function disposeObject(root) {
  if (!root) return;
  root.parent?.remove(root);
  const seen = new Set();
  const free = (resource) => {
    if (!resource || shared.has(resource) || seen.has(resource)) return;
    seen.add(resource); resource.dispose?.();
  };
  root.traverse((node) => {
    node.userData.disposed = true;
    free(node.geometry);
    free(node.skeleton?.boneTexture);
    const mats = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    for (const mat of mats) {
      if (shared.has(mat)) continue;
      for (const value of Object.values(mat)) if (value?.isTexture) free(value);
      free(mat);
    }
  });
}
export function disposeComposer(composer) {
  if (!composer) return;
  for (const pass of composer.passes) pass.dispose?.();
  composer.dispose();
}
