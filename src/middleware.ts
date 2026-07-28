import { defineMiddleware } from 'astro:middleware';
import { cookies, readSession } from '~/lib/auth';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  if (!pathname.startsWith('/admin')) {
    return next();
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return next();
  }

  const sessionCookie = context.cookies.get(cookies.session)?.value;
  const session = readSession(sessionCookie);

  if (!session) {
    return context.redirect('/admin/login?next=' + encodeURIComponent(pathname), 302);
  }

  context.locals.admin = { authenticated: true };
  return next();
});