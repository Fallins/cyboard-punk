import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  VITE_NYX_RENDERER: '2d',
  VITE_NYX_2D_PROFILE: 'stable',
  VITE_NYX_2D_GAZE: '0',
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
