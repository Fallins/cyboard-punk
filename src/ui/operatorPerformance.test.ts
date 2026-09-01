import { describe, expect, it } from 'vitest';
import { OperatorPerformanceGovernor } from './operatorPerformance';

function sample(governor: OperatorPerformanceGovernor, renderMs: number) {
  let changed = false;
  for (let index = 0; index < 60; index += 1) {
    changed = governor.recordRender(renderMs) || changed;
  }
  return changed;
}

describe('OperatorPerformanceGovernor', () => {
  it('starts at the 30 FPS Retina-capped high profile', () => {
    const governor = new OperatorPerformanceGovernor();
    expect(governor.profile().level).toBe('high');
    expect(governor.profile().pixelRatioCap).toBe(1.5);
    expect(governor.profile().targetFrameMs).toBeCloseTo(1000 / 30);
  });

  it('drops DPR before reducing target FPS', () => {
    const governor = new OperatorPerformanceGovernor();
    expect(sample(governor, 14)).toBe(true);
    expect(governor.profile().level).toBe('balanced');
    expect(governor.profile().pixelRatioCap).toBe(1);
    expect(governor.profile().targetFrameMs).toBeCloseTo(1000 / 30);

    expect(sample(governor, 24)).toBe(true);
    expect(governor.profile().level).toBe('low');
    expect(governor.profile().targetFrameMs).toBeCloseTo(1000 / 20);
  });

  it('recovers quality conservatively after sustained cheap renders', () => {
    const governor = new OperatorPerformanceGovernor();
    sample(governor, 14);
    sample(governor, 24);
    expect(governor.profile().level).toBe('low');

    sample(governor, 8);
    expect(governor.profile().level).toBe('balanced');
    sample(governor, 5);
    expect(governor.profile().level).toBe('high');
  });

  it('ignores invalid samples', () => {
    const governor = new OperatorPerformanceGovernor();
    expect(governor.recordRender(Number.NaN)).toBe(false);
    expect(governor.recordRender(-1)).toBe(false);
    expect(governor.profile().level).toBe('high');
  });
});
