export type NyxCameraVector = readonly [number, number, number];
export const NYX_CAMERA_VIEW_VERSION = 1 as const;

export interface NyxCameraView {
  readonly version: typeof NYX_CAMERA_VIEW_VERSION;
  readonly position: NyxCameraVector;
  readonly target: NyxCameraVector;
}

const MAX_ABSOLUTE_COORDINATE = 20;
const MIN_CAMERA_DISTANCE = 1.5;
const MAX_CAMERA_DISTANCE = 8.5;
const CAMERA_EQUALITY_EPSILON = 0.0001;

function sanitizeVector(value: unknown): NyxCameraVector | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  if (
    !value.every(
      (coordinate) =>
        typeof coordinate === 'number' &&
        Number.isFinite(coordinate) &&
        Math.abs(coordinate) <= MAX_ABSOLUTE_COORDINATE,
    )
  )
    return null;
  return [value[0], value[1], value[2]];
}

export function sanitizeNyxCameraView(value: unknown): NyxCameraView | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { readonly version?: unknown; readonly position?: unknown; readonly target?: unknown };
  if (candidate.version !== NYX_CAMERA_VIEW_VERSION) return null;
  const position = sanitizeVector(candidate.position);
  const target = sanitizeVector(candidate.target);
  if (!position || !target) return null;

  const distance = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  if (distance < MIN_CAMERA_DISTANCE || distance > MAX_CAMERA_DISTANCE) return null;
  return { version: NYX_CAMERA_VIEW_VERSION, position, target };
}

export function calculateNyxCameraFitDistance(
  modelHeight: number,
  verticalFovDegrees: number,
  padding: number,
): number {
  if (
    !Number.isFinite(modelHeight) ||
    modelHeight <= 0 ||
    !Number.isFinite(verticalFovDegrees) ||
    verticalFovDegrees <= 0 ||
    verticalFovDegrees >= 180 ||
    !Number.isFinite(padding) ||
    padding < 1
  )
    return 0;
  const halfFovRadians = (verticalFovDegrees * Math.PI) / 360;
  return (modelHeight / (2 * Math.tan(halfFovRadians))) * padding;
}

export function nyxCameraViewsEqual(left: NyxCameraView | null, right: NyxCameraView | null): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  const leftCoordinates = [...left.position, ...left.target];
  const rightCoordinates = [...right.position, ...right.target];
  return leftCoordinates.every(
    (coordinate, index) => Math.abs(coordinate - rightCoordinates[index]) <= CAMERA_EQUALITY_EPSILON,
  );
}
