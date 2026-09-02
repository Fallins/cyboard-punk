import * as THREE from 'three';

export function cloneOperatorMaterial(source: THREE.Material): THREE.Material {
  const cloned = source.clone();

  // Preserve the authored alpha contract. Production skin, eyes, hair and suit
  // stay solid; only a material explicitly exported as transparent may blend.
  cloned.transparent = source.transparent;
  cloned.opacity = source.opacity;
  cloned.depthWrite = source.depthWrite;

  if (cloned instanceof THREE.MeshStandardMaterial) {
    cloned.envMapIntensity = Math.max(0.6, cloned.envMapIntensity);
    if (cloned.emissiveMap) cloned.emissiveIntensity = Math.max(1.15, cloned.emissiveIntensity);
  }

  return cloned;
}

export function configureOperatorModel(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    object.frustumCulled = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const cloned = materials.map(cloneOperatorMaterial);
    object.material = Array.isArray(object.material) ? cloned : cloned[0];
  });
}
