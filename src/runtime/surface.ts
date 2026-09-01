export type AppSurface = 'main' | 'compact';

export function resolveAppSurface(isTauriRuntime: boolean, windowLabel?: string): AppSurface {
  return isTauriRuntime && windowLabel === 'compact' ? 'compact' : 'main';
}
