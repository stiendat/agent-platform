import type { SessionEnv } from '@seta/core';
import { getPool } from '@seta/shared-db';
import type { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { CookieOptions } from 'hono/utils/cookie';
import { devToolkitEnabled, isProd } from './dev-access.ts';

const DEV_ORIGINAL_COOKIE = 'seta-dev-original';

// better-auth runs with `useSecureCookies: NODE_ENV === 'production'`, which
// prefixes every cookie with `__Secure-` and marks it Secure (and reads back
// the prefixed name first). This route rewrites better-auth's own session
// cookie, so it must mirror that naming and those attributes exactly — under a
// plain `seta.session_token` name in production better-auth never reads what we
// wrote, and impersonation silently does nothing. Computed per-request so it
// tracks NODE_ENV/SESSION_COOKIE_SAMESITE rather than freezing at import time.
function cookieConfig(): {
  sessionCookie: string;
  sessionDataCookies: string[];
  base: CookieOptions;
} {
  const prod = isProd();
  const prefix = prod ? '__Secure-' : '';
  const sameSite = process.env.SESSION_COOKIE_SAMESITE === 'lax' ? 'Lax' : 'Strict';
  return {
    sessionCookie: `${prefix}seta.session_token`,
    sessionDataCookies: [`${prefix}seta.session_data`, `${prefix}seta.session_data.0`],
    base: {
      path: '/',
      httpOnly: true,
      // Outside production better-auth uses Lax + non-secure (works on http
      // localhost); in production it uses the configured SameSite + Secure.
      sameSite: prod ? sameSite : 'Lax',
      secure: prod,
    },
  };
}

// better-call (used internally by better-auth) signs cookies as `value.btoa(hmac_sha256(value, secret))`.
// Hono's setCookie URL-encodes the result, which matches better-call's serializeSignedCookie output.
async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return `${value}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export function registerDevImpersonateRoutes(app: Hono<SessionEnv>): void {
  // GET — check if currently impersonating
  app.get('/api/identity/v1/dev/impersonate', (c) => {
    if (!devToolkitEnabled(c.get('user'))) return c.json({ error: 'Forbidden' }, 403);
    const original = getCookie(c, DEV_ORIGINAL_COOKIE);
    if (!original) return c.json({ active: false });
    const scope = c.get('user');
    return c.json({
      active: true,
      target: {
        user_id: scope.user_id,
        email: scope.email,
        display_name: scope.display_name,
      },
    });
  });

  // POST — start impersonating
  app.post('/api/identity/v1/dev/impersonate', async (c) => {
    const scope = c.get('user');
    if (!devToolkitEnabled(scope)) return c.json({ error: 'Forbidden' }, 403);
    const { user_id } = await c.req.json<{ user_id: string }>();
    const pool = getPool('web');

    const result = await pool.query<{ id: string; name: string; email: string }>(
      `SELECT id, name, email FROM identity."user" WHERE id = $1 AND tenant_id = $2`,
      [user_id, scope.tenant_id],
    );
    const target = result.rows[0];
    if (!target) return c.json({ error: 'User not found in this tenant' }, 404);

    const token = generateToken(32);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO identity.session (id, user_id, token, expires_at, ip_address, user_agent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [sessionId, target.id, token, expiresAt, null, '[dev-impersonate]'],
    );

    const secret = process.env.BETTER_AUTH_SECRET ?? '';
    const signedToken = await signCookieValue(token, secret);

    const { sessionCookie, sessionDataCookies, base } = cookieConfig();
    const original = getCookie(c, sessionCookie);
    if (original) setCookie(c, DEV_ORIGINAL_COOKIE, original, base);
    setCookie(c, sessionCookie, signedToken, { ...base, expires: expiresAt });
    // Bust the better-auth session cache so the new token is read from the DB.
    // `secure` is required when clearing the `__Secure-`-prefixed prod names.
    for (const name of sessionDataCookies)
      deleteCookie(c, name, { path: '/', secure: base.secure });

    return c.json({
      ok: true,
      target: { user_id: target.id, name: target.name, email: target.email },
    });
  });

  // DELETE — exit impersonation, restore original session
  app.delete('/api/identity/v1/dev/impersonate', (c) => {
    if (!devToolkitEnabled(c.get('user'))) return c.json({ error: 'Forbidden' }, 403);
    const original = getCookie(c, DEV_ORIGINAL_COOKIE);
    if (original) {
      const { sessionCookie, sessionDataCookies, base } = cookieConfig();
      setCookie(c, sessionCookie, original, base);
      deleteCookie(c, DEV_ORIGINAL_COOKIE, { path: '/' });
      // Clear session cache so better-auth re-fetches from DB with the restored
      // token. `secure` is required to clear the `__Secure-`-prefixed prod names.
      for (const name of sessionDataCookies)
        deleteCookie(c, name, { path: '/', secure: base.secure });
    }
    return c.json({ ok: true });
  });
}

function generateToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}
