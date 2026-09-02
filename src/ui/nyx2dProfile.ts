export type Nyx2DRuntimeProfile = 'stable' | 'enhanced';

export interface Nyx2DProfileFeatures {
  head: boolean;
  breath: boolean;
  gaze: boolean;
  hair: boolean;
  blink: boolean;
}

export const NYX_2D_PROFILE_FEATURES: Record<Nyx2DRuntimeProfile, Nyx2DProfileFeatures> = {
  stable: {
    head: true,
    breath: true,
    gaze: false,
    hair: true,
    // Synthetic blink remains quarantined until a real eyelid source exists.
    blink: false,
  },
  enhanced: {
    head: true,
    breath: true,
    gaze: true,
    hair: true,
    blink: false,
  },
};

/**
 * Stable is the production profile. Enhanced is explicit and currently adds
 * gaze only; hair follow-through graduated into stable in 0.13.0.
 */
export function resolveNyx2DRuntimeProfile(value?: string): Nyx2DRuntimeProfile {
  return value?.trim().toLowerCase() === 'enhanced' ? 'enhanced' : 'stable';
}

export function nyx2DProfileFeatures(profile: Nyx2DRuntimeProfile): Nyx2DProfileFeatures {
  return NYX_2D_PROFILE_FEATURES[profile];
}
