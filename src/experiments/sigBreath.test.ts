import { describe, expect, it } from 'vitest';
import { SIG_BREATH_EXPERIMENT, sigBreathFrontBackAt } from './sigBreath';

describe('Sig Breath experimental source curve', () => {
  it('preserves the source loop timing and provenance without claiming a VRMA export', () => {
    expect(SIG_BREATH_EXPERIMENT.sourceAsset).toBe('Sig_Add_Breath.anim');
    expect(SIG_BREATH_EXPERIMENT.durationSeconds).toBe(4);
    expect(SIG_BREATH_EXPERIMENT.sampleRate).toBe(30);
    expect(SIG_BREATH_EXPERIMENT.attribution).toContain('Signiyamo');
    expect(SIG_BREATH_EXPERIMENT.note).toContain('not a byte-identical VRMA export');
  });

  it('interpolates the 4-second source curve and loops to its opening value', () => {
    expect(sigBreathFrontBackAt(0)).toBeCloseTo(-0.002201551, 8);
    expect(sigBreathFrontBackAt(1.3333334)).toBeCloseTo(0.07999984, 8);
    expect(sigBreathFrontBackAt(2.8333333)).toBeCloseTo(-0.07989765, 8);
    expect(sigBreathFrontBackAt(4)).toBeCloseTo(sigBreathFrontBackAt(0), 8);
  });
});
