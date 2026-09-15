import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { createSignal, type Setter } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../settings/settings';

const runtime = vi.hoisted(() => ({ mounts: 0 }));

vi.mock('./NyxVrmRuntime', () => ({
  default: (props: { cameraLocked: boolean; cameraResetRequest: number; characterId: string }) => {
    runtime.mounts += 1;
    return (
      <div
        data-testid="nyx-vrm-runtime"
        data-camera-reset-request={props.cameraResetRequest}
        data-camera-locked={props.cameraLocked}
        data-character-id={props.characterId}
      />
    );
  },
}));

import OperatorStage, { operatorRendererMode } from './OperatorStage';

afterEach(() => {
  cleanup();
  runtime.mounts = 0;
});

const nyxMotionProps = {
  nyxEventMotions: defaultSettings.nyxEventMotions,
  nyxRandomActionsEnabled: false,
  nyxRandomActionIntervalSeconds: 60,
  nyxCharacterScale: 1,
};

describe('OperatorStage', () => {
  it('keeps the production VRM renderer explicit when reduced motion is requested', () => {
    expect(operatorRendererMode(true, null)).toBe('vrm-webgl-paused');
    expect(operatorRendererMode(false, null)).toBe('vrm-webgl');
    expect(operatorRendererMode(true, 'loader failed')).toBe('fallback');
  });

  it('renders Shion under the NYX runtime codename without the retired shortcut controls', () => {
    render(() => (
      <OperatorStage mode="female" readyProviders={2} totalProviders={3} activeAgents={0} {...nyxMotionProps} />
    ));

    const stage = screen.getByLabelText('Shion // NYX CYBOARD operator, warning');
    expect(stage.getAttribute('data-nyx-renderer-tier')).toBe('production');
    expect(stage.getAttribute('data-renderer')).toBe('vrm-webgl');
    expect(stage.getAttribute('data-nyx-motion-catalog')).toBe('allowlisted');
    expect(screen.getByText('Shion // NYX')).toBeTruthy();
    expect(screen.getByText('2/3 PROVIDERS READY')).toBeTruthy();
    expect(stage.querySelector('.operator-stage__header > .operator-stage-tools')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Best provider' })).toBeNull();
    expect(screen.getByTestId('nyx-vrm-runtime').getAttribute('data-character-id')).toBe(
      defaultSettings.nyxCharacterId,
    );
  });

  it('shows a completion bubble next to NYX without remounting the runtime', async () => {
    let setMessage: Setter<{ id: string; text: string } | null> | undefined;
    render(() => {
      const [message, setNextMessage] = createSignal<{ id: string; text: string } | null>(null);
      setMessage = setNextMessage;
      return (
        <OperatorStage
          mode="female"
          readyProviders={3}
          totalProviders={3}
          activeAgents={0}
          nyxSpeechBubble={message()}
          {...nyxMotionProps}
        />
      );
    });

    setMessage?.({ id: 'codex:1', text: 'Codex session ended' });
    await waitFor(() => expect(screen.getByText('Codex session ended')).toBeTruthy());
    expect(runtime.mounts).toBe(1);
  });

  it('resets and locks the NYX camera without remounting the character runtime', async () => {
    const updateLock = vi.fn();
    render(() => {
      const [locked, setLocked] = createSignal(false);
      return (
        <OperatorStage
          mode="female"
          readyProviders={3}
          totalProviders={3}
          activeAgents={0}
          nyxStageInteractionLocked={locked()}
          setNyxStageInteractionLocked={(next) => {
            updateLock(next);
            setLocked(next);
          }}
          {...nyxMotionProps}
        />
      );
    });

    const runtimeElement = screen.getByTestId('nyx-vrm-runtime');
    await fireEvent.click(screen.getByRole('button', { name: 'Reset character view' }));
    expect(runtimeElement.getAttribute('data-camera-reset-request')).toBe('1');
    await fireEvent.click(screen.getByRole('button', { name: 'Lock character view' }));
    await waitFor(() => expect(runtimeElement.getAttribute('data-camera-locked')).toBe('true'));
    expect(updateLock).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button', { name: 'Reset character view' }).hasAttribute('disabled')).toBe(true);
    expect(runtime.mounts).toBe(1);
  });

  it('offers the desktop-character action only when its Tauri handler is available', async () => {
    const openDesktopCharacter = vi.fn();
    render(() => (
      <OperatorStage
        mode="female"
        readyProviders={3}
        totalProviders={3}
        activeAgents={0}
        openNyxPresence={openDesktopCharacter}
        {...nyxMotionProps}
      />
    ));

    await fireEvent.click(screen.getByRole('button', { name: 'Show character on desktop' }));
    expect(openDesktopCharacter).toHaveBeenCalledOnce();
  });
});
