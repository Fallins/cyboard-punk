import { describe, expect, it } from 'vitest';
import { createNyx2DGazeMaterial } from './nyx2dGazeMaterial';

describe('NYX 2D gaze material safety', () => {
  it('keeps neutral gaze transparent and avoids sclera reconstruction', () => {
    const material = createNyx2DGazeMaterial();
    try {
      expect(material.uniforms.uOffset.value.x).toBe(0);
      expect(material.uniforms.uOffset.value.y).toBe(0);
      expect(material.fragmentShader).toContain('length(uOffset) <= 0.00005');
      expect(material.fragmentShader).not.toContain('scleraUv');
      expect(material.fragmentShader).not.toContain('originalMask');
    } finally {
      material.dispose();
    }
  });

  it('caps the moved iris as a low-opacity accent rather than a replacement eye layer', () => {
    const material = createNyx2DGazeMaterial();
    try {
      expect(material.fragmentShader).toContain('* 0.34');
      expect(material.fragmentShader).toContain('iris.a * movedMask * strength');
    } finally {
      material.dispose();
    }
  });
});
