# @seta/performance — ARIA

**ARIA** (Agentic Review & Insight Assistant) — the Employee Performance Tracking &
Reporting agent (Hackathon Problem 05). This module owns the `performance` schema, the
NORM rule engine, the ARIA chat agent, and the role-based performance dashboards.

## Getting Started

**Prerequisites:** Node 24 LTS, pnpm 11+, and Docker running.

```bash
git clone https://github.com/stiendat/agent-platform.git && cd agent-platform
pnpm install
cp .env.example .env     # then fill BETTER_AUTH_SECRET, CRYPTO_LOCAL_MASTER_KEY, OPENAI_API_KEY
pnpm db:up               # Postgres + Redis + telemetry, all in Docker
pnpm db:migrate          # apply every module's schema (incl. performance)
pnpm db:seed             # load the demo tenant (~300 users, plans, tasks)
pnpm dev                 # serves the app at http://localhost:5173
```

Sign in at <http://localhost:5173/login> as `admin@hackathon.com` / `ChangeMe@2026`.

## Performance module — migration & seed

`pnpm db:migrate` above already creates the `performance` schema and its 12 tables. The
steps below are specific to this module.

```bash
# Seed mock performance data (100 employees) into a tenant:
pnpm --filter @seta/performance db:seed -- --tenant=hackathon
#   optional: --count=100 (employees)  --seed=42 (deterministic PRNG)

# Grant a role so the ARIA dashboards/agent become visible to your user:
pnpm -F @seta/cli exec tsx src/index.ts role-grant \
  --user admin@hackathon.com --tenant hackathon \
  --role performance.bod --scope tenant --action grant
```

Roles: `performance.employee` (My Overview), `performance.manager` (+ Team),
`performance.bod` (+ Executive). The seeder is idempotent — re-running replaces the
tenant's performance data.

If you change the schema, regenerate the migration before `db:migrate`:

```bash
pnpm --filter @seta/performance db:generate
```

## Where to find ARIA in the app

| Feature | Route |
|---|---|
| My Overview / Team / Executive dashboards | `/aria/overview`, `/aria/team`, `/aria/executive` |
| Custom dashboards | `/aria/custom` |
| Chat with ARIA | Agent Studio → Chat |
