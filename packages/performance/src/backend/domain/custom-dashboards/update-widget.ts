import type { SessionScope } from '@seta/core';
import { emit, withEmit } from '@seta/core/events';
import { and, eq } from 'drizzle-orm';
import type { DashboardWidget, WidgetContent } from '../../custom-dashboards/types.ts';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { assertTenantScope, DashboardError, requireDashboardPerm } from './_common.ts';
import { mapWidgetRow } from './_mappers.ts';

export interface UpdateWidgetInput {
  dashboard_id: string;
  widget_id: string;
  name?: string;
  content?: WidgetContent;
  widgetPeriod?: string;
  generationPrompt?: string;
  session: SessionScope;
}

/**
 * Replace an existing widget's content/name in place (edit, not append). Used by
 * the per-card "Edit with AI" flow so a scoped prompt rewrites the targeted card
 * rather than adding a duplicate.
 */
export async function updateWidget(input: UpdateWidgetInput): Promise<DashboardWidget> {
  requireDashboardPerm(input.session, 'performance.dashboard.custom.widgets.write');

  let result!: DashboardWidget;

  await withEmit(
    { actor: { userId: input.session.user_id, tenantId: input.session.tenant_id } },
    async (tx) => {
      const [d] = await tx
        .select()
        .from(customDashboards)
        .where(eq(customDashboards.id, input.dashboard_id))
        .limit(1);
      if (!d)
        throw new DashboardError('NOT_FOUND', 'Dashboard not found', {
          dashboard_id: input.dashboard_id,
        });
      assertTenantScope(d.tenant_id, input.session, 'dashboard', input.dashboard_id);

      const patch: Partial<typeof dashboardWidgets.$inferInsert> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.content !== undefined) patch.content = input.content as Record<string, unknown>;
      if (input.widgetPeriod !== undefined) patch.widget_period = input.widgetPeriod;
      if (input.generationPrompt !== undefined) patch.generation_prompt = input.generationPrompt;

      const [row] = await tx
        .update(dashboardWidgets)
        .set(patch)
        .where(
          and(
            eq(dashboardWidgets.id, input.widget_id),
            eq(dashboardWidgets.dashboard_id, input.dashboard_id),
          ),
        )
        .returning();
      if (!row) {
        throw new DashboardError('NOT_FOUND', 'Widget not found', {
          dashboard_id: input.dashboard_id,
          widget_id: input.widget_id,
        });
      }

      await emit({
        aggregateType: 'performance.dashboard',
        aggregateId: input.dashboard_id,
        eventType: 'performance.dashboard.widget.updated',
        eventVersion: 1,
        tenantId: input.session.tenant_id,
        payload: { dashboard_id: input.dashboard_id, widget_id: row.id, name: row.name },
      });

      result = mapWidgetRow(row);
    },
  );

  return result;
}
