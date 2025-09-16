import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
  '@': path.resolve(__dirname, './src'),
  // Map the local logic-core package so Vite & Vitest can resolve imports
  // that use the package name. This mirrors the TS path mapping used by
  // `tsc --noEmit` in CI and keeps runtime transforms consistent.
  '@proj-tower/logic-core': path.resolve(__dirname, '../../packages/logic-core/src'),
  '@proj-tower/maprender': path.resolve(__dirname, '../../packages/maprender/src'),
  // Note: removed repo-root aliases for gamedata/mapdata/assets to keep
  // module resolution consistent in tsc/vitest/Node environments. Use
  // explicit relative imports from source files instead.
    },
  },
  test: {
    environment: 'jsdom',
    globals: true, // Use to have global api like expect, it, etc.
    onConsoleLog: () => true,
  },
});
