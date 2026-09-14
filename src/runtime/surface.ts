export type AppSurface = 'main' | 'compact' | 'nyx-presence';

export function resolveAppSurface(isTauriRuntime: boolean, windowLabel?: string): AppSurface {
  if (!isTauriRuntime) return 'main';
  if (windowLabel === 'compact') return 'compact';
  if (windowLabel === 'nyx-presence') return 'nyx-presence';
  return 'main';
}
