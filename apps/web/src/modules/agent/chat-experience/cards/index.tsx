import { useAui } from '@assistant-ui/react';
import type {
  AccessDeniedCard as AccessDeniedCardData,
  AccountSummaryCard as AccountSummaryCardData,
  AtRiskListCard as AtRiskListCardData,
  CardPayload,
  CardRiskLevel,
  EmployeeProfileCard as EmployeeProfileCardData,
  HumanReviewFlagCard as HumanReviewFlagCardData,
  InlineTranscriptCard as InlineTranscriptCardData,
} from '@seta/performance/contracts';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@seta/shared-ui';
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Lock,
  Sparkles,
  TrendingDown,
  UserCircle2,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { AskAria, AskAriaProvider, type AskAriaSend, AskGlyph, interactive } from './ask-aria';
import { type Cell, downloadCsv, downloadXls } from './export';
import { ReportCard } from './report';
import {
  allocationTone,
  kpiTone,
  overtimeTone,
  RISK_PRESENTATION,
  riskToTone,
  TONE_BAR,
  TONE_TEXT,
  type Tone,
  violationsTone,
} from './risk';

// ─── Risk pills ───────────────────────────────────────────────────────────────

// A display-only risk pill (span) — safe to nest inside a clickable button row.
function RiskPillSpan({ level }: { level: CardRiskLevel }) {
  const { label, pill } = RISK_PRESENTATION[level];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-medium uppercase',
        pill,
      )}
    >
      {label}
    </span>
  );
}

// A risk pill rendered AS the button — valid phrasing content inside a PopoverTrigger.
function RiskBadgeButton({ level }: { level: CardRiskLevel }) {
  const { label, pill } = RISK_PRESENTATION[level];
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-medium uppercase transition-opacity hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1',
        pill,
      )}
    >
      {label}
    </button>
  );
}

// ─── Export menu ────────────────────────────────────────────────────────────────

function ExportMenu({
  basename,
  headers,
  rows,
}: {
  basename: string;
  headers: string[];
  rows: Cell[][];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5 text-ink-muted">
          <Download className="size-3.5" />
          Export
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-caption text-ink-subtle">
          {rows.length} row{rows.length === 1 ? '' : 's'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => downloadCsv(`${basename}.csv`, headers, rows)}>
          <FileText className="size-4 text-ink-muted" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadXls(`${basename}.xls`, headers, rows)}>
          <FileSpreadsheet className="size-4 text-ink-muted" />
          Excel (.xls)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Turn a card title into a safe, dated-looking download basename. */
function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'export'
  );
}

// ─── Card 1 · employee_profile_report ──────────────────────────────────────────

export function EmployeeProfileCard({ card }: { card: EmployeeProfileCardData }) {
  const id = card.employee.memberId;
  const period = card.reviewPeriod;
  const kpiPct = card.kpi.target > 0 ? Math.min(100, (card.kpi.score / card.kpi.target) * 100) : 0;
  const kt = kpiTone(card.kpi.score, card.kpi.target);
  const signalsTone: Extract<Tone, 'danger' | 'warn'> =
    card.riskBadge === 'high' ? 'danger' : 'warn';
  const signalBox =
    signalsTone === 'danger'
      ? 'bg-danger-tint border-danger/30 text-danger-ink'
      : 'bg-semantic-warning-tint border-semantic-warning/30 text-semantic-warning';

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-hairline bg-surface-2 px-4 py-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-tint">
          <UserCircle2 className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-card-title font-semibold leading-tight tracking-tight text-ink">
              {card.employee.name}
            </h3>
            <AskAria
              topic={`${id} · risk`}
              prompt={`Why is ${id} flagged ${card.riskBadge} risk for ${period}? Summarize the contributing NORM signals.`}
            >
              <RiskBadgeButton level={card.riskBadge} />
            </AskAria>
          </div>
          <p className="mt-0.5 text-body-sm text-ink-muted">{card.employee.role}</p>
        </div>
        <span className="shrink-0 font-mono text-caption text-ink-subtle">{id}</span>
      </div>

      {/* Body */}
      <div className="space-y-4 px-4 py-3">
        <div className="text-body-sm">
          <div className="flex items-center justify-between border-b border-hairline py-1.5">
            <span className="text-ink-muted">Account</span>
            <span className="font-medium text-ink">{card.account ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-ink-muted">Review period</span>
            <span className="font-medium text-ink">{period}</span>
          </div>
        </div>

        {/* KPI — clickable */}
        <AskAria
          topic={`${id} · KPI`}
          prompt={`Explain ${id}'s KPI of ${card.kpi.score} against the target of ${card.kpi.target} for ${period} — what's driving it?`}
        >
          <button type="button" className={cn(interactive, '-mx-2 block px-2 py-1.5')}>
            <span className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                KPI score <AskGlyph />
              </span>
              <span className={cn('text-body-sm font-semibold', TONE_TEXT[kt])}>
                {card.kpi.score} / {card.kpi.target} {card.kpi.unit}
              </span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-surface-3">
              <span
                className={cn('block h-full rounded-full', TONE_BAR[kt])}
                style={{ width: `${kpiPct}%` }}
              />
            </span>
          </button>
        </AskAria>

        {/* Metric rows — each clickable */}
        <div className="-mx-2">
          {card.overtime && (
            <AskAria
              topic={`${id} · overtime`}
              prompt={`Break down ${id}'s ${card.overtime.hours}${card.overtime.unit} of overtime in ${period} against the ${card.overtime.limit}${card.overtime.unit} limit — which weeks and projects drove it?`}
            >
              <button
                type="button"
                className={cn(interactive, 'flex items-center justify-between px-2 py-1.5')}
              >
                <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                  Overtime (month) <AskGlyph />
                </span>
                <span
                  className={cn(
                    'text-body-sm font-medium',
                    TONE_TEXT[overtimeTone(card.overtime.hours, card.overtime.limit)],
                  )}
                >
                  {card.overtime.hours}
                  {card.overtime.unit} / {card.overtime.limit}
                  {card.overtime.unit} limit
                </span>
              </button>
            </AskAria>
          )}

          <AskAria
            topic={`${id} · violations`}
            prompt={
              card.openViolations > 0
                ? `Show the ${card.openViolations} open compliance case${card.openViolations === 1 ? '' : 's'} for ${id} and their current status.`
                : `Confirm ${id} has no open compliance cases for ${period}.`
            }
          >
            <button
              type="button"
              className={cn(interactive, 'flex items-center justify-between px-2 py-1.5')}
            >
              <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                Open violations <AskGlyph />
              </span>
              <span
                className={cn(
                  'text-body-sm font-medium',
                  TONE_TEXT[violationsTone(card.openViolations)],
                )}
              >
                {card.openViolations} open
              </span>
            </button>
          </AskAria>

          {card.allocationPct !== null && (
            <AskAria
              topic={`${id} · allocation`}
              prompt={`${id} is allocated at ${card.allocationPct}%. Which projects is that across, and what can be rebalanced?`}
            >
              <button
                type="button"
                className={cn(interactive, 'flex items-center justify-between px-2 py-1.5')}
              >
                <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                  Allocation <AskGlyph />
                </span>
                <span
                  className={cn(
                    'text-body-sm font-medium',
                    TONE_TEXT[allocationTone(card.allocationPct)],
                  )}
                >
                  {card.allocationPct}%
                </span>
              </button>
            </AskAria>
          )}

          <AskAria
            topic={`${id} · NORM`}
            prompt={`Explain how the NORM engine classified ${id} as "${card.normResult}" for ${period} — which rules triggered?`}
          >
            <button
              type="button"
              className={cn(interactive, 'flex items-center justify-between px-2 py-1.5')}
            >
              <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                NORM result <AskGlyph />
              </span>
              <span
                className={cn('text-body-sm font-medium', TONE_TEXT[riskToTone(card.riskBadge)])}
              >
                {card.normResult}
              </span>
            </button>
          </AskAria>
        </div>

        {/* Risk signals — each chip clickable */}
        {card.riskSignals.length > 0 && (
          <div className={cn('rounded-lg border px-3 py-2.5', signalBox)}>
            <p className="flex items-center gap-1.5 text-body-sm font-medium">
              <AlertTriangle className="size-4 shrink-0" />
              Risk signals
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {card.riskSignals.map((signal) => (
                <AskAria
                  key={signal}
                  topic={signal}
                  prompt={`Detail the "${signal}" signal for ${id} — the trend, threshold, and underlying records behind it.`}
                >
                  <button
                    type="button"
                    className={cn(
                      'group/ask inline-flex items-center gap-1 rounded-md border bg-canvas/60 px-2 py-1 text-caption font-medium transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus',
                      signalsTone === 'danger' ? 'border-danger/30' : 'border-semantic-warning/30',
                    )}
                  >
                    {signal}
                    <ArrowUpRight className="size-3 opacity-50 transition-opacity group-hover/ask:opacity-100" />
                  </button>
                </AskAria>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card 2 · inline_transcript ─────────────────────────────────────────────────

export function InlineTranscriptCard({ card }: { card: InlineTranscriptCardData }) {
  // The compact card carries no memberId; lift the subject from the intro when present.
  const subject = card.intro.match(/EMP-\d+/)?.[0] ?? 'this employee';

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-4 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-primary-tint">
          <Sparkles className="size-3 text-primary" />
        </div>
        <span className="text-body-sm font-medium text-ink">{card.agentName}</span>
        <span className="ml-auto flex items-center gap-1 text-caption text-ink-subtle">
          <Clock className="size-3" />
          just now
        </span>
      </div>
      <div className="space-y-3 px-4 py-3">
        <p className="text-body-sm leading-relaxed text-ink">{card.intro}</p>
        {card.metrics.length > 0 && (
          <div className="-mx-1 rounded-lg border border-hairline bg-surface-2 px-1 py-1">
            {card.metrics.map((m) => (
              <AskAria
                key={m.label}
                topic={`${subject} · ${m.label}`}
                prompt={`Tell me more about ${subject}'s ${m.label} (${m.value}) — what's driving it?`}
              >
                <button
                  type="button"
                  className={cn(
                    interactive,
                    'flex items-center justify-between px-2 py-1.5 hover:bg-surface-3',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                    {m.label} <AskGlyph />
                  </span>
                  <span
                    className={cn(
                      'text-body-sm font-medium',
                      m.emphasis === 'danger'
                        ? TONE_TEXT.danger
                        : m.emphasis === 'warn'
                          ? TONE_TEXT.warn
                          : TONE_TEXT.neutral,
                    )}
                  >
                    {m.value}
                  </span>
                </button>
              </AskAria>
            ))}
          </div>
        )}
        {card.footerBadge && (
          <div className="flex items-center gap-1.5">
            <AskAria
              topic={`${subject} · risk`}
              prompt={`Why is ${subject} flagged ${card.footerBadge.tone} risk? Summarize the contributing signals and recommended next steps.`}
            >
              <RiskBadgeButton level={card.footerBadge.tone} />
            </AskAria>
            {card.footerNote && (
              <span className="text-caption text-ink-subtle">{card.footerNote}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card 3 · at_risk_list (Leader view) ────────────────────────────────────────

export function AtRiskListCard({ card }: { card: AtRiskListCardData }) {
  const exportRows: Cell[][] = card.employees.map((e) => [
    e.memberId,
    e.riskBadge,
    e.summary,
    e.recommendedAction,
  ]);
  const scroll = card.employees.length > 6;

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-4 py-3">
        <TrendingDown className="size-4 text-danger-ink" />
        <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-ink">
          {card.title}
        </h3>
        <span className="shrink-0 text-caption text-ink-subtle">{card.employees.length}</span>
        <ExportMenu
          basename={slugify(card.title)}
          headers={['Member ID', 'Risk', 'Summary', 'Recommended action']}
          rows={exportRows}
        />
      </div>
      <div className={cn('divide-y divide-hairline', scroll && 'max-h-[22rem] overflow-y-auto')}>
        {card.employees.map((e) => (
          <AskAria
            key={e.memberId}
            topic={`${e.memberId} · profile`}
            prompt={`Give me the full performance profile and recommended actions for ${e.memberId}.`}
          >
            <button
              type="button"
              className="group/ask flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-focus"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3">
                <UserCircle2 className="size-4 text-ink-muted" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-body-sm font-medium text-ink">{e.memberId}</span>
                  <RiskPillSpan level={e.riskBadge} />
                </span>
                <span className="mt-0.5 block text-caption text-ink-muted">{e.summary}</span>
                <span className="mt-1 block text-caption text-primary">
                  → {e.recommendedAction}
                </span>
              </span>
              <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover/ask:opacity-100 group-focus-visible/ask:opacity-100" />
            </button>
          </AskAria>
        ))}
      </div>
    </div>
  );
}

// ─── Card 4 · account_summary (BOD view) ────────────────────────────────────────

export function AccountSummaryCard({ card }: { card: AccountSummaryCardData }) {
  const { high, medium, low } = card.counts;
  const total = card.totalEmployees || high + medium + low || 1;
  const pctHigh = Math.round((high / total) * 100);
  const pctMedium = Math.round((medium / total) * 100);
  const pctLow = Math.max(0, 100 - pctHigh - pctMedium);

  const tiles = [
    {
      key: 'high',
      count: high,
      label: 'High',
      cls: 'bg-danger-tint border-danger-border text-danger-ink',
      sub: 'text-danger-ink/70',
      prompt: `Who are the ${high} high-risk employees across all accounts, and which accounts are they concentrated in?`,
    },
    {
      key: 'medium',
      count: medium,
      label: 'Medium',
      cls: 'bg-semantic-warning-tint border-semantic-warning/20 text-semantic-warning',
      sub: 'text-semantic-warning/70',
      prompt: `List the ${medium} medium-risk employees and their primary risk drivers.`,
    },
    {
      key: 'low',
      count: low,
      label: 'Low',
      cls: 'bg-semantic-success-tint border-semantic-success/20 text-semantic-success',
      sub: 'text-semantic-success/70',
      prompt: `Summarize the ${low} low-risk employees — any early-warning trends worth watching?`,
    },
  ];

  const exportRows: Cell[][] = [
    ['High', high, `${pctHigh}%`],
    ['Medium', medium, `${pctMedium}%`],
    ['Low', low, `${pctLow}%`],
    ['Total', total, '100%'],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-2 px-4 py-3">
        <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-ink">
          {card.title}
        </h3>
        <ExportMenu
          basename={slugify(card.title)}
          headers={['Risk level', 'Employees', 'Share']}
          rows={exportRows}
        />
      </div>
      <div className="space-y-4 px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <AskAria key={t.key} topic={`${t.label} risk`} prompt={t.prompt}>
              <button
                type="button"
                className={cn(
                  'group/ask relative rounded-lg border px-3 py-2.5 text-center transition-transform',
                  'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface-1',
                  t.cls,
                )}
              >
                {/* Hover affordance sits in the corner so it never shifts the centred label. */}
                <ArrowUpRight className="absolute right-1.5 top-1.5 size-3 opacity-0 transition-opacity group-hover/ask:opacity-100 group-focus-visible/ask:opacity-100" />
                <span className="block text-[22px] font-semibold leading-none">{t.count}</span>
                <span className={cn('mt-1 block text-eyebrow uppercase tracking-wide', t.sub)}>
                  {t.label}
                </span>
              </button>
            </AskAria>
          ))}
        </div>

        <div>
          <div className="flex h-2 gap-px overflow-hidden rounded-full">
            <div className="bg-danger" style={{ width: `${pctHigh}%` }} />
            <div className="bg-semantic-warning" style={{ width: `${pctMedium}%` }} />
            <div className="bg-semantic-success" style={{ width: `${pctLow}%` }} />
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-caption text-ink-subtle">{card.highPct}% high-risk</span>
            <span className="text-caption text-ink-subtle">{total} total employees</span>
          </div>
        </div>

        <p className="text-body-sm leading-relaxed text-ink-muted">{card.narrative}</p>
      </div>
    </div>
  );
}

// ─── Card 5 · human_review_flag (PII confidentiality gate) ──────────────────────

export function HumanReviewFlagCard({ card }: { card: HumanReviewFlagCardData }) {
  const [revealed, setRevealed] = useState(false);

  // The PII conclusion is NOT rendered into the DOM until the viewer reveals it —
  // a blur could be defeated in devtools, so we gate the string itself. The card's
  // own framing is overridden with fixed confidentiality copy so a backend default
  // ("Requires human review") can't undo the PII treatment.
  return (
    <div className="overflow-hidden rounded-xl border-[1.5px] border-semantic-warning/50 bg-canvas shadow-[0_0_0_4px_var(--color-semantic-warning-tint)]">
      <div className="flex items-center gap-2.5 border-b border-semantic-warning/30 bg-semantic-warning-tint px-3.5 py-2">
        <Lock className="size-3.5 shrink-0 text-semantic-warning" />
        <span className="text-body-sm font-semibold text-semantic-warning">
          Confidential — sensitive personnel data
        </span>
        <span className="ml-auto rounded-sm bg-semantic-warning/15 px-1.5 text-[10px] font-medium uppercase tracking-wide text-semantic-warning">
          PII
        </span>
      </div>
      <div className="space-y-2.5 px-3.5 py-3">
        <p className="text-caption text-ink-subtle">
          {card.rationale || "This card holds an employee's sensitive performance data (PII)."} Keep
          it off shared screens and do not show it to anyone not authorized to view this
          employee&apos;s record.
        </p>

        {revealed ? (
          <>
            <div className="rounded-lg border border-hairline bg-surface-1 px-3 py-2.5">
              <p className="text-body-sm font-medium text-ink">{card.conclusion}</p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="flex items-center gap-1.5 text-caption text-semantic-warning">
                <Eye className="size-3.5 shrink-0" />
                Visible to you only — do not distribute or screenshot.
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRevealed(false)}
                className="ml-auto gap-1.5 text-ink-muted"
              >
                <EyeOff className="size-3.5" />
                Hide again
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="group/reveal flex w-full items-center gap-3 rounded-lg border border-dashed border-semantic-warning/40 bg-semantic-warning-tint/40 px-3 py-3.5 text-left transition-colors hover:bg-semantic-warning-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-semantic-warning/30 bg-canvas">
              <EyeOff className="size-4 text-semantic-warning" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-medium text-ink">
                Sensitive content hidden
              </span>
              <span className="mt-0.5 block text-caption text-ink-subtle">
                Hidden by default to prevent shoulder-surfing. Reveal only if you&apos;re
                authorized.
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-semantic-warning px-2.5 py-1.5 text-caption font-semibold text-white">
              <Eye className="size-3.5" />
              Reveal
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Card 6 · access_denied (RBAC guardrail) ────────────────────────────────────

export function AccessDeniedCard({ card }: { card: AccessDeniedCardData }) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-3">
          <Lock className="size-4 text-ink-muted" />
        </div>
        <div>
          <p className="text-body-sm font-semibold text-ink">{card.title}</p>
          <p className="mt-0.5 text-body-sm text-ink-muted">{card.message}</p>
          {card.hint && <p className="mt-2 text-caption text-ink-subtle">{card.hint}</p>}
          <div className="mt-3 flex items-center gap-2">
            <span className="label-chip label-chip--purple">{card.currentRole}</span>
            <span className="text-caption text-ink-subtle">→ {card.requiredRole}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function CardBody({ card }: { card: CardPayload }) {
  switch (card.type) {
    case 'employee_profile_report':
      return <EmployeeProfileCard card={card} />;
    case 'inline_transcript':
      return <InlineTranscriptCard card={card} />;
    case 'at_risk_list':
      return <AtRiskListCard card={card} />;
    case 'account_summary':
      return <AccountSummaryCard card={card} />;
    case 'human_review_flag':
      return <HumanReviewFlagCard card={card} />;
    case 'access_denied':
      return <AccessDeniedCard card={card} />;
    case 'report':
      return <ReportCard card={card} />;
    default:
      return null;
  }
}

export { ReportCard };

/**
 * Renders an ARIA card in the live transcript. Provides Ask-ARIA a `send` bound to
 * the thread composer so clicking any indicator dispatches a follow-up turn here.
 */
export function AriaCard({ card }: { card: CardPayload }) {
  const aui = useAui();
  const send = useCallback<AskAriaSend>(
    (prompt) => {
      // A card renders inside a message scope, where `aui.composer()` is the
      // (unavailable) message-edit composer. Append at the thread scope instead
      // so the follow-up lands as a new user turn in the current thread.
      aui.thread().append({ role: 'user', content: [{ type: 'text', text: prompt }] });
    },
    [aui],
  );

  return (
    <AskAriaProvider send={send}>
      <div className="my-2 w-full max-w-[34rem]">
        <CardBody card={card} />
      </div>
    </AskAriaProvider>
  );
}
