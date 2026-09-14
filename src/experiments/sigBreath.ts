const SIG_BREATH_FRONT_BACK_SAMPLES = [
  [0, -0.002201551],
  [0.16666667, 0.018235808],
  [0.33333334, 0.03624173],
  [0.5, 0.051329166],
  [0.6666667, 0.06298495],
  [0.8333333, 0.07176035],
  [1, 0.077344984],
  [1.1666666, 0.07983783],
  [1.3333334, 0.07999984],
  [1.5, 0.06416382],
  [1.7, 0.02955606],
  [1.9, -0.0021543482],
  [2.1, -0.029334793],
  [2.3, -0.052486543],
  [2.5, -0.068474114],
  [2.6666667, -0.07784307],
  [2.8333333, -0.07989765],
  [3, -0.07765532],
  [3.1666667, -0.0723086],
  [3.3333333, -0.06371481],
  [3.5, -0.052151784],
  [3.6666667, -0.037557367],
  [3.8333333, -0.019835463],
  [4, -0.002201551],
] as const;

export const SIG_BREATH_EXPERIMENT = {
  sourceAsset: 'Sig_Add_Breath.anim',
  sourceArchiveSha256: 'c8776ac18091eced930e1684e2d20d14fcd8d77e96846a375958be1ef0ee5f76',
  attribution: 'Sig Breath Mod by Bekosan; VRC_Breath_Animation by Signiyamo',
  license: 'MIT License Copyright (c) 2023 Bekosan',
  durationSeconds: 4,
  sampleRate: 30,
  note: 'Source-derived experimental retarget of the Unity humanoid Spine Front-Back curve; not a byte-identical VRMA export.',
} as const;

export function sigBreathFrontBackAt(elapsedSeconds: number): number {
  const wrappedTime = ((elapsedSeconds % SIG_BREATH_EXPERIMENT.durationSeconds) + SIG_BREATH_EXPERIMENT.durationSeconds)
    % SIG_BREATH_EXPERIMENT.durationSeconds;
  const samples = SIG_BREATH_FRONT_BACK_SAMPLES;

  for (let index = 1; index < samples.length; index += 1) {
    const [endTime, endValue] = samples[index];
    if (wrappedTime > endTime) continue;
    const [startTime, startValue] = samples[index - 1];
    const progress = (wrappedTime - startTime) / (endTime - startTime);
    return startValue + (endValue - startValue) * progress;
  }

  return samples[0][1];
}
