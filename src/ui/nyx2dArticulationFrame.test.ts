import { afterEach, describe, expect, it } from 'vitest';
import {
  nyx2DArticulationAnchors,
  nyx2DArticulationFrame,
  publishNyx2DArticulationAnchors,
  publishNyx2DArticulationFrame,
  resetNyx2DArticulationFrame,
} from './nyx2dArticulationFrame';

afterEach(() => resetNyx2DArticulationFrame());

describe('NYX shared articulation frame', () => {
  it('snapshots semantic poses instead of retaining a mutable caller reference', () => {
    const pose = {
      left: { shoulderDeg: -3, elbowDeg: 68 },
      right: { shoulderDeg: 0, elbowDeg: 0 },
      torsoYaw: -0.06,
      torsoShiftX: -0.0008,
      torsoLeanDeg: 0.16,
      mix: 1,
    };

    publishNyx2DArticulationFrame(pose);
    pose.left.shoulderDeg = 99;
    pose.torsoYaw = 99;

    expect(nyx2DArticulationFrame().left.shoulderDeg).toBe(-3);
    expect(nyx2DArticulationFrame().torsoYaw).toBe(-0.06);
  });

  it('snapshots exact elbow anchors for the forearm layer', () => {
    const anchors = {
      leftElbow: { x: -0.1, y: 0.12 },
      rightElbow: { x: 0.11, y: 0.13 },
    };

    publishNyx2DArticulationAnchors(anchors);
    anchors.leftElbow.x = 5;

    expect(nyx2DArticulationAnchors()).toEqual({
      leftElbow: { x: -0.1, y: 0.12 },
      rightElbow: { x: 0.11, y: 0.13 },
    });
  });

  it('clears both pose and exact anchors together', () => {
    publishNyx2DArticulationAnchors({
      leftElbow: { x: -0.1, y: 0.1 },
      rightElbow: { x: 0.1, y: 0.1 },
    });
    resetNyx2DArticulationFrame();

    expect(nyx2DArticulationAnchors()).toBeNull();
    expect(nyx2DArticulationFrame()).toEqual({
      left: { shoulderDeg: 0, elbowDeg: 0 },
      right: { shoulderDeg: 0, elbowDeg: 0 },
      torsoYaw: 0,
      torsoShiftX: 0,
      torsoLeanDeg: 0,
      mix: 0,
    });
  });
});
