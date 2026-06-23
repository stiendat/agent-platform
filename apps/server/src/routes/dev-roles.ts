import type { SessionEnv } from '@seta/core';
import { invalidateUserSessions } from '@seta/core';
import { type Actor, ASSIGNABLE_ROLES, grantRole, revokeRole } from '@seta/identity';
import { getPool } from '@seta/shared-db';
import type { Hono } from 'hono';
import { devToolkitEnabled, isProd } from './dev-access.ts';

interface MyGrantRow {
  grant_id: string;
  role_slug: string;
}

// In non-production a developer self-grants freely, so we use a `cli` actor to
// bypass grantRole's `identity.role.grant` permission check. In production the
// toolkit is admin-only (see devToolkitEnabled), and admins already hold that
// permission, so we pass a real `user` actor and let the normal check run.
function actorFor(scope: { user_id: string }): Actor {
  return isProd() ? { type: 'user', user_id: scope.user_id } : { type: 'cli', user_id: null };
}

export function registerDevRoleRoutes(app: Hono<SessionEnv>): void {
  // GET — assignable roles + the caller's own active grants
  app.get('/api/identity/v1/dev/my-roles', async (c) => {
    const scope = c.get('user');
    if (!devToolkitEnabled(scope)) return c.json({ error: 'Forbidden' }, 403);

    const result = await getPool('web').query<MyGrantRow>(
      `SELECT id AS grant_id, role_slug
         FROM identity.role_grants
        WHERE user_id = $1 AND tenant_id = $2 AND revoked_at IS NULL
        ORDER BY granted_at DESC`,
      [scope.user_id, scope.tenant_id],
    );

    return c.json({ assignable: ASSIGNABLE_ROLES, grants: result.rows });
  });

  // POST — grant the caller a role on the tenant scope
  app.post('/api/identity/v1/dev/my-roles', async (c) => {
    const scope = c.get('user');
    if (!devToolkitEnabled(scope)) return c.json({ error: 'Forbidden' }, 403);

    const { role_slug } = await c.req.json<{ role_slug?: string }>();
    if (!role_slug || !ASSIGNABLE_ROLES.includes(role_slug)) {
      return c.json({ error: 'Unknown or non-assignable role' }, 400);
    }

    const { grant_id } = await grantRole(
      {
        user_id: scope.user_id,
        tenant_id: scope.tenant_id,
        role_slug,
        scope_type: 'tenant',
        scope_id: null,
      },
      actorFor(scope),
    );
    await invalidateUserSessions(scope.user_id);

    return c.json({ ok: true, grant_id });
  });

  // DELETE — revoke one of the caller's own grants
  app.delete('/api/identity/v1/dev/my-roles/:grantId', async (c) => {
    const scope = c.get('user');
    if (!devToolkitEnabled(scope)) return c.json({ error: 'Forbidden' }, 403);

    const grantId = c.req.param('grantId');
    // Ownership guard: a caller may only revoke grants on their own account,
    // never use this dev route to strip someone else's roles.
    const owned = await getPool('web').query<{ id: string }>(
      `SELECT id FROM identity.role_grants
        WHERE id = $1 AND user_id = $2 AND tenant_id = $3 AND revoked_at IS NULL`,
      [grantId, scope.user_id, scope.tenant_id],
    );
    if (owned.rowCount === 0) return c.json({ error: 'Grant not found' }, 404);

    await revokeRole(grantId, actorFor(scope));
    await invalidateUserSessions(scope.user_id);

    return c.json({ ok: true });
  });
}
