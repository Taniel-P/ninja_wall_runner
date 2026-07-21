import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.m4a'],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
