import { type AgentToolContext, actorFromContext, defineAgentTool } from '@seta/agent-sdk';
import type { SessionScope } from '@seta/core';
import { z } from 'zod';
import { performanceRbac } from '../../rbac.ts';
import { CardPayloadSchema } from '../cards/schema.ts';
import { WidgetContentSchema } from '../custom-dashboards/types.ts';
import { saveWidget } from '../domain/custom-dashboards/index.ts';

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

export const createDashboardWidgetTool = defineAgentTool({
  id: 'performance_createDashboardWidget',
  name: 'Create Dashboard Widget',
  description:
    'Add a card, chart, text block, header, indicator, or list to the custom dashboard being edited. ' +
    'Call this after performance_renderCard or performance_renderReport to persist the generated ' +
    'content as a canvas widget. Use the dashboard_id from the page context.',
  input: z.object({
    dashboard_id: z.string().uuid().describe('The dashboard ID from page context.'),
    name: z.string().min(1).describe('Short display name for the widget.'),
    content: WidgetContentSchema.describe(
      'The widget content (card, text, header, indicator, or list).',
    ),
    widgetPeriod: z.string().optional().describe('Period the data covers (e.g. "2026-04").'),
    generationPrompt: z
      .string()
      .optional()
      .describe('The user prompt that produced this content (for re-generation).'),
  }),
  output: z.object({
    widget_id: z.string(),
    name: z.string(),
  }),
  rbac: 'performance.dashboard.custom.widgets.write',
  execute: async (input, ctx) => {
    const session = buildSession(ctx);
    const widget = await saveWidget({
      dashboard_id: input.dashboard_id,
      name: input.name,
      content: input.content,
      widgetPeriod: input.widgetPeriod,
      generationPrompt: input.generationPrompt,
      session,
    });
    return { widget_id: widget.id, name: widget.name };
  },
});
