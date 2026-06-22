import type { SessionScope } from '@seta/core';
import { emit, withEmit } from '@seta/core/events';
import { eq } from 'drizzle-orm';
import type { CreateWidgetInput, DashboardWidget } from '../../custom-dashboards/types.ts';
import type { dashboardWidgets as WidgetsTable } from '../../db/schema.ts';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { assertTenantScope, DashboardError, requireDashboardPerm } from './_common.ts';
import { mapWidgetRow } from './_mappers.ts';

type WidgetInsert = typeof WidgetsTable.$inferInsert;

export async function saveWidget(
  input: CreateWidgetInput & { session: SessionScope },
): Promise<DashboardWidget> {
  requireDashboardPerm(input.session, 'performance.dashboard.custom.widgets.write');
  const widgetId = crypto.randomUUID();

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

      const values: WidgetInsert = {
        id: widgetId,
        dashboard_id: input.dashboard_id,
        name: input.name,
        sort_order: 99,
        layout: { i: widgetId, x: 0, y: 99, w: 6, h: 4, minW: 2, minH: 2 },
        content: input.content as Record<string, unknown>,
        widget_period: input.widgetPeriod ?? d.period_filter ?? null,
        generation_prompt: input.generationPrompt ?? null,
      };

      const [row] = await tx.insert(dashboardWidgets).values(values).returning();
      if (!row) throw new Error('Failed to insert widget');

      await emit({
        aggregateType: 'performance.dashboard',
        aggregateId: input.dashboard_id,
        eventType: 'performance.dashboard.widget.created',
        eventVersion: 1,
        tenantId: input.session.tenant_id,
        payload: { dashboard_id: input.dashboard_id, widget_id: row.id, name: row.name },
      });

      result = mapWidgetRow(row);
    },
  );

  return result;
}
