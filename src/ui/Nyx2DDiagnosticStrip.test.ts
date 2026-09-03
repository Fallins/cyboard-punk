import { describe, expect, it } from 'vitest';
import { readNyx2DDiagnosticSnapshot } from './Nyx2DDiagnosticStrip';

describe('NYX runtime diagnostic strip', () => {
  it('returns a waiting snapshot until the production stage and renderer exist', () => {
    expect(readNyx2DDiagnosticSnapshot(null, null)).toEqual({
      lifecycle: 'WAITING',
      performance: 'WAITING',
      drawCalls: '—',
      triangles: '—',
      renderMs: '—',
      attention: '—',
    });
  });

  it('reads existing production telemetry without deriving new renderer state', () => {
    const stage = document.createElement('div');
    stage.dataset.nyx2dLifecycle = 'animated';
    stage.dataset.nyx2dPerformance = 'ok';
    stage.dataset.attentionTarget = 'cursor';

    const renderer = document.createElement('div');
    renderer.dataset.drawCalls = '8';
    renderer.dataset.triangles = '3852';
    renderer.dataset.renderMs = '4.27';

    expect(readNyx2DDiagnosticSnapshot(stage, renderer)).toEqual({
      lifecycle: 'ANIMATED',
      performance: 'OK',
      drawCalls: '8',
      triangles: '3852',
      renderMs: '4.27ms',
      attention: 'CURSOR',
    });
  });
});
