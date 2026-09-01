import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';

export async function readLaunchAtLogin(): Promise<boolean> {
  return isEnabled();
}

export async function setLaunchAtLogin(enabled: boolean): Promise<void> {
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
