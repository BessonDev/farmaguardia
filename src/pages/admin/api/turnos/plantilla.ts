import type { APIRoute } from 'astro';

export const prerender = false;

const CSV = `farmacia_nombre,fecha_inicio,fecha_fin,notas
"Farma Amazonas (Sede Principal)",${new Date().toISOString().slice(0, 10)} 08:00,${new Date(Date.now() + 86400000).toISOString().slice(0, 10)} 08:00,
"Farmacia Orinoco",${new Date(Date.now() + 86400000).toISOString().slice(0, 10)} 08:00,${new Date(Date.now() + 172800000).toISOString().slice(0, 10)} 08:00,"Feriado"`;

export const GET: APIRoute = () => {
  return new Response(CSV, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="plantilla_turnos.csv"',
    },
  });
};
