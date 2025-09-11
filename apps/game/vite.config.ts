import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
  '@': path.resolve(__dirname, './src'),
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
