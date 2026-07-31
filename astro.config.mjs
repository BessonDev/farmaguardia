// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://farmacia.bessondevproject.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    ssr: {
      external: ['better-sqlite3'],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
});