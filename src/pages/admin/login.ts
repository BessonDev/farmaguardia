import type { APIRoute } from 'astro';
import {
  cookies,
  verifyPassword,
  makeSession,
  makeCsrfToken,
  verifyCsrf,
} from '~/lib/auth';
import { getClientIp, isRateLimited, recordAttempt } from '~/lib/rate-limit';
import { log } from '~/lib/audit';
import { db, schema } from '~/db/client';
import { eq } from 'drizzle-orm';

export const prerender = false;

const LOGIN_HTML = (csrfToken: string, next: string, error: string | null, limited: boolean) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin · FarmaGuardia</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a; color: #f5f5f5; margin: 0;
      min-height: 100dvh; display: grid; place-items: center;
    }
    .card {
      background: #171717; border: 1px solid #262626;
      border-radius: 16px; padding: 32px;
      width: min(360px, 92vw);
    }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .sub { margin: 0 0 24px; font-size: 13px; color: #a3a3a3; }
    label { display: block; font-size: 13px; margin-bottom: 6px; color: #d4d4d4; }
    input[type="password"] {
      width: 100%; padding: 12px; border-radius: 8px;
      border: 1px solid #404040; background: #0a0a0a; color: #f5f5f5;
      font-size: 15px; box-sizing: border-box;
    }
    input:focus { outline: 2px solid #22c55e; outline-offset: 1px; }
    button {
      width: 100%; margin-top: 16px; padding: 12px;
      background: #22c55e; color: #052e16; border: none;
      border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .err {
      margin-top: 12px; padding: 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px; color: #fca5a5; font-size: 13px;
    }
  </style>
</head>
<body>
  <form class="card" method="post" action="/admin/login">
    <h1>FarmaGuardia</h1>
    <p class="sub">Panel de administración</p>
    <label for="password">Contraseña</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus />
    <input type="hidden" name="_csrf" value="${csrfToken}" />
    <input type="hidden" name="next" value="${next}" />
    ${error ? `<div class="err">${error === 'invalid' ? 'Contraseña incorrecta.' : error === 'ratelimit' ? 'Demasiados intentos. Esperá 15 minutos.' : 'Error de configuración.'}</div>` : ''}
    ${limited ? `<div class="err">Demasiados intentos. Esperá 15 minutos antes de volver a intentar.</div>` : ''}
    <button type="submit" ${limited ? 'disabled' : ''}>Entrar</button>
  </form>
</body>
</html>`;

export const GET: APIRoute = ({ url, cookies: ctxCookies, locals, redirect, request }) => {
  if (locals.admin?.authenticated) {
    return redirect('/admin', 302);
  }

  const csrfToken = makeCsrfToken();
  ctxCookies.set(cookies.csrf, csrfToken, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 86400,
  });

  const next = url.searchParams.get('next') ?? '/admin';
  const error = url.searchParams.get('error');
  const limited = isRateLimited(getClientIp(request));

  return new Response(LOGIN_HTML(csrfToken, next, error, limited), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect }) => {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return redirect('/admin/login?error=ratelimit', 302);
  }

  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');
  const csrfForm = String(formData.get('_csrf') ?? '');
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;
  const next = String(formData.get('next') ?? '/admin');

  if (!verifyCsrf(csrfForm, csrfCookie)) {
    return redirect('/admin/login?error=csrf', 302);
  }

  const user = db.select().from(schema.usuarios).where(eq(schema.usuarios.username, 'admin')).get();
  if (!user) {
    console.error('[admin] No se encontró usuario admin en la DB');
    return redirect('/admin/login?error=config', 302);
  }

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    recordAttempt(ip, false);
    log('LOGIN_FAIL', { ip });
    return redirect('/admin/login?error=invalid', 302);
  }

  recordAttempt(ip, true);
  log('LOGIN_OK', { ip });

  const session = makeSession();
  ctxCookies.set(cookies.session, session.value, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 7,
  });

  const safeNext = next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  return redirect(safeNext, 302);
};