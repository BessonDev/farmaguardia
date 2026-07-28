import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-characters-long!!';
});

const {
  hashPassword,
  verifyPassword,
  signCookie,
  verifyCookie,
  makeSession,
  readSession,
  makeCsrfToken,
  verifyCsrf,
} = await import('../src/lib/auth');

describe('hashPassword / verifyPassword', () => {
  it('hashea y verifica una contraseña correcta', async () => {
    const hash = await hashPassword('admin123');
    expect(hash).toBeTruthy();
    expect(hash.startsWith('$argon2')).toBe(true);

    const ok = await verifyPassword('admin123', hash);
    expect(ok).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('admin123');
    const ok = await verifyPassword('wrong', hash);
    expect(ok).toBe(false);
  });

  it('rechaza un hash inválido sin tirar excepción', async () => {
    const ok = await verifyPassword('admin123', 'hash-invalido');
    expect(ok).toBe(false);
  });
});

describe('signCookie / verifyCookie', () => {
  it('firma y verifica un payload correctamente', () => {
    const future = Math.floor(Date.now() / 1000) + 3600; // +1 hora
    const payload = { sub: 'admin', iat: Math.floor(Date.now() / 1000), exp: future };
    const signed = signCookie(payload);
    expect(signed).toContain('.');

    const verified = verifyCookie<typeof payload>(signed);
    expect(verified).not.toBeNull();
    expect(verified!.sub).toBe('admin');
  });

  it('rechaza una cookie con firma alterada', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const payload = { sub: 'admin', iat: Math.floor(Date.now() / 1000), exp: future };
    const signed = signCookie(payload);
    const tampered = signed + 'x'; // alterar la cookie garantizado
    const verified = verifyCookie(tampered);
    expect(verified).toBeNull();
  });

  it('rechaza una cookie con payload inválido', () => {
    const verified = verifyCookie('payload-invalido.firma');
    expect(verified).toBeNull();
  });

  it('rechaza una cookie vacía', () => {
    expect(verifyCookie('')).toBeNull();
  });

  it('rechaza un null/undefined', () => {
    expect(readSession(undefined)).toBeNull();
  });
});

describe('makeSession / readSession', () => {
  it('crea una sesión y la lee correctamente', () => {
    const session = makeSession();
    expect(session.payload.sub).toBe('admin');
    expect(session.payload.iat).toBeGreaterThan(0);
    expect(session.payload.exp).toBeGreaterThan(session.payload.iat);

    const read = readSession(session.value);
    expect(read).not.toBeNull();
    expect(read!.sub).toBe('admin');
  });

  it('rechaza una sesión expirada', async () => {
    const session = makeSession(-1); // exp en el pasado
    await new Promise((r) => setTimeout(r, 10));
    const read = readSession(session.value);
    expect(read).toBeNull();
  });
});

describe('makeCsrfToken / verifyCsrf', () => {
  it('genera un token y lo verifica', () => {
    const token = makeCsrfToken();
    expect(token.length).toBeGreaterThan(0);

    expect(verifyCsrf(token, token)).toBe(true);
    expect(verifyCsrf(token, 'otro-token')).toBe(false);
    expect(verifyCsrf('', token)).toBe(false);
    expect(verifyCsrf(token, '')).toBe(false);
  });
});