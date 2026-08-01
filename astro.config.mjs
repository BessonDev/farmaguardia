// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: undefined,
  integrations: [],
  vite: {
    css: {
      postcss: './postcss.config.mjs',
    },
  },
});