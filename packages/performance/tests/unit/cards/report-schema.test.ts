import { describe, expect, it } from 'vitest';
import { CardPayloadSchema, ReportCardSchema } from '../../../src/backend/cards/schema.ts';

const validReport = {
  type: 'report' as const,
  title: 'EMP-031 — April review',
  blocks: [
    { kind: 'pie', title: 'Risk mix', data: [{ label: 'High', value: 8 }] },
    { kind: 'bar', title: 'KPI vs target', data: [{ label: 'KPI', value: 2.2 }] },
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
    { kind: 'table', title: 'Metrics', columns: ['Metric', 'Value'], rows: [['KPI', 2.2]] },
  ],
};

describe('ReportCardSchema', () => {
  it('parses a valid report with all four block kinds', () => {
    const card = ReportCardSchema.parse(validReport);
    expect(card.type).toBe('report');
    expect(card.blocks).toHaveLength(4);
    // `summary` defaults to null when omitted.
    expect(card.summary).toBeNull();
  });

  it('is reachable through the discriminated CardPayloadSchema', () => {
    const card = CardPayloadSchema.parse(validReport);
    expect(card.type).toBe('report');
  });

  it('rejects a block with an unknown kind', () => {
    const bad = { ...validReport, blocks: [{ kind: 'scatter', title: 'x', data: [] }] };
    expect(() => ReportCardSchema.parse(bad)).toThrow();
  });

  it('rejects a pie/bar block with empty data', () => {
    const bad = { ...validReport, blocks: [{ kind: 'pie', title: 'x', data: [] }] };
    expect(() => ReportCardSchema.parse(bad)).toThrow();
  });

  it('rejects a non-numeric chart value', () => {
    const bad = {
      ...validReport,
      blocks: [{ kind: 'bar', title: 'x', data: [{ label: 'KPI', value: 'high' }] }],
    };
    expect(() => ReportCardSchema.parse(bad)).toThrow();
  });

  it('requires at least one block', () => {
    expect(() => ReportCardSchema.parse({ ...validReport, blocks: [] })).toThrow();
  });
});
