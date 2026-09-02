import { describe, expect, it } from 'vitest';
import { nyx2DHairConfidence, nyx2DHairZoneWeight } from './nyx2dHairLayer';
import { NYX_2D_MASTER } from './nyx2dRig';

function uvFromSource(x: number, y: number) {
  return {
    u: x / NYX_2D_MASTER.width,
    v: 1 - y / NYX_2D_MASTER.height,
  };
}

describe('NYX 2D hair overlay mask', () => {
  it('keeps the protected face center completely out of the moving overlay', () => {
    const face = uvFromSource(470, 190);
    expect(nyx2DHairZoneWeight(face.u, face.v)).toBe(0);
  });

  it('weights the outer hair silhouette more strongly than the face-side edge', () => {
    const outerLeft = uvFromSource(282, 180);
    const innerLeft = uvFromSource(334, 180);
    const outerRight = uvFromSource(653, 180);
    const innerRight = uvFromSource(592, 180);

    expect(nyx2DHairZoneWeight(outerLeft.u, outerLeft.v)).toBeGreaterThan(0.75);
    expect(nyx2DHairZoneWeight(innerLeft.u, innerLeft.v)).toBeLessThan(0.25);
    expect(nyx2DHairZoneWeight(outerRight.u, outerRight.v)).toBeGreaterThan(0.75);
    expect(nyx2DHairZoneWeight(innerRight.u, innerRight.v)).toBeLessThan(0.25);
  });

  it('weights the top crown more strongly than the forehead-side crown edge', () => {
    const crownTop = uvFromSource(470, 40);
    const crownBottom = uvFromSource(470, 84);
    expect(nyx2DHairZoneWeight(crownTop.u, crownTop.v)).toBeGreaterThan(
      nyx2DHairZoneWeight(crownBottom.u, crownBottom.v),
    );
  });

  it('accepts dark violet hair while rejecting neutral dark material', () => {
    const purpleHair = nyx2DHairConfidence(0.28, 0.10, 0.34, 1);
    const neutralBlack = nyx2DHairConfidence(0.18, 0.18, 0.18, 1);
    expect(purpleHair).toBeGreaterThan(0.1);
    expect(neutralBlack).toBeLessThan(0.01);
  });
});
