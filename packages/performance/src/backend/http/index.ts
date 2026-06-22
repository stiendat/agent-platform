import type { RouteBuildDeps, SessionEnv } from '@seta/core';
import { Hono } from 'hono';
import { registerCustomDashboardRoutes } from './custom-dashboards.ts';

export function buildPerformanceRoutes(_deps: RouteBuildDeps): Hono<SessionEnv> {
  const app = new Hono<SessionEnv>();
  registerCustomDashboardRoutes(app);
  return app;
}
