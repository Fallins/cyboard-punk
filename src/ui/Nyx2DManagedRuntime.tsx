import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { resolveNyx2DLifecycle } from './nyx2dLifecycle';
import Nyx2DWebGL from './Nyx2DWebGL';
import type { OperatorRuntimeState } from './operatorRuntime';

interface Nyx2DManagedRuntimeProps {
  state: OperatorRuntimeState;
  active: boolean;
  reducedMotion: boolean;
  onUnavailable: (reason: string) => void;
}

export default function Nyx2DManagedRuntime(props: Nyx2DManagedRuntimeProps) {
  let anchor!: HTMLSpanElement;
  const [intersecting, setIntersecting] = createSignal(true);
  const [documentVisible, setDocumentVisible] = createSignal(
    typeof document === 'undefined' ? true : !document.hidden,
  );

  const lifecycle = () =>
    resolveNyx2DLifecycle({
      ready: true,
      active: props.active,
      intersecting: intersecting(),
      documentVisible: documentVisible(),
      reducedMotion: props.reducedMotion,
      state: props.state,
      hasAnimatedChannels: true,
    });

  const effectiveActive = () => lifecycle().mode !== 'suspended' && lifecycle().mode !== 'loading';

  onMount(() => {
    const stage = anchor.closest<HTMLElement>('.operator-stage');
    const syncDocumentVisibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', syncDocumentVisibility);

    const observer =
      typeof IntersectionObserver === 'undefined' || !stage
        ? null
        : new IntersectionObserver(
            (entries) => setIntersecting(entries[0]?.isIntersecting ?? true),
            { threshold: 0.01 },
          );
    observer?.observe(stage!);

    onCleanup(() => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncDocumentVisibility);
      if (stage) {
        delete stage.dataset.nyx2dLifecycle;
        delete stage.dataset.nyx2dLifecycleReason;
        delete stage.dataset.nyx2dClockPolicy;
      }
    });
  });

  createEffect(() => {
    const stage = anchor?.closest<HTMLElement>('.operator-stage');
    if (!stage) return;
    const decision = lifecycle();
    stage.dataset.nyx2dLifecycle = decision.mode;
    stage.dataset.nyx2dLifecycleReason = decision.reason;
    stage.dataset.nyx2dClockPolicy = 'restart-on-resume';
  });

  return (
    <>
      <span ref={anchor} hidden aria-hidden="true" />
      <div class="nyx-2d-state-shell" aria-hidden="true">
        <Nyx2DWebGL
          state={props.state}
          active={effectiveActive()}
          reducedMotion={props.reducedMotion}
          onUnavailable={props.onUnavailable}
        />
      </div>
    </>
  );
}
