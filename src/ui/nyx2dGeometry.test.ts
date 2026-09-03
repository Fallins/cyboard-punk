import { describe, expect, it } from 'vitest';
import { nyx2DArticulationAnchors } from './nyx2dArticulationFrame';
import {
  applyNyx2DBreathPose,
  createNyx2DBodyGeometryRig,
  nyx2DTransformBodyPoint,
  resetNyx2DBodyGeometry,
} from './nyx2dGeometry';
import { nyx2DUpperArmCalibration } from './nyx2dUpperBodyCalibration';

describe('NYX 2D torso and upper-arm geometry', () => {
  it('stays below the production vertex budget while resolving both upper arms', () => {
    const rig = createNyx2DBodyGeometryRig();
    expect(rig.geometry.getAttribute('position').count).toBe(561);
    rig.geometry.dispose();
  });

  it('weights only subsets of vertices for torso and each upper arm', () => {
    const rig = createNyx2DBodyGeometryRig();
    const torso = Array.from(rig.torsoWeights).filter((weight) => weight > 0);
    const left = Array.from(rig.leftUpperArmWeights).filter((weight) => weight > 0);
    const right = Array.from(rig.rightUpperArmWeights).filter((weight) => weight > 0);

    expect(torso.length).toBeGreaterThan(0);
    expect(torso.length).toBeLessThan(rig.torsoWeights.length);
    expect(left.length).toBeGreaterThan(0);
    expect(left.length).toBeLessThan(rig.leftUpperArmWeights.length);
    expect(right.length).toBeGreaterThan(0);
    expect(right.length).toBeLessThan(rig.rightUpperArmWeights.length);
    rig.geometry.dispose();
  });

  it('can deform and restore persistent geometry without rebuilding it', () => {
    const rig = createNyx2DBodyGeometryRig();
    const position = rig.geometry.getAttribute('position');
    const before = Array.from(position.array as ArrayLike<number>);

    applyNyx2DBreathPose(
      rig,
      { translateY: 0.002, scaleX: 1.001, scaleY: 1.003 },
      { yaw: 0.1, shiftX: 0.001, leanDeg: 0.25, leftShoulderDeg: -4, rightShoulderDeg: 5 },
    );
    const deformed = Array.from(position.array as ArrayLike<number>);
    expect(deformed).not.toEqual(before);

    resetNyx2DBodyGeometry(rig);
    expect(Array.from(position.array as ArrayLike<number>)).toEqual(before);
    rig.geometry.dispose();
  });

  it('publishes the exact transformed elbow endpoints used by the body frame', () => {
    const rig = createNyx2DBodyGeometryRig();
    const breath = { translateY: 0.008, scaleX: 1.012, scaleY: 1.02 };
    const articulation = {
      yaw: 0.11,
      shiftX: 0.0014,
      leanDeg: 0.34,
      leftShoulderDeg: -4.2,
      rightShoulderDeg: 5.4,
    };

    const neutral = nyx2DArticulationAnchors();
    expect(neutral).not.toBeNull();

    applyNyx2DBreathPose(rig, breath, articulation);
    const anchors = nyx2DArticulationAnchors();
    expect(anchors).not.toBeNull();

    const expectedLeft = nyx2DTransformBodyPoint(
      nyx2DUpperArmCalibration('left').elbow,
      breath,
      articulation,
      'left',
    );
    const expectedRight = nyx2DTransformBodyPoint(
      nyx2DUpperArmCalibration('right').elbow,
      breath,
      articulation,
      'right',
    );

    expect(anchors?.leftElbow.x).toBeCloseTo(expectedLeft.x, 8);
    expect(anchors?.leftElbow.y).toBeCloseTo(expectedLeft.y, 8);
    expect(anchors?.rightElbow.x).toBeCloseTo(expectedRight.x, 8);
    expect(anchors?.rightElbow.y).toBeCloseTo(expectedRight.y, 8);
    expect(anchors?.leftElbow.y).not.toBeCloseTo(neutral?.leftElbow.y ?? 0, 5);
    expect(anchors?.rightElbow.y).not.toBeCloseTo(neutral?.rightElbow.y ?? 0, 5);

    resetNyx2DBodyGeometry(rig);
    const reset = nyx2DArticulationAnchors();
    expect(reset?.leftElbow.x).toBeCloseTo(neutral?.leftElbow.x ?? 0, 8);
    expect(reset?.leftElbow.y).toBeCloseTo(neutral?.leftElbow.y ?? 0, 8);
    expect(reset?.rightElbow.x).toBeCloseTo(neutral?.rightElbow.x ?? 0, 8);
    expect(reset?.rightElbow.y).toBeCloseTo(neutral?.rightElbow.y ?? 0, 8);
    rig.geometry.dispose();
  });
});
