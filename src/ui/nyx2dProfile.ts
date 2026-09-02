export type Nyx2DRuntimeProfile = 'stable' | 'enhanced';

export interface Nyx2DProfileFeatures {
  head: boolean;
  breath: boolean;
  gaze: boolean;
  hair: boolean;
  gestures: boolean;
  blink: boolean;
}

export const NYX_2D_PROFILE_FEATURES: Record<Nyx2DRuntimeProfile, Nyx2DProfileFeatures> = {
  stable: {
    head: true,
    breath: true,
    gaze: true,
    hair: true,
    gestures: true,
    // Blink stays gated until an approved source-overlay asset exists.
    blink: false,
  },
  enhanced: {
    // Enhanced currently mirrors the graduated stable motion channels. It remains
    // a separate telemetry/performance profile for the next experimental channel.
    head: true,
    breath: true,
    gaze: true,
    hair: true,
    gestures: true,
    blink: false,
  },
};

/**
 * Stable is the production profile. Enhanced remains explicit and may carry the
 * next experimental life-motion channel without changing stable behavior.
 */
export function resolveNyx2DRuntimeProfile(value?: string): Nyx2DRuntimeProfile {
  return value?.trim().toLowerCase() === 'enhanced' ? 'enhanced' : 'stable';
}

export function nyx2DProfileFeatures(profile: Nyx2DRuntimeProfile): Nyx2DProfileFeatures {
  return NYX_2D_PROFILE_FEATURES[profile];
}
