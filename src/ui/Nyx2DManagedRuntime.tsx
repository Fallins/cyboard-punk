import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { resolveNyx2DLifecycle } from './nyx2dLifecycle';
import { nyx2DStateStanceTransform } from './nyx2dStatePose';
import Nyx2DWebGL from './Nyx2DWebGL';
import type { Nyx2DMotionTuning } from './nyx2dTuning';
import type { OperatorRuntimeState } from './operatorRuntime';

interface Nyx2DManagedRuntimeProps {
  state: OperatorRuntimeState;
  active: boolean;
  reducedMotion: boolean;
  tuning: Nyx2DMotionTuning;
  onUnavailable: (reason: string) => void;
}

/**
 * Lifecycle boundary around the already-approved WebGL renderer.
 *
 * Keeping offscreen/document visibility policy outside Nyx2DWebGL avoids
 * reopening the validated head/body/hair/gaze rendering code while still
 * guaranteeing that the renderer receives a clean active=false boundary during
 * suspension. Returning to animated mode therefore uses the renderer's neutral
 * restart path rather than catching up background time.
 *
 * The outer motion shell owns only a tiny whole-operator held stance. This is
 * deliberately separate from the internal 2.5D rig so semantic state posture can
 * remain readable without reopening the neck/head partition.
 */
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
  const stanceTransform = () =>
    props.reducedMotion ? 'none' : nyx2DStateStanceTransform(props.state, props.tuning.stance);

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
      <div
        class="nyx-2d-state-shell"
        data-nyx-state-stance={props.state}
        style={{ transform: stanceTransform() }}
        aria-hidden="true"
      >
        <Nyx2DWebGL
          state={props.state}
          active={effectiveActive()}
          reducedMotion={props.reducedMotion}
          breathIntensity={props.tuning.breath}
          headIntensity={props.tuning.head}
          onUnavailable={props.onUnavailable}
        />
      </div>
    </>
  );
}
