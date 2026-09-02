import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { normalizeProductionModel } from './OperatorWebGL';

describe('production operator normalization', () => {
  it('accepts valid rigs that arrive with a tiny root scale', () => {
    const root = new THREE.Group();
    root.scale.setScalar(0.01);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.017, 0.3), new THREE.MeshBasicMaterial());
    root.add(mesh);

    expect(normalizeProductionModel(root)).toBe(true);

    root.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    expect(size.y).toBeCloseTo(2.7, 5);
  });

  it('rejects an empty production scene', () => {
    expect(normalizeProductionModel(new THREE.Group())).toBe(false);
  });
});
