import { defineConfig } from 'vite';
import fastify from 'vite-plugin-fastify';

export default defineConfig({
  plugins: [
    fastify({
      serverEntry: './src/server.ts',
    }),
  ],
  build: {
    ssr: './src/server.ts',
  },
  server: {
    // This is needed to make the fastify server available on the network
    host: '0.0.0.0',
  }
});
