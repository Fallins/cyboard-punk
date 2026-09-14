import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const windowApi = vi.hoisted(() => ({
  hide: vi.fn(async () => undefined),
  startDragging: vi.fn(async () => undefined),
  startResizeDragging: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/api/event', () => ({
  emitTo: vi.fn(async () => undefined),
  listen: vi.fn(async () => () => undefined),
}));
vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => windowApi,
}));
vi.mock('./NyxVrmRuntime', () => ({
  default: (props: { cameraView: unknown; desktopInteractionRequest: number }) => (
    <div
      data-testid="nyx-vrm-runtime"
      data-camera-view={JSON.stringify(props.cameraView)}
      data-desktop-interaction-request={props.desktopInteractionRequest}
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
  vi.clearAllMocks();
});

describe('NyxPresence', () => {
  it('uses the app camera view and exposes native move, resize, and hide controls', async () => {
    const { container } = render(() => <NyxPresence />);

    expect(JSON.parse(screen.getByTestId('nyx-vrm-runtime').getAttribute('data-camera-view') ?? 'null')).toEqual({
      version: 1,
      position: [0.8, 1.7, 4.1],
      target: [0, 0.9, 0],
    });

    await fireEvent.pointerDown(container.querySelector('.nyx-presence__drag-handle') as HTMLElement, { button: 0 });
    await fireEvent.pointerDown(screen.getByRole('button', { name: 'Resize desktop character' }), { button: 0 });
    await fireEvent.click(screen.getByRole('button', { name: 'Close desktop character' }));

    await waitFor(() => {
      expect(windowApi.startDragging).toHaveBeenCalledOnce();
      expect(windowApi.startResizeDragging).toHaveBeenCalledWith('SouthEast');
      expect(windowApi.hide).toHaveBeenCalledOnce();
    });
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
