import type { OperatorProviderPanel } from './operatorRuntime';

export type Nyx2DAttentionTarget = 'center' | 'codex' | 'claude' | 'cursor';

const SUPPORTED_TARGETS = new Set<Nyx2DAttentionTarget>(['codex', 'claude', 'cursor']);

function toTarget(panel?: OperatorProviderPanel): Nyx2DAttentionTarget {
  if (!panel) return 'center';
  return SUPPORTED_TARGETS.has(panel.provider as Nyx2DAttentionTarget)
    ? (panel.provider as Nyx2DAttentionTarget)
    : 'center';
}

function remainingRank(panel: OperatorProviderPanel): number {
  return panel.remainingPercent ?? Number.POSITIVE_INFINITY;
}

export function resolveNyx2DAttentionTarget(
  panels: readonly OperatorProviderPanel[],
): Nyx2DAttentionTarget {
  const warnings = panels
    .filter((panel) => panel.state === 'warning')
    .slice()
    .sort((a, b) => remainingRank(a) - remainingRank(b));
  if (warnings.length) return toTarget(warnings[0]);

  const active = panels.find((panel) => panel.state === 'active');
  if (active) return toTarget(active);

  return 'center';
}

export function nyx2DAttentionBias(target: Nyx2DAttentionTarget): {
  x: number;
  y: number;
  rotationDeg: number;
} {
  switch (target) {
    case 'codex':
      return { x: -0.0011, y: 0.00065, rotationDeg: 0.16 };
    case 'claude':
      return { x: -0.0011, y: -0.00055, rotationDeg: 0.12 };
    case 'cursor':
      return { x: 0.0011, y: 0.00065, rotationDeg: -0.16 };
    case 'center':
    default:
      return { x: 0, y: 0, rotationDeg: 0 };
  }
}
