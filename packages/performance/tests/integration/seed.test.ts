import { closePools, initPools } from '@seta/shared-db';
import { withTestDb } from '@seta/shared-testing';
import { afterEach, describe, expect, it } from 'vitest';
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
  // Each test calls initPools inside its own per-test DB; release before the next.
  afterEach(async () => {
    await closePools().catch(() => {});
  });

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

  it('spans the requested number of monthly periods ending at endPeriod', async () => {
    await withTestDb({ templateDbName: TEMPLATE, baseUrl: BASE }, async ({ pool, databaseUrl }) => {
      resetPerformanceDb();
      initPools({ databaseUrl });
      const tenantId = await seedTenant(pool);

      await seedPerformanceData({ tenantId, count: 10, seed: 7, months: 6, endPeriod: '2026-04' });

      // One row per employee × period in the per-month datasets.
      expect(await count(pool, 'performance_by_project', tenantId)).toBe(60);
      expect(await count(pool, 'timesheet', tenantId)).toBe(60);

      // Six consecutive months ending at the anchor.
      const periods = await pool.query<{ report_period: string }>(
        `SELECT DISTINCT report_period FROM performance.performance_by_project
           WHERE tenant_id = $1 ORDER BY report_period`,
        [tenantId],
      );
      expect(periods.rows.map((r) => r.report_period)).toEqual([
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
      ]);
    });
  });

  it('keeps every derived dataset consistent with the raw rows across all months', async () => {
    await withTestDb({ templateDbName: TEMPLATE, baseUrl: BASE }, async ({ pool, databaseUrl }) => {
      resetPerformanceDb();
      initPools({ databaseUrl });
      const tenantId = await seedTenant(pool);

      const MONTHS = 6;
      const LATEST = '2026-04';
      await seedPerformanceData({
        tenantId,
        count: 40,
        seed: 11,
        months: MONTHS,
        endPeriod: LATEST,
      });

      // Helper: a SQL predicate that should match ZERO rows if the invariant holds.
      const violations = async (label: string, sql: string): Promise<[string, number]> => {
        const res = await pool.query<{ n: string }>(sql, [tenantId]);
        return [label, Number(res.rows[0]?.n ?? '0')];
      };

      const checks = await Promise.all([
        // Every employee has exactly MONTHS rows in each per-month dataset.
        violations(
          'perf rows per employee != months',
          `SELECT count(*)::text AS n FROM (
             SELECT member_id FROM performance.performance_by_project WHERE tenant_id=$1
             GROUP BY member_id HAVING count(*) <> ${MONTHS}) x`,
        ),
        violations(
          'timesheet rows per employee != months',
          `SELECT count(*)::text AS n FROM (
             SELECT member_id FROM performance.timesheet WHERE tenant_id=$1
             GROUP BY member_id HAVING count(*) <> ${MONTHS}) x`,
        ),
        // employee_master.overall_score_latest == latest period's score.
        violations(
          'overall_score_latest mismatch',
          `SELECT count(*)::text AS n FROM performance.employee_master em
             JOIN performance.performance_by_project pp
               ON pp.tenant_id=em.tenant_id AND pp.member_id=em.member_id
              AND pp.report_period='${LATEST}'
            WHERE em.tenant_id=$1 AND em.overall_score_latest <> pp.total_point`,
        ),
        // performance_profile.total_ot_hours_t4 == latest timesheet's total OT.
        violations(
          'total_ot_hours_t4 mismatch',
          `SELECT count(*)::text AS n FROM performance.performance_profile pr
             JOIN performance.timesheet ts
               ON ts.tenant_id=pr.tenant_id AND ts.member_id=pr.member_id
              AND ts.report_period='${LATEST}'
            WHERE pr.tenant_id=$1 AND pr.total_ot_hours_t4 <> ts.total_ot_hours`,
        ),
        // violation_summary.total_violations == raw violation rows per member.
        violations(
          'violation_summary total mismatch',
          `SELECT count(*)::text AS n FROM performance.violation_summary vs
            WHERE vs.tenant_id=$1 AND vs.total_violations <> (
              SELECT count(*) FROM performance.violations v
               WHERE v.tenant_id=vs.tenant_id AND v.member_id=vs.member_id)`,
        ),
        // performance_profile.open_violation_count == open raw violations per member.
        violations(
          'open_violation_count mismatch',
          `SELECT count(*)::text AS n FROM performance.performance_profile pr
            WHERE pr.tenant_id=$1 AND pr.open_violation_count <> (
              SELECT count(*) FROM performance.violations v
               WHERE v.tenant_id=pr.tenant_id AND v.member_id=pr.member_id
                 AND v.status IN ('Open','Under Review','Escalated'))`,
        ),
        // Every profile/summary/allocation member exists in employee_master (no orphans).
        violations(
          'profile member not in employee_master',
          `SELECT count(*)::text AS n FROM performance.performance_profile pr
            WHERE pr.tenant_id=$1 AND NOT EXISTS (
              SELECT 1 FROM performance.employee_master em
               WHERE em.tenant_id=pr.tenant_id AND em.member_id=pr.member_id)`,
        ),
      ]);

      // Surface which invariant broke, if any.
      const broken = checks.filter(([, n]) => n !== 0);
      expect(broken).toEqual([]);
    });
  });
});
