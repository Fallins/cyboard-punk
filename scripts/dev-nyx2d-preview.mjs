import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  // 2D + head posture + breathing are production defaults as of 0.11.0.
  // This launcher intentionally adds only the still-experimental channels.
  VITE_NYX_RENDERER: '2d',
  VITE_NYX_2D_PROFILE: 'enhanced',
  VITE_NYX_2D_GAZE: '1',
  VITE_NYX_2D_HAIR_MOTION: '1',
  // Synthetic blink remains quarantined until a real eyelid source exists.
  VITE_NYX_2D_BLINK: '0',
};

const result = spawnSync('bun', ['run', 'tauri', 'dev'], {
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
