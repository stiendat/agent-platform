import type { SessionScope } from '@seta/core';
import { can } from '@seta/shared-rbac';

export class DashboardError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'DashboardError';
  }
}

export function requireDashboardPerm(session: SessionScope, permission: string): void {
  if (!can(session, permission)) {
    throw new DashboardError('FORBIDDEN', `Missing permission: ${permission}`, { permission });
  }
}

export function assertTenantScope(
  entityTenantId: string,
  session: SessionScope,
  entityType: string,
  entityId: string,
): void {
  if (entityTenantId !== session.tenant_id) {
    throw new DashboardError('CROSS_TENANT', `${entityType} belongs to another tenant`, {
      entityType,
      [entityType]: entityId,
    });
  }
}
