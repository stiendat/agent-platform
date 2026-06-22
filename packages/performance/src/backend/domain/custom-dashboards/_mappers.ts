import type { CustomDashboard } from '../../custom-dashboards/types.ts';
import type { customDashboards, dashboardWidgets } from '../../db/schema.ts';

type DashboardRow = typeof customDashboards.$inferSelect;
type WidgetRow = typeof dashboardWidgets.$inferSelect;

export function mapDashboardRow(d: DashboardRow, widgets: WidgetRow[]): CustomDashboard {
  return {
    id: d.id,
    name: d.name,
    widgets: widgets.map(mapWidgetRow),
    periodFilter: d.period_filter ?? undefined,
    showInSidebar: d.show_in_sidebar,
    isDraft: d.is_draft,
    createdAt: d.created_at.toISOString(),
    updatedAt: d.updated_at.toISOString(),
  };
}

export function mapWidgetRow(w: WidgetRow): CustomDashboard['widgets'][0] {
  return {
    id: w.id,
    name: w.name,
    layout: w.layout,
    content: w.content as CustomDashboard['widgets'][0]['content'],
    sortOrder: w.sort_order,
    widgetPeriod: w.widget_period ?? undefined,
    generationPrompt: w.generation_prompt ?? undefined,
  };
}
