import type { CardPayload } from '@seta/performance/contracts';
import type { CustomDashboard } from './types';

const EMPLOYEE_PROFILE: CardPayload = {
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

const AT_RISK_LIST: CardPayload = {
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

const ACCOUNT_SUMMARY: CardPayload = {
  type: 'account_summary',
  title: 'Talent risk overview — All accounts',
  counts: { high: 8, medium: 22, low: 94 },
  totalEmployees: 124,
  highPct: 6,
  narrative:
    'Overall talent risk is moderate. 8 employees flagged high-risk require manager action out of 124 in scope.',
};

const REPORT_BAR: CardPayload = {
  type: 'report',
  title: 'Avg KPI Score by Department',
  summary: 'Bar chart comparing average KPI scores across departments for Q1 2026.',
  blocks: [
    {
      kind: 'bar',
      title: 'Avg KPI Score by Department',
      unit: 'pt',
      data: [
        { label: 'Engineering', value: 4.2 },
        { label: 'Design', value: 3.9 },
        { label: 'Product', value: 4.1 },
        { label: 'QA', value: 3.5 },
        { label: 'DevOps', value: 3.2 },
      ],
    },
  ],
};

const REPORT_PIE: CardPayload = {
  type: 'report',
  title: 'Risk Distribution',
  summary: 'Distribution of risk levels across 124 employees.',
  blocks: [
    {
      kind: 'pie',
      title: 'Risk Distribution',
      data: [
        { label: 'High', value: 8 },
        { label: 'Medium', value: 22 },
        { label: 'Low', value: 94 },
      ],
    },
  ],
};

const REPORT_LINE: CardPayload = {
  type: 'report',
  title: 'Score Trend — Last 6 Months',
  summary: 'Engineering vs org average KPI scores over 6 months.',
  blocks: [
    {
      kind: 'line',
      title: 'Score Trend — Last 6 Months',
      unit: 'pt',
      series: [
        {
          name: 'Eng',
          points: [
            { x: 'Jan', y: 4.0 },
            { x: 'Feb', y: 4.1 },
            { x: 'Mar', y: 4.3 },
            { x: 'Apr', y: 4.2 },
            { x: 'May', y: 4.4 },
            { x: 'Jun', y: 4.2 },
          ],
        },
        {
          name: 'Org Avg',
          points: [
            { x: 'Jan', y: 3.8 },
            { x: 'Feb', y: 3.8 },
            { x: 'Mar', y: 3.9 },
            { x: 'Apr', y: 3.9 },
            { x: 'May', y: 4.0 },
            { x: 'Jun', y: 3.9 },
          ],
        },
      ],
    },
  ],
};

const REPORT_TABLE: CardPayload = {
  type: 'report',
  title: 'Top Performers',
  summary: 'Ranked list of top 5 performers with scores and classifications.',
  blocks: [
    {
      kind: 'table',
      title: 'Top Performers',
      columns: ['Employee', 'Score', 'Classification'],
      rows: [
        ['EMP-042', 4.9, 'Exceeds'],
        ['EMP-088', 4.7, 'Exceeds'],
        ['EMP-031', 4.6, 'Meets'],
        ['EMP-105', 4.5, 'Meets'],
        ['EMP-067', 4.3, 'Meets'],
      ],
    },
  ],
};

const TOP_PERFORMERS: CardPayload = {
  type: 'top_performers',
  title: 'Top 5 performers — All accounts',
  employees: [
    {
      rank: 1,
      memberId: 'EMP-042',
      name: 'EMP-042',
      score: 4.9,
      classification: 'Exceeds',
      reason: 'Excellent — avg score 4.9',
    },
    {
      rank: 2,
      memberId: 'EMP-088',
      name: 'EMP-088',
      score: 4.7,
      classification: 'Exceeds',
      reason: 'Excellent — avg score 4.7',
    },
    {
      rank: 3,
      memberId: 'EMP-031',
      name: 'EMP-031',
      score: 4.6,
      classification: 'Meets',
      reason: 'Strong — avg score 4.6',
    },
    {
      rank: 4,
      memberId: 'EMP-105',
      name: 'EMP-105',
      score: 4.5,
      classification: 'Meets',
      reason: 'Strong — avg score 4.5',
    },
    {
      rank: 5,
      memberId: 'EMP-067',
      name: 'EMP-067',
      score: 4.3,
      classification: 'Meets',
      reason: 'Solid — avg score 4.3',
    },
  ],
};

export const MOCK_DASHBOARDS: CustomDashboard[] = [
  {
    id: 'db-talent-health',
    name: 'Talent Health Overview',
    widgets: [
      {
        id: 'w-header-1',
        name: 'Department Header',
        layout: { i: 'w-header-1', x: 0, y: 0, w: 12, h: 1, minW: 4, minH: 1 },
        content: { type: 'header', content: 'Q1 2026 — Talent Health' },
      },
      {
        id: 'w-indicator-1',
        name: 'Total Headcount',
        layout: { i: 'w-indicator-1', x: 0, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'Total Headcount',
          value: '1,247',
          trend: 'up',
          change: '+12 from last quarter',
        },
      },
      {
        id: 'w-indicator-2',
        name: 'Avg Performance Score',
        layout: { i: 'w-indicator-2', x: 3, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'Avg Performance Score',
          value: '3.9',
          trend: 'up',
          change: '+0.2 MoM',
        },
      },
      {
        id: 'w-indicator-3',
        name: 'At-Risk Count',
        layout: { i: 'w-indicator-3', x: 6, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'At-Risk Employees',
          value: '8',
          trend: 'down',
          change: '-3 from last quarter',
        },
      },
      {
        id: 'w-indicator-4',
        name: 'Utilization Rate',
        layout: { i: 'w-indicator-4', x: 9, y: 1, w: 3, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'Utilization Rate',
          value: '87%',
          trend: 'neutral',
          change: 'No change',
        },
      },
      {
        id: 'w-bar-1',
        name: 'KPI by Department',
        layout: { i: 'w-bar-1', x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'KPI by Department', card: REPORT_BAR },
      },
      {
        id: 'w-pie-1',
        name: 'Risk Distribution',
        layout: { i: 'w-pie-1', x: 4, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Risk Distribution', card: REPORT_PIE },
      },
      {
        id: 'w-line-1',
        name: 'Score Trend',
        layout: { i: 'w-line-1', x: 8, y: 3, w: 4, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Score Trend', card: REPORT_LINE },
      },
      {
        id: 'w-table-1',
        name: 'Top Performers Table',
        layout: { i: 'w-table-1', x: 0, y: 8, w: 6, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Top Performers Table', card: REPORT_TABLE },
      },
      {
        id: 'w-profile-1',
        name: 'EMP-031 Profile',
        layout: { i: 'w-profile-1', x: 6, y: 8, w: 6, h: 5, minW: 3, minH: 4 },
        content: { type: 'card', name: 'EMP-031 Profile', card: EMPLOYEE_PROFILE },
      },
      {
        id: 'w-atrisk-1',
        name: 'Account B — At Risk',
        layout: { i: 'w-atrisk-1', x: 0, y: 13, w: 6, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Account B — At Risk', card: AT_RISK_LIST },
      },
      {
        id: 'w-summary-1',
        name: 'Talent Risk Summary',
        layout: { i: 'w-summary-1', x: 6, y: 13, w: 6, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Talent Risk Summary', card: ACCOUNT_SUMMARY },
      },
    ],
    periodFilter: '2026-04',
    showInSidebar: true,
    isDraft: false,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-04-10T14:30:00Z',
  },
  {
    id: 'db-attrition-watch',
    name: 'Attrition Watch',
    widgets: [
      {
        id: 'w-text-1',
        name: 'Context',
        layout: { i: 'w-text-1', x: 0, y: 0, w: 12, h: 2, minW: 3, minH: 1 },
        content: {
          type: 'text',
          content:
            'This dashboard tracks attrition risk factors across departments. Updated weekly from the NORM engine. Focus areas: overtime trends, declining scores, and bench status.',
        },
      },
      {
        id: 'w-top-1',
        name: 'Top Performers',
        layout: { i: 'w-top-1', x: 0, y: 2, w: 6, h: 5, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Top Performers', card: TOP_PERFORMERS },
      },
      {
        id: 'w-list-1',
        name: 'Action Items',
        layout: { i: 'w-list-1', x: 6, y: 2, w: 6, h: 5, minW: 3, minH: 3 },
        content: {
          type: 'list',
          title: 'Recommended Actions',
          items: [
            'Schedule 1:1 with EMP-031 — KPI trending below threshold',
            'Review workload allocation for Account B DevOps team',
            'Follow up on open compliance cases (3 pending)',
            'Prepare PIP documentation for flagged employees',
            'Send Q1 performance review reminders to managers',
          ],
        },
      },
      {
        id: 'w-summary-2',
        name: 'Account B Summary',
        layout: { i: 'w-summary-2', x: 0, y: 7, w: 12, h: 4, minW: 3, minH: 3 },
        content: { type: 'card', name: 'Account B Summary', card: ACCOUNT_SUMMARY },
      },
    ],
    periodFilter: '2026-05',
    showInSidebar: true,
    isDraft: false,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-05-20T11:00:00Z',
  },
  {
    id: 'db-draft-recruiting',
    name: 'Recruiting Pipeline (Draft)',
    widgets: [
      {
        id: 'w-header-2',
        name: 'Draft Header',
        layout: { i: 'w-header-2', x: 0, y: 0, w: 12, h: 1, minW: 4, minH: 1 },
        content: { type: 'header', content: 'Recruiting Pipeline — Q2 2026' },
      },
      {
        id: 'w-text-2',
        name: 'Draft Note',
        layout: { i: 'w-text-2', x: 0, y: 1, w: 12, h: 2, minW: 3, minH: 1 },
        content: {
          type: 'text',
          content:
            'Draft dashboard — awaiting data from HRIS integration. Charts below are placeholders from Q1 data.',
        },
      },
      {
        id: 'w-indicator-5',
        name: 'Open Reqs',
        layout: { i: 'w-indicator-5', x: 0, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'Open Requisitions',
          value: '34',
          trend: 'up',
          change: '+8 this month',
        },
      },
      {
        id: 'w-indicator-6',
        name: 'Time to Fill',
        layout: { i: 'w-indicator-6', x: 4, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'Avg Time to Fill',
          value: '28 days',
          trend: 'down',
          change: '-5 days improvement',
        },
      },
      {
        id: 'w-indicator-7',
        name: 'Offer Accept Rate',
        layout: { i: 'w-indicator-7', x: 8, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
        content: {
          type: 'indicator',
          label: 'Offer Accept Rate',
          value: '82%',
          trend: 'neutral',
          change: 'Flat',
        },
      },
    ],
    periodFilter: '2026-06',
    showInSidebar: false,
    isDraft: true,
    createdAt: '2026-06-01T16:00:00Z',
    updatedAt: '2026-06-15T09:00:00Z',
  },
];

export const MOCK_PERIODS = ['2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];
