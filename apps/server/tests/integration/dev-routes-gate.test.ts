import { hashRoleSummary, type SessionEnv, type SessionScope } from '@seta/core';
import { resetCoreDb } from '@seta/core/testing';
import { closePools, initPools } from '@seta/shared-db';
import { withTestDb } from '@seta/shared-testing';
import { Hono } from 'hono';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerDevGlobalFlagRoutes } from '../../src/routes/dev-global-flags.ts';
import { registerDevImpersonateRoutes } from '../../src/routes/dev-impersonate.ts';
import { registerDevRoleRoutes } from '../../src/routes/dev-roles.ts';
import { resolveTestPermissions } from '../helpers/rbac.ts';

function buildSession(opts: { tenant_id: string; user_id: string; roles: string[] }): SessionScope {
  const role_summary = { roles: opts.roles, cross_tenant_read: false };
  return {
    session_id: crypto.randomUUID(),
    user_id: opts.user_id,
    tenant_id: opts.tenant_id,
    email: `${opts.user_id}@test`,
    display_name: 'User',
    role_summary,
    role_summary_hash: hashRoleSummary(role_summary),
    permissions: resolveTestPermissions(role_summary.roles),
    accessible_group_ids: [],
    cross_tenant_read: false,
    built_at: new Date(),
    invalidated_at: null,
  };
}

function buildApp(session: SessionScope): Hono<SessionEnv> {
  const app = new Hono<SessionEnv>();
  app.use('*', async (c, next) => {
    c.set('user', session);
    await next();
  });
  registerDevRoleRoutes(app);
  registerDevGlobalFlagRoutes(app);
  registerDevImpersonateRoutes(app);
  return app;
}

function withTest<T>(fn: (ctx: { pool: Pool }) => Promise<T>): Promise<T> {
  return withTestDb(
    {
      templateDbName: process.env.PLATFORM_TEST_PG_TEMPLATE as string,
      baseUrl: process.env.PLATFORM_TEST_PG_BASE as string,
    },
    async ({ pool, databaseUrl }) => {
      initPools({ databaseUrl });
      resetCoreDb();
      try {
        return await fn({ pool });
      } finally {
        await closePools();
      }
    },
  );
}

// Routes that must be closed to non-admins in production.
const GATED: { method: string; path: string; body?: unknown }[] = [
  { method: 'GET', path: '/api/identity/v1/dev/my-roles' },
  { method: 'POST', path: '/api/identity/v1/dev/my-roles', body: { role_slug: 'org.admin' } },
  { method: 'DELETE', path: `/api/identity/v1/dev/my-roles/${crypto.randomUUID()}` },
  { method: 'GET', path: '/api/identity/v1/dev/flags' },
  {
    method: 'PUT',
    path: '/api/identity/v1/dev/flags',
    body: { key: 'force_expand_reasoning', value: true },
  },
  { method: 'GET', path: '/api/identity/v1/dev/impersonate' },
  {
    method: 'POST',
    path: '/api/identity/v1/dev/impersonate',
    body: { user_id: crypto.randomUUID() },
  },
  { method: 'DELETE', path: '/api/identity/v1/dev/impersonate' },
];

function request(app: Hono<SessionEnv>, r: { method: string; path: string; body?: unknown }) {
  return app.request(r.path, {
    method: r.method,
    headers: { 'content-type': 'application/json' },
    body: r.body === undefined ? undefined : JSON.stringify(r.body),
  });
}

describe('dev routes — production gate', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('a non-admin user is forbidden from every dev route in production', async () => {
    const app = buildApp(
      buildSession({ tenant_id: crypto.randomUUID(), user_id: crypto.randomUUID(), roles: [] }),
    );
    for (const r of GATED) {
      const res = await request(app, r);
      expect(res.status, `${r.method} ${r.path}`).toBe(403);
    }
  });

  it('DEV_TOOLKIT_ALLOW_ALL opens every dev route to non-admins in production', async () => {
    const original = process.env.DEV_TOOLKIT_ALLOW_ALL;
    process.env.DEV_TOOLKIT_ALLOW_ALL = 'true';
    try {
      await withTest(async () => {
        const app = buildApp(
          buildSession({ tenant_id: crypto.randomUUID(), user_id: crypto.randomUUID(), roles: [] }),
        );
        const res = await app.request('/api/identity/v1/dev/flags');
        expect(res.status).toBe(200);
      });
    } finally {
      if (original === undefined) delete process.env.DEV_TOOLKIT_ALLOW_ALL;
      else process.env.DEV_TOOLKIT_ALLOW_ALL = original;
    }
  });

  it('an admin retains access in production (gate does not 403)', async () => {
    await withTest(async () => {
      const app = buildApp(
        buildSession({
          tenant_id: crypto.randomUUID(),
          user_id: crypto.randomUUID(),
          roles: ['org.admin'],
        }),
      );
      const res = await app.request('/api/identity/v1/dev/flags');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { flags: { force_expand_reasoning: boolean } };
      expect(body.flags.force_expand_reasoning).toBe(false);
    });
  });
});

describe('dev impersonate — production cookie naming', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('writes the session under better-auth’s __Secure- prefixed name with Secure set', async () => {
    await withTest(async ({ pool }) => {
      const tenantId = crypto.randomUUID();
      const adminId = crypto.randomUUID();
      const targetId = crypto.randomUUID();

      await pool.query(`INSERT INTO core.tenants (id, name, slug) VALUES ($1, $2, $3)`, [
        tenantId,
        'Acme',
        `acme-${tenantId}`,
      ]);
      await pool.query(
        `INSERT INTO identity."user" (id, email, name, tenant_id) VALUES ($1, $2, $3, $4)`,
        [targetId, `${targetId}@test`, 'Target User', tenantId],
      );

      const app = buildApp(
        buildSession({ tenant_id: tenantId, user_id: adminId, roles: ['org.admin'] }),
      );
      const res = await app.request('/api/identity/v1/dev/impersonate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_id: targetId }),
      });
      expect(res.status).toBe(200);

      const cookies = res.headers.getSetCookie();
      const sessionSet = cookies.find((c) => c.startsWith('__Secure-seta.session_token='));
      // In production better-auth reads `__Secure-seta.session_token`; an
      // unprefixed cookie is silently ignored, so impersonation never takes hold.
      expect(sessionSet, `set-cookies: ${cookies.join(' | ')}`).toBeDefined();
      expect(sessionSet).toMatch(/;\s*Secure/i);
      // The unprefixed name must NOT be what we wrote in production.
      expect(cookies.some((c) => c.startsWith('seta.session_token='))).toBe(false);
    });
  });
});

describe('dev routes — non-production (open)', () => {
  it('lists assignable roles + empty grants for a fresh user', async () => {
    await withTest(async () => {
      const app = buildApp(
        buildSession({ tenant_id: crypto.randomUUID(), user_id: crypto.randomUUID(), roles: [] }),
      );
      const res = await app.request('/api/identity/v1/dev/my-roles');
      expect(res.status).toBe(200);
      const body = (await res.json()) as { assignable: string[]; grants: unknown[] };
      expect(body.assignable).toContain('org.admin');
      expect(body.grants).toEqual([]);
    });
  });

  it('rejects an unknown role slug with 400', async () => {
    await withTest(async () => {
      const app = buildApp(
        buildSession({ tenant_id: crypto.randomUUID(), user_id: crypto.randomUUID(), roles: [] }),
      );
      const res = await app.request('/api/identity/v1/dev/my-roles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role_slug: 'not.a.real.role' }),
      });
      expect(res.status).toBe(400);
    });
  });

  it('ownership guard: a user cannot revoke another user’s grant', async () => {
    await withTest(async ({ pool }) => {
      const tenantId = crypto.randomUUID();
      const victimId = crypto.randomUUID();
      const attackerId = crypto.randomUUID();
      const grantId = crypto.randomUUID();

      await pool.query(
        `INSERT INTO identity.role_grants (id, user_id, tenant_id, role_slug, scope_type, granted_via)
         VALUES ($1, $2, $3, 'org.admin', 'tenant', 'admin')`,
        [grantId, victimId, tenantId],
      );

      const app = buildApp(buildSession({ tenant_id: tenantId, user_id: attackerId, roles: [] }));
      const res = await app.request(`/api/identity/v1/dev/my-roles/${grantId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);

      // The victim's grant is untouched.
      const after = await pool.query<{ revoked_at: Date | null }>(
        `SELECT revoked_at FROM identity.role_grants WHERE id = $1`,
        [grantId],
      );
      expect(after.rows[0]?.revoked_at).toBeNull();
    });
  });
});
