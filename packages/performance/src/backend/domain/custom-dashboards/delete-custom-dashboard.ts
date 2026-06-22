import type { SessionScope } from '@seta/core';
import { emit, withEmit } from '@seta/core/events';
import { and, eq } from 'drizzle-orm';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { assertTenantScope, DashboardError, requireDashboardPerm } from './_common.ts';

export async function deleteCustomDashboard(input: {
  dashboard_id: string;
  session: SessionScope;
}): Promise<void> {
  requireDashboardPerm(input.session, 'performance.dashboard.custom.delete');

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
      if (!isOwner) requireDashboardPerm(input.session, 'performance.dashboard.custom.delete');

      await tx
        .delete(dashboardWidgets)
        .where(eq(dashboardWidgets.dashboard_id, input.dashboard_id));
      await tx.delete(customDashboards).where(eq(customDashboards.id, input.dashboard_id));

      await emit({
        aggregateType: 'performance.dashboard',
        aggregateId: input.dashboard_id,
        eventType: 'performance.dashboard.custom.deleted',
        eventVersion: 1,
        tenantId: input.session.tenant_id,
        payload: { dashboard_id: input.dashboard_id },
      });
    },
  );
}
