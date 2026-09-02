import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  VITE_NYX_RENDERER: '3d',
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
