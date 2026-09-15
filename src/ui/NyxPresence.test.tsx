import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const windowApi = vi.hoisted(() => ({
  hide: vi.fn(async () => undefined),
  startDragging: vi.fn(async () => undefined),
  startResizeDragging: vi.fn(async () => undefined),
  setSize: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/api/event', () => ({
  emitTo: vi.fn(async () => undefined),
  listen: vi.fn(async () => () => undefined),
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => windowApi,
}));
vi.mock('@tauri-apps/api/dpi', () => ({
  LogicalSize: class LogicalSize {
    constructor(
      readonly width: number,
      readonly height: number,
    ) {}
  },
}));
vi.mock('./NyxVrmRuntime', () => ({
  default: (props: {
    cameraView: unknown;
    characterId: string;
    desktopInteractionRequest: number;
    reducedMotion: boolean;
  }) => (
    <div
      data-testid="nyx-vrm-runtime"
      data-camera-view={JSON.stringify(props.cameraView)}
      data-character-id={props.characterId}
      data-desktop-interaction-request={props.desktopInteractionRequest}
      data-reduced-motion={props.reducedMotion}
    />
  ),
}));

import NyxPresence from './NyxPresence';

beforeEach(() => {
  Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
  localStorage.setItem(
    'cyboard.settings.v1',
    JSON.stringify({
      language: 'en',
      nyxCameraView: {
        version: 1,
        position: [0.8, 1.7, 4.1],
        target: [0, 0.9, 0],
      },
    }),
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
  Reflect.deleteProperty(window, 'matchMedia');
  vi.clearAllMocks();
});

describe('NyxPresence', () => {
  it('uses the app camera view and exposes native move, reversible resize, and hide controls', async () => {
    const { container } = render(() => <NyxPresence />);

    expect(JSON.parse(screen.getByTestId('nyx-vrm-runtime').getAttribute('data-camera-view') ?? 'null')).toEqual({
      version: 1,
      position: [0.8, 1.7, 4.1],
      target: [0, 0.9, 0],
    });

    await fireEvent.pointerDown(container.querySelector('.nyx-presence__drag-handle') as HTMLElement, { button: 0 });
    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Resize desktop character' }), { button: 0 });
    await fireEvent.click(screen.getByRole('button', { name: 'Reset desktop character size' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Close desktop character' }));

    await waitFor(() => {
      expect(windowApi.startDragging).toHaveBeenCalledOnce();
      expect(windowApi.startResizeDragging).toHaveBeenCalledWith('SouthEast');
      expect(windowApi.setSize).toHaveBeenCalledWith(expect.objectContaining({ width: 390, height: 680 }));
      expect(windowApi.hide).toHaveBeenCalledOnce();
    });
  });

  it('passes the reviewed catalog character through to the independent runtime', () => {
    render(() => <NyxPresence />);

    expect(screen.getByTestId('nyx-vrm-runtime').getAttribute('data-character-id')).toBe('shion-vroid-2-14-v1');
  });

  it('forwards the system reduced-motion preference to the independent runtime', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
      configurable: true,
    });
    render(() => <NyxPresence />);

    expect(screen.getByTestId('nyx-vrm-runtime').getAttribute('data-reduced-motion')).toBe('true');
  });

  it('keeps click interactions separate from native drag and lets users disable them', async () => {
    render(() => <NyxPresence />);

    const interaction = screen.getByRole('button', { name: 'Interact with desktop character' });
    await fireEvent.click(interaction);
    expect(screen.getByTestId('nyx-vrm-runtime').getAttribute('data-desktop-interaction-request')).toBe('1');

    localStorage.setItem(
      'cyboard.settings.v1',
      JSON.stringify({ language: 'en', nyxDesktopInteractionsEnabled: false }),
    );
    cleanup();
    render(() => <NyxPresence />);
    expect(screen.getByRole('button', { name: 'Interact with desktop character' }).hasAttribute('disabled')).toBe(true);
  });
});
