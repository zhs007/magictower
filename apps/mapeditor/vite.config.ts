import { defineConfig } from 'vite';
import fastify from 'vite-plugin-fastify';

export default defineConfig({
  plugins: [
    fastify({
      // Disable devMode so the plugin won't intercept Vite's dev middleware.
      // We run the Fastify server separately in dev using `pnpm run dev:server`.
      devMode: false,
      appPath: './src/app.ts',
      serverPath: './src/server.ts',
    }),
  ],
  build: {
    ssr: './src/server.ts',
  },
  server: {
    // This is needed to make the fastify server available on the network
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
      '/assets': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  }
});
