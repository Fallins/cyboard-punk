import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import type { OperatorMode } from '../settings/settings';
import './operator.css';

interface OperatorStageProps {
  mode: Exclude<OperatorMode, 'off'>;
  readyProviders: number;
  totalProviders: number;
  activeAgents: number;
}

export default function OperatorStage(props: OperatorStageProps) {
  const [visible, setVisible] = createSignal(true);
  const [reducedMotion, setReducedMotion] = createSignal(false);

  onMount(() => {
    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const syncMotion = () => setReducedMotion(media?.matches ?? false);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion();
    syncVisibility();
    media?.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    onCleanup(() => {
      media?.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncVisibility);
    });
  });

  createEffect(() => {
    document.documentElement.dataset.operatorMotion = visible() && !reducedMotion() ? 'active' : 'paused';
  });

  const state = () => {
    if (props.readyProviders === 0) return 'offline';
    if (props.activeAgents > 0) return 'working';
    return 'idle';
  };

  return (
    <div
      class={`operator-stage operator-stage--${props.mode} operator-stage--${state()}`}
      data-paused={!visible() || reducedMotion()}
      aria-label={`${props.mode} CYBOARD operator, ${state()}`}
    >
      <div class="operator-halo operator-halo--outer" />
      <div class="operator-halo operator-halo--inner" />
      <div class="operator-scanline" />
      <div class="operator-avatar" aria-hidden="true">
        <div class="operator-head">
          <span class="operator-visor" />
          <span class="operator-ear operator-ear--left" />
          <span class="operator-ear operator-ear--right" />
        </div>
        <div class="operator-neck" />
        <div class="operator-torso">
          <span class="operator-core-light" />
          <span class="operator-shoulder operator-shoulder--left" />
          <span class="operator-shoulder operator-shoulder--right" />
        </div>
      </div>
      <div class="operator-status">
        <span>{props.mode === 'female' ? 'NYX' : 'AXON'}</span>
        <strong>{state().toUpperCase()}</strong>
      </div>
      <p>{props.readyProviders}/{props.totalProviders} PROVIDERS READY</p>
    </div>
  );
}
