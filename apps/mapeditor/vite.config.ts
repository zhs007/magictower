import { defineConfig } from 'vite';
import fastify from 'vite-plugin-fastify';

export default defineConfig(({ command }) => ({
  plugins: command === 'build' ? [
    fastify({
      // Only use the plugin for build/preview. Dev is handled by our Fastify+Vite middleware server.
      devMode: false,
      appPath: './src/server.ts',
      serverPath: './src/server.ts',
    }),
  ] : [],
  build: {
    ssr: './src/server.ts',
  },
  server: {
    host: '0.0.0.0',
  }
}));
