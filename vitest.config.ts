import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'tests/**'],
    // Per-file environment override via `// @vitest-environment jsdom` pragma
    // at the top of the file (tests that need a DOM declare it there).
  },
});
