import { createSignal, onCleanup, onMount } from 'solid-js';

export interface Nyx2DDiagnosticSnapshot {
  lifecycle: string;
  performance: string;
  drawCalls: string;
  triangles: string;
  renderMs: string;
  attention: string;
}

const WAITING: Nyx2DDiagnosticSnapshot = {
  lifecycle: 'WAITING',
  performance: 'WAITING',
  drawCalls: '—',
  triangles: '—',
  renderMs: '—',
  attention: '—',
};

export function readNyx2DDiagnosticSnapshot(
  stage?: HTMLElement | null,
  renderer?: HTMLElement | null,
): Nyx2DDiagnosticSnapshot {
  if (!stage || !renderer) return { ...WAITING };
  return {
    lifecycle: (stage.dataset.nyx2dLifecycle || 'waiting').toUpperCase(),
    performance: (stage.dataset.nyx2dPerformance || 'waiting').toUpperCase(),
    drawCalls: renderer.dataset.drawCalls || '—',
    triangles: renderer.dataset.triangles || '—',
    renderMs: renderer.dataset.renderMs ? `${renderer.dataset.renderMs}ms` : '—',
    attention: (stage.dataset.attentionTarget || 'center').toUpperCase(),
  };
}

/**
 * Diagnostic-only observer. This component is mounted only while the persisted
 * NYX test-controls setting is enabled, so production UI carries no observer or
 * polling overhead when diagnostics are hidden.
 */
export default function Nyx2DDiagnosticStrip() {
  const [snapshot, setSnapshot] = createSignal<Nyx2DDiagnosticSnapshot>({ ...WAITING });

  onMount(() => {
    const stage = document.querySelector<HTMLElement>('.operator-stage--female');
    const renderer = stage?.querySelector<HTMLElement>('.nyx-2d-webgl') ?? null;
    if (!stage || !renderer) return;

    const publish = () => setSnapshot(readNyx2DDiagnosticSnapshot(stage, renderer));
    publish();

    if (typeof MutationObserver === 'undefined') return;
    const stageObserver = new MutationObserver(publish);
    stageObserver.observe(stage, {
      attributes: true,
      attributeFilter: [
        'data-nyx2d-lifecycle',
        'data-nyx2d-performance',
        'data-attention-target',
      ],
    });

    const rendererObserver = new MutationObserver(publish);
    rendererObserver.observe(renderer, {
      attributes: true,
      attributeFilter: [
        'data-draw-calls',
        'data-triangles',
        'data-render-ms',
      ],
    });

    onCleanup(() => {
      stageObserver.disconnect();
      rendererObserver.disconnect();
    });
  });

  return (
    <div class="operator-simulator__diagnostics" aria-label="NYX runtime diagnostics">
      <span><small>LIFE</small><strong>{snapshot().lifecycle}</strong></span>
      <span data-performance={snapshot().performance.toLowerCase()}><small>PERF</small><strong>{snapshot().performance}</strong></span>
      <span><small>DRAW</small><strong>{snapshot().drawCalls}</strong></span>
      <span><small>TRI</small><strong>{snapshot().triangles}</strong></span>
      <span><small>RENDER</small><strong>{snapshot().renderMs}</strong></span>
      <span><small>ATTN</small><strong>{snapshot().attention}</strong></span>
    </div>
  );
}
