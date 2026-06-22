import type { SessionScope } from '@seta/core';
import { emit, withEmit } from '@seta/core/events';
import type { CreateDashboardInput, CustomDashboard } from '../../custom-dashboards/types.ts';
import type { dashboardWidgets as WidgetsTable } from '../../db/schema.ts';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { requireDashboardPerm } from './_common.ts';
import { mapDashboardRow } from './_mappers.ts';

type WidgetInsert = typeof WidgetsTable.$inferInsert;

export async function createCustomDashboard(
  input: CreateDashboardInput & { session: SessionScope },
): Promise<CustomDashboard> {
  requireDashboardPerm(input.session, 'performance.dashboard.custom.create');

  let result!: CustomDashboard;

  await withEmit(
    { actor: { userId: input.session.user_id, tenantId: input.session.tenant_id } },
    async (tx) => {
      const dashboardId = crypto.randomUUID();

      const [row] = await tx
        .insert(customDashboards)
        .values({
          id: dashboardId,
          tenant_id: input.session.tenant_id,
          name: input.name,
          period_filter: input.period_filter ?? null,
          created_by: input.session.user_id,
        })
        .returning();
      if (!row) throw new Error('Failed to insert custom dashboard');

      const now = row.created_at.toISOString();
      let widgetRows: (typeof dashboardWidgets.$inferSelect)[] = [];

      if (input.widgets && input.widgets.length > 0) {
        const values: WidgetInsert[] = input.widgets.map((w, i) => ({
          id: crypto.randomUUID(),
          dashboard_id: dashboardId,
          name: w.name,
          sort_order: i,
          layout: {
            i: w.layout?.i ?? crypto.randomUUID(),
            x: w.layout?.x ?? 0,
            y: w.layout?.y ?? i,
            w: w.layout?.w ?? 6,
            h: w.layout?.h ?? 4,
            minW: w.layout?.minW ?? 2,
            minH: w.layout?.minH ?? 2,
            heightMode: w.layout?.heightMode ?? 'auto',
            heightPx: w.layout?.heightPx,
          },
          content: w.content as Record<string, unknown>,
          widget_period: w.widgetPeriod ?? input.period_filter ?? null,
          generation_prompt: w.generationPrompt ?? null,
        }));

        widgetRows = await tx.insert(dashboardWidgets).values(values).returning();
      }

      await emit({
        aggregateType: 'performance.dashboard',
        aggregateId: dashboardId,
        eventType: 'performance.dashboard.custom.created',
        eventVersion: 1,
        tenantId: input.session.tenant_id,
        payload: { dashboard_id: dashboardId, name: row.name, created_by: row.created_by },
      });

      result = {
        id: dashboardId,
        name: row.name,
        widgets: widgetRows.map((wr) => ({
          id: wr.id,
          name: wr.name,
          layout: wr.layout,
          content: wr.content as CustomDashboard['widgets'][0]['content'],
          sortOrder: wr.sort_order,
          widgetPeriod: wr.widget_period ?? undefined,
          generationPrompt: wr.generation_prompt ?? undefined,
        })),
        periodFilter: row.period_filter ?? undefined,
        showInSidebar: row.show_in_sidebar,
        isDraft: row.is_draft,
        createdAt: now,
        updatedAt: now,
      };
    },
  );

  return result;
}
