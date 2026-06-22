import type { SessionScope } from '@seta/core';
import { eq } from 'drizzle-orm';
import type { CustomDashboard } from '../../custom-dashboards/types.ts';
import { performanceDb } from '../../db/client.ts';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { requireDashboardPerm } from './_common.ts';
import { mapDashboardRow } from './_mappers.ts';

export async function listCustomDashboards(input: {
  session: SessionScope;
}): Promise<CustomDashboard[]> {
  requireDashboardPerm(input.session, 'performance.dashboard.custom.read');
  const db = performanceDb();

  const rows = await db
    .select()
    .from(customDashboards)
    .where(eq(customDashboards.tenant_id, input.session.tenant_id))
    .orderBy(customDashboards.updated_at);

  const dashboards: CustomDashboard[] = [];

  for (const d of rows) {
    const isOwner = d.created_by === input.session.user_id;
    if (d.is_draft && !isOwner) continue;

    const widgets = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.dashboard_id, d.id))
      .orderBy(dashboardWidgets.sort_order);

    dashboards.push(mapDashboardRow(d, widgets));
  }

  return dashboards;
}
