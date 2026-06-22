import { defineAgentTool } from '@seta/agent-sdk';
import { z } from 'zod';
import { ReportBlockSchema, ReportCardSchema } from '../cards/schema.ts';
import { resolveSession } from './context.ts';

/**
 * Render an AI-composed report card from basic charts (pie / bar / line / table).
 *
 * Unlike `performance_renderCard` (which assembles its data server-side), this
 * tool is a VALIDATE-AND-PASS-THROUGH: the agent first gathers numbers with the
 * read tools, then passes the data + chart kinds here. The `.parse` is the
 * guardrail — a malformed block is rejected rather than rendered.
 *
 * Anti-hallucination + RBAC: the agent must only chart values returned by a read
 * tool this turn (see the ARIA instructions). Sensitive HR fields (promotion
 * readiness, salary band) are redacted upstream at the read-tool boundary, so
 * they never reach the model and therefore never reach a chart. The tool stays
 * gated on `performance.norm.read`.
 */
export const renderReportTool = defineAgentTool({
  id: 'performance_renderReport',
  name: 'Render Report',
  description:
    'Render a multi-chart report for the user (pie, bar, line, table). Use when the ' +
    'answer is a data-rich report or dashboard rather than a single fixed card. FIRST ' +
    'gather the numbers with the read tools, THEN call this tool passing ONLY values ' +
    'those tools returned — never invent, estimate, or recompute numbers. Choose the ' +
    'chart kind that fits each block: pie for parts of a whole, bar to compare ' +
    'categories, line for a trend over an ordered axis (e.g. period), table for rosters/detail.',
  input: z.object({
    title: z.string().trim().min(1).describe('Report headline, e.g. "EMP-031 — April review".'),
    summary: z
      .string()
      .trim()
      .min(1)
      .nullable()
      .default(null)
      .describe('Optional one-line framing for the report.'),
    blocks: z
      .array(ReportBlockSchema)
      .min(1)
      .max(6)
      .describe('1–6 chart blocks; each is discriminated on `kind` (pie/bar/line/table).'),
  }),
  output: z.object({ card: ReportCardSchema }),
  rbac: 'performance.norm.read',
  execute: async (input, ctx) => {
    // Resolve the session so the tool is RBAC-gated like the other card tools;
    // the audience-shaping of the data already happened at the read-tool boundary.
    resolveSession(ctx);
    return { card: ReportCardSchema.parse({ type: 'report', ...input }) };
  },
});
