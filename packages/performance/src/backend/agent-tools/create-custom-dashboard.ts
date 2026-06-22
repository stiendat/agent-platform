import { type AgentToolContext, actorFromContext, defineAgentTool } from '@seta/agent-sdk';
import type { SessionScope } from '@seta/core';
import { z } from 'zod';
import { performanceRbac } from '../../rbac.ts';
import { WidgetContentSchema } from '../custom-dashboards/types.ts';
import { createCustomDashboard } from '../domain/custom-dashboards/index.ts';

function buildSession(ctx: AgentToolContext): SessionScope {
  const actor = actorFromContext(ctx);
  const rc = ctx.requestContext as { get(k: string): unknown } | undefined;
  const tenantId = rc?.get('tenant_id') as string;
  const roles = (rc?.get('role_summary') as { roles?: string[] } | undefined)?.roles ?? [];

  const permissions = new Set<string>();
  for (const role of performanceRbac.roles) {
    if (roles.includes(role.slug)) {
      for (const p of role.permissions) permissions.add(p);
    }
  }

  return {
    session_id: '',
    user_id: actor.user_id,
    tenant_id: tenantId,
    email: '',
    display_name: '',
    role_summary: { roles, cross_tenant_read: false },
    role_summary_hash: '',
    permissions,
    accessible_group_ids: [],
    cross_tenant_read: false,
    built_at: new Date(),
    invalidated_at: null,
  };
}

export const createCustomDashboardTool = defineAgentTool({
  id: 'performance_createCustomDashboard',
  name: 'Create Custom Dashboard',
  description:
    'Create a new custom dashboard with optional initial widgets. Use when the user wants to ' +
    'build a new dashboard from their natural language request. After creating the dashboard, ' +
    'call performance_createDashboardWidget to populate it with widgets.',
  input: z.object({
    name: z.string().min(1).describe('Dashboard name.'),
    period_filter: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional()
      .describe('Period filter, e.g. "2026-04".'),
  }),
  output: z.object({
    dashboard_id: z.string(),
    name: z.string(),
  }),
  rbac: 'performance.dashboard.custom.create',
  execute: async (input, ctx) => {
    const session = buildSession(ctx);
    const dashboard = await createCustomDashboard({
      name: input.name,
      period_filter: input.period_filter,
      session,
    });
    return { dashboard_id: dashboard.id, name: dashboard.name };
  },
});
