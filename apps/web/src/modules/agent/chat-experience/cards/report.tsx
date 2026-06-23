import type {
  BarBlock,
  LineBlock,
  PieBlock,
  ReportBlock,
  ReportCard as ReportCardData,
  TableBlock,
} from '@seta/performance/contracts';
import {
  CHART_AXIS_STROKE,
  CHART_GRID_STROKE,
  CHART_TICK,
  CHART_TOOLTIP_STYLE,
  cn,
  DonutChart,
  type DonutSlice,
  StackedBarChart,
} from '@seta/shared-ui';
import { Download } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type Cell, downloadCsv } from './export';

// Theme-token series palette — cycled by index so charts stay on-theme in light
// and dark. recharts accepts `var(--token)` for SVG fills/strokes.
const SERIES_COLORS = [
  'var(--color-primary)',
  'var(--color-semantic-warning)',
  'var(--color-semantic-success)',
  'var(--color-danger)',
  'var(--color-ink-subtle)',
  'var(--color-ink-muted)',
] as const;

// Risk-word labels (high/medium/low) get their semantic colour; everything else
// cycles the palette. The agent's labels are free text, so this is best-effort.
function sliceColor(label: string, index: number): string {
  const l = label.toLowerCase();
  if (l.includes('high')) return 'var(--color-danger)';
  if (l.includes('medium') || l.includes('watch')) return 'var(--color-semantic-warning)';
  if (l.includes('low')) return 'var(--color-semantic-success)';
  return SERIES_COLORS[index % SERIES_COLORS.length] as string;
}

// A single block is just a labelled chart — no border or background of its own.
// The card frame is the only frame; nested boxes (card-in-card) broke the uniform
// look against sibling cards, which carry one flat frame.
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-caption font-medium uppercase tracking-wide text-ink-subtle">
        {title}
      </h4>
      {children}
    </section>
  );
}

function PieBlockView({ block }: { block: PieBlock }) {
  const slices: DonutSlice[] = block.data.map((d, i) => ({
    key: `${d.label}-${i}`,
    name: d.label,
    value: d.value,
    color: sliceColor(d.label, i),
  }));
  return (
    <Block title={block.title}>
      <DonutChart slices={slices} legend="right" height={200} />
    </Block>
  );
}

function BarBlockView({ block }: { block: BarBlock }) {
  const rows = block.data.map((d) => ({ label: d.label, value: d.value }));
  const name = block.unit ? `Value (${block.unit})` : 'Value';
  return (
    <Block title={block.title}>
      <StackedBarChart
        rows={rows}
        series={[{ key: 'value', name, color: 'var(--color-primary)' }]}
        orientation="vertical"
        height={220}
      />
    </Block>
  );
}

function LineBlockView({ block }: { block: LineBlock }) {
  // Merge series into row records keyed by x, preserving first-seen x order.
  const order: string[] = [];
  const byX = new Map<string, Record<string, string | number>>();
  for (const s of block.series) {
    for (const p of s.points) {
      let row = byX.get(p.x);
      if (!row) {
        row = { x: p.x };
        byX.set(p.x, row);
        order.push(p.x);
      }
      row[s.name] = p.y;
    }
  }
  const data = order.map((x) => byX.get(x) as Record<string, string | number>);
  return (
    <Block title={block.title}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: 4, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis dataKey="x" tick={CHART_TICK} stroke={CHART_AXIS_STROKE} tickLine={false} />
          <YAxis
            tick={CHART_TICK}
            stroke={CHART_AXIS_STROKE}
            tickLine={false}
            axisLine={false}
            unit={block.unit ?? undefined}
          />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          {block.series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Block>
  );
}

function TableBlockView({ block }: { block: TableBlock }) {
  return (
    <Block title={block.title}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => downloadCsv(block.title, block.columns, block.rows as Cell[][])}
          className="mb-2 inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-caption text-ink-subtle transition-colors hover:bg-surface-2"
        >
          <Download className="size-3" /> CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-ink-subtle">
              {block.columns.map((c) => (
                <th key={c} className="px-2 py-1 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr
                key={row.map(String).join('')}
                className="border-b border-hairline/50 last:border-0"
              >
                {row.map((cell, c) => (
                  <td
                    key={block.columns[c] ?? String(cell)}
                    className={cn('px-2 py-1 text-ink', c > 0 && 'tabular-nums')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Block>
  );
}

function ReportBlockView({ block }: { block: ReportBlock }) {
  switch (block.kind) {
    case 'pie':
      return <PieBlockView block={block} />;
    case 'bar':
      return <BarBlockView block={block} />;
    case 'line':
      return <LineBlockView block={block} />;
    case 'table':
      return <TableBlockView block={block} />;
    default:
      return null;
  }
}

/**
 * AI-composed report card: a titled stack of basic charts (pie/bar/line/table).
 *
 * Carries the same single frame + header bar as its sibling cards (see
 * cards/index.tsx) so it reads uniformly in both the chat transcript and on a
 * custom dashboard. On a dashboard the grid wrapper draws an identical frame at
 * the same radius; the two overlap to one line — exactly how the data cards
 * behave. Blocks are separated by hairline dividers, never nested boxes.
 */
export function ReportCard({ card }: { card: ReportCardData }) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <header className="border-b border-hairline bg-surface-2 px-4 py-3.5">
        <h3 className="text-body font-semibold text-ink">{card.title}</h3>
        {card.summary && <p className="mt-0.5 text-body-sm text-ink-subtle">{card.summary}</p>}
      </header>
      <div className="divide-y divide-hairline px-4">
        {card.blocks.map((block) => (
          <div key={`${block.kind}:${block.title}`} className="py-4 first:pt-3 last:pb-3">
            <ReportBlockView block={block} />
          </div>
        ))}
      </div>
    </div>
  );
}
