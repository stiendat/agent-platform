import { z } from 'zod';
import { CardPayloadSchema } from '../cards/schema.ts';

export type WidgetType = 'card' | 'text' | 'header' | 'indicator' | 'list';

export const WidgetLayoutSchema = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  // Height sizing: 'auto' (default) lets the widget grow to its content;
  // 'fixed' pins it to `heightPx` (set when the user drag-resizes height).
  heightMode: z.enum(['auto', 'fixed']).optional(),
  heightPx: z.number().optional(),
});
export type WidgetLayout = z.infer<typeof WidgetLayoutSchema>;

export const CardWidgetContentSchema = z.object({
  type: z.literal('card'),
  name: z.string(),
  card: CardPayloadSchema,
});
export type CardWidgetContent = z.infer<typeof CardWidgetContentSchema>;

export const TextWidgetContentSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
});
export type TextWidgetContent = z.infer<typeof TextWidgetContentSchema>;

export const HeaderWidgetContentSchema = z.object({
  type: z.literal('header'),
  content: z.string(),
});
export type HeaderWidgetContent = z.infer<typeof HeaderWidgetContentSchema>;

export const IndicatorWidgetContentSchema = z.object({
  type: z.literal('indicator'),
  label: z.string(),
  value: z.string(),
  trend: z.enum(['up', 'down', 'neutral']).optional(),
  change: z.string().optional(),
});
export type IndicatorWidgetContent = z.infer<typeof IndicatorWidgetContentSchema>;

export const ListWidgetContentSchema = z.object({
  type: z.literal('list'),
  title: z.string().optional(),
  items: z.array(z.string()),
});
export type ListWidgetContent = z.infer<typeof ListWidgetContentSchema>;

export const WidgetContentSchema = z.discriminatedUnion('type', [
  CardWidgetContentSchema,
  TextWidgetContentSchema,
  HeaderWidgetContentSchema,
  IndicatorWidgetContentSchema,
  ListWidgetContentSchema,
]);
export type WidgetContent = z.infer<typeof WidgetContentSchema>;

export const DashboardWidgetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  layout: WidgetLayoutSchema,
  content: WidgetContentSchema,
  widgetPeriod: z.string().optional(),
  generationPrompt: z.string().optional(),
  sortOrder: z.number().optional(),
});
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;

export const CustomDashboardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  widgets: z.array(DashboardWidgetSchema),
  periodFilter: z.string().nullable().optional(),
  showInSidebar: z.boolean(),
  isDraft: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomDashboard = z.infer<typeof CustomDashboardSchema>;

export const CreateDashboardInputSchema = z.object({
  name: z.string().min(1).max(255),
  period_filter: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
  widgets: z
    .array(
      z.object({
        name: z.string().min(1),
        content: WidgetContentSchema,
        layout: WidgetLayoutSchema.optional(),
        widgetPeriod: z.string().optional(),
        generationPrompt: z.string().optional(),
      }),
    )
    .optional(),
});
export type CreateDashboardInput = z.infer<typeof CreateDashboardInputSchema>;

export const UpdateDashboardPatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  period_filter: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .nullable()
    .optional(),
  show_in_sidebar: z.boolean().optional(),
  is_draft: z.boolean().optional(),
  widgets: z.array(DashboardWidgetSchema).optional(),
});
export type UpdateDashboardPatch = z.infer<typeof UpdateDashboardPatchSchema>;

export const CreateWidgetInputSchema = z.object({
  dashboard_id: z.string().uuid(),
  name: z.string().min(1),
  content: WidgetContentSchema,
  widgetPeriod: z.string().optional(),
  generationPrompt: z.string().optional(),
});
export type CreateWidgetInput = z.infer<typeof CreateWidgetInputSchema>;

export const AUTO_HEIGHTS: Record<string, number> = {
  card: 5,
  text: 2,
  header: 1,
  indicator: 2,
  list: 4,
};
