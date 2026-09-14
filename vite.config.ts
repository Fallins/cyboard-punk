import { resolve } from 'node:path';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [solid()],
  server: { port: 1420, strictPort: true },
  clearScreen: false,
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        nyxVroidExperiment: resolve(import.meta.dirname, 'experiments/nyx-vroid/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      thresholds: { statements: 85, functions: 85, lines: 85, branches: 80 },
      include: ['src/domain/**/*.ts', 'src/providers/**/*.ts'],
    },
  },
});
