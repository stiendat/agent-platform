import type { SessionScope } from '@seta/core';
import { emit, withEmit } from '@seta/core/events';
import { and, eq } from 'drizzle-orm';
import type { CustomDashboard, UpdateDashboardPatch } from '../../custom-dashboards/types.ts';
import type { dashboardWidgets as WidgetsTable } from '../../db/schema.ts';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { assertTenantScope, DashboardError, requireDashboardPerm } from './_common.ts';
import { mapDashboardRow, mapWidgetRow } from './_mappers.ts';

type WidgetInsert = typeof WidgetsTable.$inferInsert;

export async function saveCustomDashboardFull(input: {
  dashboard_id: string;
  patch: UpdateDashboardPatch;
  session: SessionScope;
}): Promise<CustomDashboard> {
  requireDashboardPerm(input.session, 'performance.dashboard.custom.update');

  let result!: CustomDashboard;

  await withEmit(
    { actor: { userId: input.session.user_id, tenantId: input.session.tenant_id } },
    async (tx) => {
      const [existing] = await tx
        .select()
        .from(customDashboards)
        .where(
          and(
            eq(customDashboards.id, input.dashboard_id),
            eq(customDashboards.tenant_id, input.session.tenant_id),
          ),
        )
        .limit(1);
      if (!existing)
        throw new DashboardError('NOT_FOUND', 'Dashboard not found', {
          dashboard_id: input.dashboard_id,
        });
      assertTenantScope(existing.tenant_id, input.session, 'dashboard', input.dashboard_id);

      const isOwner = existing.created_by === input.session.user_id;
      if (!isOwner) requireDashboardPerm(input.session, 'performance.dashboard.custom.update');

      const p = input.patch;
      const [updated] = await tx
        .update(customDashboards)
        .set({
          name: p.name ?? existing.name,
          period_filter: p.period_filter !== undefined ? p.period_filter : existing.period_filter,
          show_in_sidebar: p.show_in_sidebar ?? existing.show_in_sidebar,
          is_draft: p.is_draft ?? existing.is_draft,
          updated_at: new Date(),
        })
        .where(eq(customDashboards.id, input.dashboard_id))
        .returning();
      if (!updated) throw new Error('Failed to update dashboard');

      let widgetRows: (typeof dashboardWidgets.$inferSelect)[] = [];

      if (p.widgets) {
        await tx
          .delete(dashboardWidgets)
          .where(eq(dashboardWidgets.dashboard_id, input.dashboard_id));

        if (p.widgets.length > 0) {
          const values: WidgetInsert[] = p.widgets.map((w, i) => ({
            id: w.id ?? crypto.randomUUID(),
            dashboard_id: input.dashboard_id,
            name: w.name,
            sort_order: i,
            layout: {
              i: w.layout.i,
              x: w.layout.x,
              y: w.layout.y,
              w: w.layout.w,
              h: w.layout.h,
              minW: w.layout.minW ?? 2,
              minH: w.layout.minH ?? 2,
              heightMode: w.layout.heightMode ?? 'auto',
              heightPx: w.layout.heightPx,
            },
            content: w.content as Record<string, unknown>,
            widget_period: w.widgetPeriod ?? existing.period_filter ?? null,
            generation_prompt: w.generationPrompt ?? null,
          }));

          widgetRows = await tx.insert(dashboardWidgets).values(values).returning();
        }
      } else {
        widgetRows = await tx
          .select()
          .from(dashboardWidgets)
          .where(eq(dashboardWidgets.dashboard_id, input.dashboard_id))
          .orderBy(dashboardWidgets.sort_order);
      }

      await emit({
        aggregateType: 'performance.dashboard',
        aggregateId: input.dashboard_id,
        eventType: 'performance.dashboard.custom.updated',
        eventVersion: 1,
        tenantId: input.session.tenant_id,
        payload: { dashboard_id: input.dashboard_id, name: updated.name },
      });

      result = mapDashboardRow(updated, widgetRows);
    },
  );

  return result;
}
