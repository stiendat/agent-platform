import type { RouteBuildDeps, SessionEnv } from '@seta/core';
import type { Hono } from 'hono';
import type { CreateDashboardInput, UpdateDashboardPatch } from '../custom-dashboards/types.ts';
import {
  createCustomDashboard,
  deleteCustomDashboard,
  getCustomDashboard,
  listCustomDashboards,
  saveCustomDashboardFull,
} from '../domain/custom-dashboards/index.ts';

export function registerCustomDashboardRoutes(app: Hono<SessionEnv>): void {
  app.get('/api/performance/v1/dashboards/custom', async (c) => {
    const session = c.get('user');
    const dashboards = await listCustomDashboards({ session });
    return c.json({ dashboards });
  });

  app.post('/api/performance/v1/dashboards/custom', async (c) => {
    const session = c.get('user');
    const body = await c.req.json();
    const dashboard = await createCustomDashboard({ ...body, session });
    return c.json({ dashboard }, 201);
  });

  app.get('/api/performance/v1/dashboards/custom/:id', async (c) => {
    const session = c.get('user');
    const dashboard = await getCustomDashboard({ dashboard_id: c.req.param('id'), session });
    if (!dashboard) return c.json({ error: 'not_found' }, 404);
    return c.json({ dashboard });
  });

  app.put('/api/performance/v1/dashboards/custom/:id', async (c) => {
    const session = c.get('user');
    const body = await c.req.json();
    const dashboard = await saveCustomDashboardFull({
      dashboard_id: c.req.param('id'),
      patch: body,
      session,
    });
    return c.json({ dashboard });
  });

  app.delete('/api/performance/v1/dashboards/custom/:id', async (c) => {
    const session = c.get('user');
    await deleteCustomDashboard({ dashboard_id: c.req.param('id'), session });
    return c.body(null, 204);
  });
}
