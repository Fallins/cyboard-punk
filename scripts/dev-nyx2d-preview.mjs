import { spawnSync } from 'node:child_process';

const env = {
  ...process.env,
  // Head posture, breathing, hair follow-through and safe gaze are production
  // defaults as of 0.14.0. Enhanced is retained as the telemetry/profile slot for
  // the next experimental channel; it currently adds no visual feature by itself.
  VITE_NYX_RENDERER: '2d',
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
