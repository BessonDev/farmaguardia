// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: true },
  site: process.env.SITE_URL || 'http://localhost:4321',
  integrations: [],
  vite: {
    css: {
      postcss: './postcss.config.mjs',
    },
  },
});