export type Nyx2DRuntimeProfile = 'stable' | 'enhanced';

export interface Nyx2DProfileFeatures {
  head: boolean;
  breath: boolean;
  gaze: boolean;
  hair: boolean;
  articulatedArms: boolean;
  torsoArticulation: boolean;
  blink: boolean;
}

export const NYX_2D_PROFILE_FEATURES: Record<Nyx2DRuntimeProfile, Nyx2DProfileFeatures> = {
  stable: {
    head: true,
    breath: true,
    gaze: true,
    hair: true,
    articulatedArms: true,
    torsoArticulation: true,
    // Blink stays gated until an approved source-overlay asset exists.
    blink: false,
  },
  enhanced: {
    // Enhanced currently mirrors stable. It remains a separate telemetry budget
    // for future source-safe channels without changing production behavior.
    head: true,
    breath: true,
    gaze: true,
    hair: true,
    articulatedArms: true,
    torsoArticulation: true,
    blink: false,
  },
};

export function resolveNyx2DRuntimeProfile(value?: string): Nyx2DRuntimeProfile {
  return value?.trim().toLowerCase() === 'enhanced' ? 'enhanced' : 'stable';
}

export function nyx2DProfileFeatures(profile: Nyx2DRuntimeProfile): Nyx2DProfileFeatures {
  return NYX_2D_PROFILE_FEATURES[profile];
}
