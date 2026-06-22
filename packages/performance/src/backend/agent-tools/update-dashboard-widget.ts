import { type AgentToolContext, actorFromContext, defineAgentTool } from '@seta/agent-sdk';
import type { SessionScope } from '@seta/core';
import { z } from 'zod';
import { performanceRbac } from '../../rbac.ts';
import { WidgetContentSchema } from '../custom-dashboards/types.ts';
import { updateWidget } from '../domain/custom-dashboards/index.ts';

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

export const updateDashboardWidgetTool = defineAgentTool({
  id: 'performance_updateDashboardWidget',
  name: 'Update Dashboard Widget',
  description:
    'Replace an EXISTING widget on the custom dashboard in place — edit, not append. ' +
    'Use this (NOT performance_createDashboardWidget) when the user asks to change, ' +
    'rewrite, or re-generate a specific widget that is already on the canvas. The page ' +
    'context / user prompt provides the widget_id to target. For a regenerated card, ' +
    'call performance_renderCard or performance_renderReport first, then pass the new ' +
    'content here with the same widget_id.',
  input: z.object({
    dashboard_id: z.string().uuid().describe('The dashboard ID from page context.'),
    widget_id: z.string().uuid().describe('The id of the existing widget to replace.'),
    name: z.string().min(1).optional().describe('New display name (omit to keep current).'),
    content: WidgetContentSchema.optional().describe('New widget content (omit to keep current).'),
    widgetPeriod: z.string().optional().describe('Period the data covers (e.g. "2026-04").'),
    generationPrompt: z.string().optional().describe('The user prompt that produced this edit.'),
  }),
  output: z.object({
    widget_id: z.string(),
    name: z.string(),
  }),
  rbac: 'performance.dashboard.custom.widgets.write',
  execute: async (input, ctx) => {
    const session = buildSession(ctx);
    const widget = await updateWidget({
      dashboard_id: input.dashboard_id,
      widget_id: input.widget_id,
      name: input.name,
      content: input.content,
      widgetPeriod: input.widgetPeriod,
      generationPrompt: input.generationPrompt,
      session,
    });
    return { widget_id: widget.id, name: widget.name };
  },
});
