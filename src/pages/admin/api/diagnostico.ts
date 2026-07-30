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
  }, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });

  let body = null;
  try {
    const ct = request.headers.get('content-type') ?? '';
    if (ct.includes('json')) {
      body = await request.json();
    } else {
      const fd = await request.formData();
      body = Object.fromEntries(fd.entries());
    }
  } catch { body = '(error parsing body)'; }

  console.log('[diagnostico] POST received');
  console.log('[diagnostico] url:', request.url);
  console.log('[diagnostico] cookie:', headers['cookie'] ?? '(none)');
  console.log('[diagnostico] body:', JSON.stringify(body, null, 2));

  return new Response(JSON.stringify({
    method: request.method,
    url: request.url,
    headers,
    body,
    ok: true,
  }, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
