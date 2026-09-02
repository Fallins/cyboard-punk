import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  VITE_NYX_2D_PROFILE: 'enhanced',
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
