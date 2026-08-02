// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: true },
  site: process.env.SITE_URL || 'http://localhost:4321',
  // Detrás de un reverse proxy (Dokploy/Cloudflare) el contenedor ve HTTP
  // mientras el navegador manda Origin https → mismatch en el origin check.
  // La sesión admin ya está protegida por cookie SameSite=Lax + middleware
  // que verifica la sesión en cada ruta/acción /admin.
  security: { checkOrigin: false },
  integrations: [],
  vite: {
    css: {
      postcss: './postcss.config.mjs',
    },
  },
});