import type { APIRoute } from 'astro';
import { cookies, verifyPassword, verifyCsrf, hashPassword } from '~/lib/auth';
import { db, schema } from '~/db/client';
import { eq } from 'drizzle-orm';
import { log } from '~/lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies: ctxCookies, redirect, locals }) => {
  if (!locals.admin?.authenticated) {
    return redirect('/admin/login', 302);
  }

  const formData = await request.formData();
  const csrfForm = String(formData.get('_csrf') ?? '');
  const csrfCookie = ctxCookies.get(cookies.csrf)?.value;

  if (!verifyCsrf(csrfForm, csrfCookie)) {
    return redirect('/admin/cambiar-password?error=csrf', 302);
  }

  const passwordActual = String(formData.get('password_actual') ?? '');
  const passwordNueva = String(formData.get('password_nueva') ?? '');
  const passwordConfirmar = String(formData.get('password_confirmar') ?? '');

  const user = db.select().from(schema.usuarios).where(eq(schema.usuarios.username, 'admin')).get();
  if (!user) {
    log('CHANGE_PASSWORD_ERROR', { motivo: 'usuario_no_encontrado' });
    return redirect('/admin/cambiar-password?error=invalid', 302);
  }

  const ok = await verifyPassword(passwordActual, user.passwordHash);
  if (!ok) {
    log('CHANGE_PASSWORD_FAIL', { motivo: 'actual_incorrecta' });
    return redirect('/admin/cambiar-password?error=invalid', 302);
  }

  if (passwordNueva.length < 8) {
    return redirect('/admin/cambiar-password?error=short', 302);
  }

  if (passwordNueva !== passwordConfirmar) {
    return redirect('/admin/cambiar-password?error=mismatch', 302);
  }

  const newHash = await hashPassword(passwordNueva);
  db.update(schema.usuarios)
    .set({ passwordHash: newHash })
    .where(eq(schema.usuarios.username, 'admin'))
    .run();

  log('CHANGE_PASSWORD_OK', {});

  return redirect('/admin/cambiar-password?ok=1', 302);
};
