import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cloneOperatorMaterial, configureOperatorModel } from './operatorMaterials';

describe('operator material policy', () => {
  it('keeps authored solid PBR materials opaque and depth-writing', () => {
    const source = new THREE.MeshStandardMaterial({ transparent: false, opacity: 1, depthWrite: true });
    const cloned = cloneOperatorMaterial(source) as THREE.MeshStandardMaterial;

    expect(cloned).not.toBe(source);
    expect(cloned.transparent).toBe(false);
    expect(cloned.opacity).toBe(1);
    expect(cloned.depthWrite).toBe(true);
  });

  it('preserves explicitly authored smoked-panel transparency', () => {
    const source = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.42, depthWrite: false });
    const cloned = cloneOperatorMaterial(source) as THREE.MeshStandardMaterial;

    expect(cloned.transparent).toBe(true);
    expect(cloned.opacity).toBe(0.42);
    expect(cloned.depthWrite).toBe(false);
  });

  it('boosts a real emissive map without replacing authored PBR textures', () => {
    const base = new THREE.Texture();
    const emissive = new THREE.Texture();
    const source = new THREE.MeshStandardMaterial({ map: base, emissiveMap: emissive, emissiveIntensity: 0.4 });
    const cloned = cloneOperatorMaterial(source) as THREE.MeshStandardMaterial;

    expect(cloned.map).toBe(base);
    expect(cloned.emissiveMap).toBe(emissive);
    expect(cloned.emissiveIntensity).toBe(1.15);
  });

  it('applies the policy to every mesh material without changing geometry', () => {
    const geometry = new THREE.BoxGeometry();
    const source = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, source);
    const root = new THREE.Group();
    root.add(mesh);

    configureOperatorModel(root);

    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).not.toBe(source);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(false);
  });
});
