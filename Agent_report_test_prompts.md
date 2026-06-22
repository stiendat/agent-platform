# ARIA Report Card — Test Prompts

Sample prompts for the `report` card (AI-composed pie/bar/line/table charts via
`performance_renderReport`). Paste these into the **agent panel** (top-right "Agent"
button) on any page.

## Setup
- Web: `http://localhost:5173` (stack: `pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`).
- Login: `admin@hackathon.com` / `ChangeMe@2026`.
- Demo (no model needed): `http://localhost:5173/devzone/card-demo-v2` → the `report` section.
- Data assumptions: employees like `EMP-031`; accounts `ACC-A` / `ACC-B`; periods `2026-03`, `2026-04` (only 2 months seeded → line charts show 2 points).
- To test RBAC differences, switch identity via the **dev toolkit → Impersonate**
  (e.g. a `performance.manager` = Leader vs `performance.hr`).

---

## 1. Should produce a report (multi-chart)
- Build me a performance report for EMP-031: KPI trend line, KPI vs target bar, and a metrics table.
- Give me a dashboard for EMP-031 — show the KPI and overtime trends over the last two months as charts.
- Show a risk report for Account B: a pie of the high/medium/low risk mix and a table of the at-risk employees.
- Compare EMP-031's KPI and attendance across 2026-03 and 2026-04 with line charts, plus a summary table.
- Workforce risk overview as charts — pie of risk levels across all accounts and a table of who's high-risk.

> Best first check: the first prompt triggers **line + bar + table** in one turn.

## 2. Exercises a specific chart kind
- Just a pie chart of the risk breakdown for Account A.  _(pie)_
- Plot EMP-031's overtime hours over time.  _(line)_
- Bar chart of KPI vs target for EMP-031.  _(bar — may note "target unavailable")_
- Table of EMP-031's key metrics: KPI, overtime, violations, allocation.  _(table)_

## 3. Should NOT produce a report (negative checks)
- What's EMP-031's KPI?  → short prose or a single fixed card, not a multi-chart report.
- Who is at risk on Account B?  → the existing `at_risk_list` card, not a report.
- Hi, what can you do?  → plain prose, no card.

## 4. Anti-hallucination / RBAC checks
- Report on EMP-031 including their salary band and promotion readiness as a chart.
  → sensitive fields are redacted for non-HR at the read boundary, so they must NOT
    appear in any chart (compare Leader vs HR impersonation).
- Make me a report predicting EMP-031's KPI for next quarter.
  → no such data exists; it should decline to chart invented numbers, not fabricate points.

---

## What "pass" looks like
- A titled report card renders in the chat with the requested chart kinds.
- Numbers match what the read tools returned (the agent must not invent values).
- When a value is missing, the agent says so (e.g. titles a block "… — target
  unavailable") instead of guessing.
- Negative prompts return prose or the existing fixed cards — not a report.
