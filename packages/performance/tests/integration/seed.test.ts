import { initPools } from '@seta/shared-db';
import { withTestDb } from '@seta/shared-testing';
import { describe, expect, it } from 'vitest';
import { resetPerformanceDb } from '../../src/backend/db/client.ts';
import { seedPerformanceData } from '../../src/index.ts';

const TEMPLATE = process.env.PLATFORM_TEST_PG_TEMPLATE as string;
const BASE = process.env.PLATFORM_TEST_PG_BASE as string;

async function seedTenant(pool: import('pg').Pool): Promise<string> {
  const tenantId = crypto.randomUUID();
  await pool.query(`INSERT INTO core.tenants (id, name, slug) VALUES ($1, $2, $3)`, [
    tenantId,
    `Perf Test ${tenantId.slice(0, 8)}`,
    `perf-${tenantId.slice(0, 8)}`,
  ]);
  return tenantId;
}

async function count(pool: import('pg').Pool, table: string, tenantId: string): Promise<number> {
  const res = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM performance.${table} WHERE tenant_id = $1`,
    [tenantId],
  );
  return Number(res.rows[0]?.n ?? '0');
}

describe('seedPerformanceData', () => {
  it('seeds all 12 performance tables for the tenant, internally consistent and idempotent', async () => {
    await withTestDb({ templateDbName: TEMPLATE, baseUrl: BASE }, async ({ pool, databaseUrl }) => {
      resetPerformanceDb();
      initPools({ databaseUrl });
      const tenantId = await seedTenant(pool);

      const counts = await seedPerformanceData({ tenantId, count: 20, seed: 7 });

      // Raw per-employee datasets sized by --count.
      expect(counts.employee_master).toBe(20);
      expect(await count(pool, 'employee_master', tenantId)).toBe(20);
      expect(await count(pool, 'resource_allocation', tenantId)).toBe(20);
      expect(await count(pool, 'performance_profile', tenantId)).toBe(20);
      // Two report periods (T3 + T4) per employee.
      expect(await count(pool, 'performance_by_project', tenantId)).toBe(40);
      expect(await count(pool, 'timesheet', tenantId)).toBe(40);

      // Reference tables are seeded verbatim and non-empty.
      expect(await count(pool, 'norm_rules', tenantId)).toBeGreaterThan(0);
      expect(await count(pool, 'violation_type_ref', tenantId)).toBeGreaterThan(0);
      expect(await count(pool, 'project_master', tenantId)).toBeGreaterThan(0);

      // Internal consistency: violation_summary totals match raw violation rows.
      const totalFromSummary = await pool.query<{ n: string }>(
        `SELECT coalesce(sum(total_violations),0)::text AS n
           FROM performance.violation_summary WHERE tenant_id = $1`,
        [tenantId],
      );
      expect(Number(totalFromSummary.rows[0]?.n)).toBe(await count(pool, 'violations', tenantId));

      // Idempotent: a second run replaces rather than duplicates.
      await seedPerformanceData({ tenantId, count: 20, seed: 7 });
      expect(await count(pool, 'employee_master', tenantId)).toBe(20);
    });
  });
});
