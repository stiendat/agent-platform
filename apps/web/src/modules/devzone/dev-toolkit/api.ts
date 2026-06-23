export interface ImpersonateStatus {
  active: false;
}
export interface ImpersonateStatusActive {
  active: true;
  target: { user_id: string; email: string; display_name: string };
}

export async function getImpersonateStatus(): Promise<ImpersonateStatus | ImpersonateStatusActive> {
  const res = await fetch('/api/identity/v1/dev/impersonate', { credentials: 'include' });
  if (!res.ok) return { active: false };
  return res.json() as Promise<ImpersonateStatus | ImpersonateStatusActive>;
}

export async function startImpersonation(userId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/identity/v1/dev/impersonate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function exitImpersonation(): Promise<void> {
  await fetch('/api/identity/v1/dev/impersonate', {
    method: 'DELETE',
    credentials: 'include',
  });
}

// ── Role editor ────────────────────────────────────────────────────────────

export interface MyRoleGrant {
  grant_id: string;
  role_slug: string;
}
export interface MyRolesResult {
  assignable: string[];
  grants: MyRoleGrant[];
}

export async function getMyRoles(): Promise<MyRolesResult> {
  const res = await fetch('/api/identity/v1/dev/my-roles', { credentials: 'include' });
  if (!res.ok) return { assignable: [], grants: [] };
  return res.json() as Promise<MyRolesResult>;
}

export async function grantMyRole(roleSlug: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/identity/v1/dev/my-roles', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role_slug: roleSlug }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function revokeMyRole(grantId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/identity/v1/dev/my-roles/${grantId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}

// ── Global flags ─────────────────────────────────────────────────────────────

export interface GlobalFlags {
  force_expand_reasoning: boolean;
}

export async function getGlobalFlags(): Promise<GlobalFlags> {
  const res = await fetch('/api/identity/v1/dev/flags', { credentials: 'include' });
  if (!res.ok) return { force_expand_reasoning: false };
  const data = (await res.json()) as { flags: GlobalFlags };
  return data.flags;
}

export async function setGlobalFlag(
  key: keyof GlobalFlags,
  value: boolean,
): Promise<{ ok: boolean; flags?: GlobalFlags; error?: string }> {
  const res = await fetch('/api/identity/v1/dev/flags', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  const data = (await res.json()) as { flags: GlobalFlags };
  return { ok: true, flags: data.flags };
}
