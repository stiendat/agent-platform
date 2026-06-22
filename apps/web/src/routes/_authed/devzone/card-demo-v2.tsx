import type {
  AccessDeniedCard as AccessDeniedCardData,
  AccountSummaryCard as AccountSummaryCardData,
  AtRiskListCard as AtRiskListCardData,
  EmployeeProfileCard as EmployeeProfileCardData,
  HumanReviewFlagCard as HumanReviewFlagCardData,
  InlineTranscriptCard as InlineTranscriptCardData,
  ReportCard as ReportCardData,
} from '@seta/performance/contracts';
import { PageChrome } from '@seta/shared-ui';
import { createFileRoute } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import {
  AccessDeniedCard,
  AccountSummaryCard,
  AtRiskListCard,
  EmployeeProfileCard,
  HumanReviewFlagCard,
  InlineTranscriptCard,
  ReportCard,
} from '@/modules/agent/chat-experience/cards';

export const Route = createFileRoute('/_authed/devzone/card-demo-v2')({
  component: CardDemoV2Page,
});

// ─── Mock data (verbatim from Agent_cards_doc.md §3) ───────────────────────────
// These are the exact components shipped in the live agent chat (see
// `@/modules/agent/chat-experience/cards`), fed the documented mock payloads.
// PII note: the performance schema stores no employee names — `name` equals the
// tenant-local `memberId`. Outside the chat there is no thread composer, so
// "Send to ARIA" confirms inline rather than dispatching a turn.

const EMPLOYEE_PROFILE: EmployeeProfileCardData = {
  type: 'employee_profile_report',
  employee: { memberId: 'EMP-031', name: 'EMP-031', role: 'Senior DevOps Engineer' },
  riskBadge: 'high',
  account: 'Account B',
  reviewPeriod: 'April 2026',
  kpi: { score: 2.2, target: 3, unit: 'pt' },
  overtime: { hours: 48, limit: 40, unit: 'h' },
  openViolations: 1,
  allocationPct: 110,
  normResult: 'At Risk',
  riskSignals: ['KPI: At Risk', 'Compliance: Open Cases', 'Compliance: Flagged'],
};

const INLINE_TRANSCRIPT: InlineTranscriptCardData = {
  type: 'inline_transcript',
  agentName: 'ARIA',
  intro: 'Here is the performance profile for EMP-031 for April 2026.',
  metrics: [
    { label: 'KPI', value: '2.2 (target 3)', emphasis: 'danger' },
    { label: 'Overtime', value: '48h (+8h over limit)', emphasis: 'warn' },
    { label: 'Violations', value: '1 open', emphasis: 'warn' },
    { label: 'NORM result', value: 'At Risk', emphasis: 'danger' },
  ],
  footerBadge: { label: 'High risk', tone: 'high' },
  footerNote: 'Flagged for review',
};

const AT_RISK_LIST: AtRiskListCardData = {
  type: 'at_risk_list',
  title: 'At-risk employees — Account B, April 2026',
  employees: [
    {
      memberId: 'EMP-031',
      name: 'EMP-031',
      riskBadge: 'high',
      summary: 'Low KPI (<2.5); High-Risk Violation',
      recommendedAction: 'Schedule 1:1, review workload allocation',
    },
    {
      memberId: 'EMP-044',
      name: 'EMP-044',
      riskBadge: 'medium',
      summary: 'Multiple Open Violations; Lateness Pattern',
      recommendedAction: 'Review project load, consider coaching',
    },
    {
      memberId: 'EMP-019',
      name: 'EMP-019',
      riskBadge: 'medium',
      summary: 'Below Expectations; Benched',
      recommendedAction: 'Review project load, consider coaching',
    },
  ],
};

const ACCOUNT_SUMMARY: AccountSummaryCardData = {
  type: 'account_summary',
  title: 'Talent risk overview — All accounts',
  counts: { high: 8, medium: 22, low: 94 },
  totalEmployees: 124,
  highPct: 6,
  narrative:
    'Overall talent risk is moderate. 8 employees flagged high-risk require manager action out of 124 in scope.',
};

const HUMAN_REVIEW_FLAG: HumanReviewFlagCardData = {
  type: 'human_review_flag',
  title: 'Requires human review',
  badge: 'SENSITIVE',
  rationale: "This card holds an employee's sensitive performance data (PII).",
  conclusion:
    'EMP-031 is flagged for potential performance improvement plan (PIP) consideration based on the 3-month KPI trend.',
};

const ACCESS_DENIED: AccessDeniedCardData = {
  type: 'access_denied',
  title: 'Access restricted',
  message:
    'Your current role does not have permission to view promotion readiness or sensitive HR notes.',
  hint: 'Contact your HR administrator if you need access to this information.',
  currentRole: 'Leader role',
  requiredRole: 'HR role required',
};

// An AI-composed report: the agent gathered EMP-031 / Account B numbers with the
// read tools, then passed these blocks (pie/bar/line/table) to performance_renderReport.
const REPORT_CARD: ReportCardData = {
  type: 'report',
  title: 'EMP-031 — April 2026 performance report',
  summary: 'KPI below target with a worsening 2-month trend; one open violation.',
  blocks: [
    {
      kind: 'bar',
      title: 'KPI vs target',
      unit: 'pt',
      data: [
        { label: 'KPI', value: 2.2 },
        { label: 'Target', value: 3 },
      ],
    },
    {
      kind: 'line',
      title: 'KPI trend',
      unit: null,
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
    {
      kind: 'pie',
      title: 'Account B — risk mix',
      data: [
        { label: 'High', value: 1 },
        { label: 'Medium', value: 2 },
        { label: 'Low', value: 9 },
      ],
    },
    {
      kind: 'table',
      title: 'Key metrics',
      columns: ['Metric', 'Value'],
      rows: [
        ['KPI', '2.2 (target 3)'],
        ['Overtime', '48h (+8 over limit)'],
        ['Open violations', 1],
        ['Allocation', '110%'],
        ['NORM result', 'At Risk'],
      ],
    },
  ],
};

// ─── Page ───────────────────────────────────────────────────────────────────────

function SectionLabel({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <p className="text-eyebrow uppercase tracking-[0.04em] text-ink-subtle">{children}</p>
      {note && <span className="text-caption text-ink-subtle">· {note}</span>}
    </div>
  );
}

function CardDemoV2Page() {
  return (
    <PageChrome breadcrumb={['Development Zone']} title="Card demo (new)">
      <div className="page-container space-y-10 py-6">
        <div className="flex max-w-2xl items-start gap-2.5 rounded-lg border border-hairline bg-surface-1 px-4 py-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-body-sm leading-relaxed text-ink-muted">
            The same interactive ARIA cards the agent renders in chat. Click any{' '}
            <span className="font-medium text-primary">live indicator</span> (a metric, a risk
            signal, a roster row) to compose a follow-up for ARIA, or use{' '}
            <span className="font-medium text-ink">Export</span> on a roster to pull the data into
            CSV / Excel. In the live chat, sending dispatches a new turn; here it confirms inline.
          </p>
        </div>

        <section>
          <SectionLabel note="full single-employee report">employee_profile_report</SectionLabel>
          <div className="max-w-md">
            <EmployeeProfileCard card={EMPLOYEE_PROFILE} />
          </div>
        </section>

        <section>
          <SectionLabel note="compact in-chat answer">inline_transcript</SectionLabel>
          <div className="max-w-md">
            <InlineTranscriptCard card={INLINE_TRANSCRIPT} />
          </div>
        </section>

        <section>
          <SectionLabel note="multi-employee roster · exportable">at_risk_list</SectionLabel>
          <div className="max-w-xl">
            <AtRiskListCard card={AT_RISK_LIST} />
          </div>
        </section>

        <section>
          <SectionLabel note="aggregate roll-up · exportable">account_summary</SectionLabel>
          <div className="max-w-sm">
            <AccountSummaryCard card={ACCOUNT_SUMMARY} />
          </div>
        </section>

        <section>
          <SectionLabel note="PII · confidential, reveal-gated">human_review_flag</SectionLabel>
          <div className="max-w-md">
            <HumanReviewFlagCard card={HUMAN_REVIEW_FLAG} />
          </div>
        </section>

        <section>
          <SectionLabel note="RBAC guardrail">access_denied</SectionLabel>
          <div className="max-w-md">
            <AccessDeniedCard card={ACCESS_DENIED} />
          </div>
        </section>

        <section>
          <SectionLabel note="AI-composed charts · pie/bar/line/table">report</SectionLabel>
          <div className="max-w-xl">
            <ReportCard card={REPORT_CARD} />
          </div>
        </section>
      </div>
    </PageChrome>
  );
}
