import type { APIRoute } from 'astro';
import { notificarReporte } from '~/lib/notificar';

export const prerender = false;

export const POST: APIRoute = async () => {
  await notificarReporte({
    farmacia: '🔧 Prueba de configuración',
    turno: new Date().toISOString(),
    motivo: 'Mensaje de prueba desde el panel de admin',
    contacto: null,
    ip: '127.0.0.1',
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
