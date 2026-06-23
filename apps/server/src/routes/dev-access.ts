import type { SessionScope } from '@seta/core';

// Roles that may use the dev toolkit when it runs in a production-mode
// deployment. In non-production the toolkit is open (it never reaches a real
// tenant). This is the single source of truth shared by /me (frontend
// visibility) and every dev route guard, so the two can't drift.
const PROD_ADMIN_ROLES = new Set(['org.admin', 'tenant.admin', 'identity.admin']);

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Whether the dev toolkit (impersonation, self role editing, global flags) is
 * available to this session. Always on outside production; admin-only in
 * production so it can be enabled on staging/demo boxes without becoming a
 * privilege-escalation backdoor for ordinary users.
 */
export function devToolkitEnabled(scope: SessionScope): boolean {
  if (!isProd()) return true;
  return scope.role_summary.roles.some((r) => PROD_ADMIN_ROLES.has(r));
}
