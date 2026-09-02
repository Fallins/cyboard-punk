import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  // 2D + head posture + breathing + hair follow-through are production defaults
  // as of 0.13.0. Enhanced currently adds only the still-experimental gaze.
  VITE_NYX_RENDERER: '2d',
  VITE_NYX_2D_PROFILE: 'enhanced',
  VITE_NYX_2D_GAZE: '1',
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
