import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { resolveNyx2DLifecycle } from './nyx2dLifecycle';
import Nyx2DWebGL from './Nyx2DWebGL';
import NyxStage7ExperimentalRuntime from './NyxStage7ExperimentalRuntime';
import { resolveNyxStage7RuntimeTier } from './nyxStage7Experimental';
import type { OperatorRuntimeState } from './operatorRuntime';

interface Nyx2DManagedRuntimeProps {
  state: OperatorRuntimeState;
  active: boolean;
  reducedMotion: boolean;
  onUnavailable: (reason: string) => void;
}

export default function Nyx2DManagedRuntime(props: Nyx2DManagedRuntimeProps) {
  const configuredRuntimeTier = resolveNyxStage7RuntimeTier(
    import.meta.env.VITE_NYX_EXPERIMENTAL_RUNTIME,
  );
  let anchor!: HTMLSpanElement;
  const [intersecting, setIntersecting] = createSignal(true);
  const [documentVisible, setDocumentVisible] = createSignal(
    typeof document === 'undefined' ? true : !document.hidden,
  );
  const [experimentalFailure, setExperimentalFailure] = createSignal<string | null>(null);

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
  const usingExperimentalRuntime = () =>
    configuredRuntimeTier === 'stage7-experimental' && !experimentalFailure();

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
        delete stage.dataset.nyxExperimentalFailure;
        stage.dataset.nyxRendererTier = 'production';
      }
    });
  });

  createEffect(() => {
    const stage = anchor?.closest<HTMLElement>('.operator-stage');
    if (!stage) return;
    const decision = lifecycle();
    stage.dataset.nyx2dLifecycle = decision.mode;
    stage.dataset.nyx2dLifecycleReason = decision.reason;
    stage.dataset.nyx2dClockPolicy = usingExperimentalRuntime()
      ? 'pause-discard-hidden-delta-preserve-phase'
      : 'restart-on-resume';
    stage.dataset.nyxRendererTier = usingExperimentalRuntime()
      ? 'stage7-experimental'
      : configuredRuntimeTier === 'stage7-experimental'
        ? 'production-fallback'
        : 'production';
    if (experimentalFailure()) stage.dataset.nyxExperimentalFailure = experimentalFailure()!;
    else delete stage.dataset.nyxExperimentalFailure;

    if (usingExperimentalRuntime() && decision.mode === 'animated') {
      stage.dataset.nyx2dPerformance = 'unverified';
      stage.dataset.nyx2dPerformanceViolations = 'Stage 7 render-time capture required';
      stage.dataset.nyx2dPerformanceStreak = '0';
    } else if (stage.dataset.nyx2dPerformance === 'unverified') {
      delete stage.dataset.nyx2dPerformance;
      delete stage.dataset.nyx2dPerformanceViolations;
      delete stage.dataset.nyx2dPerformanceStreak;
    }
  });

  return (
    <>
      <span ref={anchor} hidden aria-hidden="true" />
      <div class="nyx-2d-state-shell" aria-hidden="true">
        <Show
          when={usingExperimentalRuntime()}
          fallback={
            <Nyx2DWebGL
              state={props.state}
              active={effectiveActive()}
              reducedMotion={props.reducedMotion}
              onUnavailable={props.onUnavailable}
            />
          }>
          <NyxStage7ExperimentalRuntime
            state={props.state}
            active={effectiveActive()}
            reducedMotion={props.reducedMotion}
            onUnavailable={(reason) => setExperimentalFailure(reason)}
          />
        </Show>
      </div>
    </>
  );
}
