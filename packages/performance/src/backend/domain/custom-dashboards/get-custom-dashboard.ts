import type { SessionScope } from '@seta/core';
import { and, eq } from 'drizzle-orm';
import type { CustomDashboard } from '../../custom-dashboards/types.ts';
import { performanceDb } from '../../db/client.ts';
import { customDashboards, dashboardWidgets } from '../../db/schema.ts';
import { mapDashboardRow } from './_mappers.ts';

export async function getCustomDashboard(input: {
  dashboard_id: string;
  session: SessionScope;
}): Promise<CustomDashboard | null> {
  const db = performanceDb();

  const [d] = await db
    .select()
    .from(customDashboards)
    .where(
      and(
        eq(customDashboards.id, input.dashboard_id),
        eq(customDashboards.tenant_id, input.session.tenant_id),
      ),
    )
    .limit(1);

  if (!d) return null;

  const isOwner = d.created_by === input.session.user_id;
  if (d.is_draft && !isOwner) return null;

  const widgets = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.dashboard_id, input.dashboard_id))
    .orderBy(dashboardWidgets.sort_order);

  return mapDashboardRow(d, widgets);
}
