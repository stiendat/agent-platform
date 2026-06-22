import { requiredPermissionFor } from '@seta/agent-sdk';
import { makeToolContext } from '@seta/agent-sdk/testing';
import { describe, expect, it } from 'vitest';
import { renderReportTool } from '../../../src/backend/agent-tools/render-report.ts';
import type { CardPayload } from '../../../src/backend/cards/schema.ts';

type Audience = 'hr' | 'leader' | 'bod';

function ctxFor(audience: Audience) {
  return makeToolContext({
    user_id: `u-${audience}`,
    permissions: ['performance.norm.read'],
    role_summary: { roles: [`performance.${audience}`], cross_tenant_read: false },
  });
}

async function render(audience: Audience, input: Record<string, unknown>): Promise<CardPayload> {
  const out = (await renderReportTool.execute!(input as never, ctxFor(audience))) as {
    card: CardPayload;
  };
  return out.card;
}

const goodBlocks = [
  { kind: 'pie', title: 'Risk mix', data: [{ label: 'High', value: 8 }] },
  {
    kind: 'line',
    title: 'KPI trend',
    series: [
      {
        name: 'KPI',
        points: [
          { x: '2026-03', y: 2.8 },
          { x: '2026-04', y: 2.2 },
        ],
      },
    ],
  },
];

describe('performance_renderReport tool', () => {
  it('is gated on performance.norm.read', () => {
    expect(requiredPermissionFor(renderReportTool)).toBe('performance.norm.read');
  });

  it('renders a report card from valid composed blocks', async () => {
    const card = await render('hr', { title: 'EMP-031 — April review', blocks: goodBlocks });
    expect(card.type).toBe('report');
    if (card.type === 'report') {
      expect(card.title).toBe('EMP-031 — April review');
      expect(card.blocks).toHaveLength(2);
      expect(card.summary).toBeNull();
    }
  });

  it('works for a non-HR audience (data is shaped upstream at the read tools)', async () => {
    const card = await render('leader', { title: 'Account B risk', blocks: goodBlocks });
    expect(card.type).toBe('report');
  });

  // Malformed input is stopped by the tool's input schema (Mastra validates
  // `inputSchema` before execute runs); the guardrail yields no report card. The
  // schema-level rejection itself is asserted in report-schema.test.ts.
  it('does not produce a report card for a malformed block', async () => {
    const card = await render('hr', {
      title: 'x',
      blocks: [{ kind: 'scatter', title: 'y', data: [] }],
    }).catch(() => undefined);
    expect(card?.type).not.toBe('report');
  });

  it('does not produce a report card when blocks is empty', async () => {
    const card = await render('hr', { title: 'x', blocks: [] }).catch(() => undefined);
    expect(card?.type).not.toBe('report');
  });
});
