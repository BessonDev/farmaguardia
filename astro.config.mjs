// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './site.config.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: true },
  site: SITE_URL,
  // Detrás de un reverse proxy (Dokploy/Cloudflare) el contenedor ve HTTP
  // mientras el navegador manda Origin https → mismatch en el origin check.
  // La sesión admin ya está protegida por cookie SameSite=Lax + middleware
  // que verifica la sesión en cada ruta/acción /admin.
  security: { checkOrigin: false },
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') })],
  vite: {
    css: {
      postcss: './postcss.config.mjs',
    },
  },
});