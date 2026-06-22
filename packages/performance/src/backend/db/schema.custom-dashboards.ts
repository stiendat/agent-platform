import { boolean, index, integer, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { performanceSchema } from './_pg-schema.ts';

export const customDashboards = performanceSchema.table(
  'custom_dashboards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    period_filter: text('period_filter'),
    show_in_sidebar: boolean('show_in_sidebar').notNull().default(false),
    is_draft: boolean('is_draft').notNull().default(true),
    created_by: uuid('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('custom_dashboards_by_tenant_owner').on(t.tenant_id, t.created_by),
    index('custom_dashboards_by_tenant_draft').on(t.tenant_id, t.is_draft),
  ],
);

export const dashboardWidgets = performanceSchema.table(
  'dashboard_widgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dashboard_id: uuid('dashboard_id').notNull(),
    name: text('name').notNull(),
    sort_order: integer('sort_order').notNull().default(0),
    layout: jsonb('layout').notNull().$type<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW: number;
      minH: number;
    }>(),
    content: jsonb('content').notNull().$type<Record<string, unknown>>(),
    widget_period: text('widget_period'),
    generation_prompt: text('generation_prompt'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('widgets_by_dashboard').on(t.dashboard_id)],
);
