/**
 * ARIA performance-data seeder (standalone dev CLI).
 *
 *   pnpm --filter @seta/performance db:seed \
 *     [-- --tenant=<slug|uuid>] [--count=<N>] [--seed=<n>] [--months=<N>] [--end-period=<YYYY-MM>]
 *
 * Thin wrapper around `seedPerformanceData` (packages/performance/src/backend/seed.ts);
 * the deployed platform CLI `seed` command calls the same function so the two paths
 * never drift. This script only resolves env + tenant, then delegates.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePools, getPool, initPools } from '@seta/shared-db';
import pino from 'pino';
import { resetPerformanceDb } from '../src/backend/db/client.ts';
import { seedPerformanceData } from '../src/backend/seed.ts';

const log = pino({ name: 'performance/seed' });
const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const TENANT_INPUT = arg('tenant');
const COUNT = Number(arg('count') ?? 100);
const SEED = Number(arg('seed') ?? 42);
const MONTHS = Number(arg('months') ?? 2);
const END_PERIOD = arg('end-period') ?? '2026-04';

async function resolveTenant(): Promise<{ id: string; label: string }> {
  const pool = getPool('web');
  if (TENANT_INPUT) {
    // scripts/ is outside the raw-SQL lint scope; resolving the tenant by slug/uuid here is fine.
    const res = await pool.query<{ id: string; slug: string }>(
      'SELECT id, slug FROM core.tenants WHERE slug = $1 OR id::text = $1 LIMIT 1',
      [TENANT_INPUT],
    );
    if (!res.rows[0]) throw new Error(`No tenant with slug or id: ${TENANT_INPUT}`);
    return { id: res.rows[0].id, label: res.rows[0].slug };
  }
  const res = await pool.query<{ id: string; slug: string }>(
    'SELECT id, slug FROM core.tenants ORDER BY created_at LIMIT 1',
  );
  if (!res.rows[0]) throw new Error('No tenant found. Run scripts/tenant-bootstrap.sh first.');
  return { id: res.rows[0].id, label: res.rows[0].slug };
}

async function main(): Promise<void> {
  process.loadEnvFile(resolve(__dirname, '../../../.env'));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set (expected in repo-root .env).');
  initPools({ databaseUrl });
  resetPerformanceDb();

  try {
    const tenant = await resolveTenant();
    log.info(
      {
        tenant: tenant.label,
        tenantId: tenant.id,
        count: COUNT,
        seed: SEED,
        months: MONTHS,
        endPeriod: END_PERIOD,
      },
      'seeding performance data',
    );
    const counts = await seedPerformanceData({
      tenantId: tenant.id,
      count: COUNT,
      seed: SEED,
      months: MONTHS,
      endPeriod: END_PERIOD,
    });
    log.info(counts, 'seed complete');
  } finally {
    await closePools();
  }
}

await main();
