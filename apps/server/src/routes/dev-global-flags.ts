import type { SessionEnv } from '@seta/core';
import { getGlobalFlags, isGlobalFlagKey, setGlobalFlag } from '@seta/core';
import type { Hono } from 'hono';
import { devToolkitEnabled } from './dev-access.ts';

export function registerDevGlobalFlagRoutes(app: Hono<SessionEnv>): void {
  // GET — all deployment-wide flags (defaults applied for unset keys)
  app.get('/api/identity/v1/dev/flags', async (c) => {
    const scope = c.get('user');
    if (!devToolkitEnabled(scope)) return c.json({ error: 'Forbidden' }, 403);
    return c.json({ flags: await getGlobalFlags() });
  });

  // PUT — set a single flag
  app.put('/api/identity/v1/dev/flags', async (c) => {
    const scope = c.get('user');
    if (!devToolkitEnabled(scope)) return c.json({ error: 'Forbidden' }, 403);

    const { key, value } = await c.req.json<{ key?: string; value?: unknown }>();
    if (!key || !isGlobalFlagKey(key)) return c.json({ error: 'Unknown flag' }, 400);
    if (typeof value !== 'boolean') return c.json({ error: 'value must be boolean' }, 400);

    await setGlobalFlag(key, value);
    return c.json({ ok: true, flags: await getGlobalFlags() });
  });
}
