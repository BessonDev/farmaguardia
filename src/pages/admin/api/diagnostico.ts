import type { APIRoute } from 'astro';

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  return new Response(JSON.stringify({
    method: request.method,
    url: request.url,
    headers,
    ok: true,
    msg: 'Si ves esto, la app responde bien. El 403 solo afecta a POSTs por Cloudflare.',
  }, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
