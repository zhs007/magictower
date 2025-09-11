import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
  '@': path.resolve(__dirname, './src'),
  // Resolve game data and map data to the repo root so imports like
  // import('/gamedata/playerdata.json') work in vitest and Vite.
  '/gamedata': path.resolve(__dirname, '../../gamedata'),
  '/mapdata': path.resolve(__dirname, '../../mapdata'),
  '/assets': path.resolve(__dirname, '../../assets'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true, // Use to have global api like expect, it, etc.
    onConsoleLog: () => true,
  },
});
