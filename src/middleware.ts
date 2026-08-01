import { defineMiddleware } from 'astro:middleware';
import { getActionContext } from 'astro:actions';
import { verifySession } from './actions';

export const onRequest = defineMiddleware(async (context, next) => {
  const { action, setActionResult, serializeActionResult } = getActionContext(context);

  // Si es una acción que viene de form, dejarla pasar (login/logout son públicos)
  if (action?.calledFrom === 'form') {
    const result = await action.handler();
    setActionResult(action.name, serializeActionResult(result));
    return next();
  }

  // Proteger rutas /admin (excepto /admin/login)
  const url = new URL(context.url);
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    const isAuthenticated = verifySession(context.cookies);
    if (!isAuthenticated) {
      return context.redirect('/admin/login');
    }
  }

  return next();
});