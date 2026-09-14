import type { NyxRuntimeMotionId } from '../experiments/nyxVroidExperiment';
import type { NyxVrmExpressionId } from '../experiments/nyxVrmExpressions';

/**
 * The desktop companion deliberately has a smaller, reviewed interaction pool.
 * Motions that need a large stage footprint or begin from an awkward silhouette
 * stay available in the workbench and event mapper, but are not click reactions.
 */
export const NYX_DESKTOP_INTERACTION_MOTION_IDS = [
  'greeting',
  'peaceSign',
  'spin',
  'showFullBody',
] as const satisfies readonly Exclude<NyxRuntimeMotionId, 'rest'>[];

export const NYX_DESKTOP_INTERACTION_EXPRESSION_IDS = [
  'nyxSoftSmile',
  'nyxWarmGaze',
  'nyxGentleSurprise',
] as const satisfies readonly NyxVrmExpressionId[];

export type NyxDesktopInteractionOutcome = 'motion' | 'expression' | 'disabled' | 'loading' | 'busy';

export function resolveNyxDesktopInteraction(input: {
  readonly enabled: boolean;
  readonly loaded: boolean;
  readonly reducedMotion: boolean;
  readonly actionActive: boolean;
}): NyxDesktopInteractionOutcome {
  if (!input.enabled) return 'disabled';
  if (!input.loaded) return 'loading';
  if (input.actionActive) return 'busy';
  return input.reducedMotion ? 'expression' : 'motion';
}
