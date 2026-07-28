import type { APIRoute } from 'astro';
import type { AstroCookies } from 'astro';
import { cookies } from '~/lib/auth';
import { log } from '~/lib/audit';

export const prerender = false;

function logout(ctxCookies: AstroCookies): Response {
  ctxCookies.delete(cookies.session, { path: '/' });
  ctxCookies.delete(cookies.csrf, { path: '/' });
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin/login' },
  });
}

export const POST: APIRoute = ({ cookies: ctxCookies }) => {
  log('LOGOUT');
  return logout(ctxCookies);
};

export const GET: APIRoute = ({ cookies: ctxCookies }) => {
  return logout(ctxCookies);
};