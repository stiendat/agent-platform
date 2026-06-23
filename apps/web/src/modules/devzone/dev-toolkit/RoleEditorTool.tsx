import { AlertCircle, Check, Loader2, RotateCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getMyRoles, grantMyRole, type MyRoleGrant, revokeMyRole } from './api.ts';

/** Group `module.role` slugs under their module prefix for a scannable list. */
function groupByModule(slugs: string[]): { module: string; roles: string[] }[] {
  const map = new Map<string, string[]>();
  for (const slug of slugs) {
    const mod = slug.includes('.') ? slug.slice(0, slug.indexOf('.')) : 'other';
    const list = map.get(mod) ?? [];
    list.push(slug);
    map.set(mod, list);
  }
  return Array.from(map, ([module, roles]) => ({ module, roles })).sort((a, b) =>
    a.module.localeCompare(b.module),
  );
}

export function RoleEditorTool() {
  const [assignable, setAssignable] = useState<string[]>([]);
  const [grants, setGrants] = useState<MyRoleGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    getMyRoles()
      .then((r) => {
        if (!alive) return;
        setAssignable(r.assignable);
        setGrants(r.grants);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const grantBySlug = new Map(grants.map((g) => [g.role_slug, g]));

  async function toggle(slug: string) {
    setActing(slug);
    setError(null);
    const existing = grantBySlug.get(slug);
    const res = existing ? await revokeMyRole(existing.grant_id) : await grantMyRole(slug);
    if (res.ok) {
      const fresh = await getMyRoles();
      setGrants(fresh.grants);
      setDirty(true);
    } else {
      setError(res.error ?? 'Action failed');
    }
    setActing(null);
  }

  const groups = groupByModule(assignable);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-ink-tertiary font-mono leading-relaxed">
        Grant or revoke roles on your own account. Tenant scope.
      </p>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-destructive">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-mono text-ink-tertiary">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading roles…
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto -mx-1 px-1">
          {groups.map(({ module, roles }) => (
            <div key={module} className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-ink-tertiary px-1">
                {module}
              </span>
              {roles.map((slug) => {
                const active = grantBySlug.has(slug);
                const busy = acting === slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => void toggle(slug)}
                    disabled={acting !== null}
                    aria-pressed={active}
                    className={[
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      active
                        ? 'border-primary/40 bg-primary/10 text-ink'
                        : 'border-hairline bg-surface-3 text-ink-muted hover:text-ink hover:border-hairline-strong',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'shrink-0 w-4 h-4 rounded flex items-center justify-center border',
                        active
                          ? 'bg-primary/20 border-primary/50 text-primary-ink'
                          : 'border-hairline text-transparent',
                      ].join(' ')}
                    >
                      {busy ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-ink-tertiary" />
                      ) : (
                        <Check className="w-2.5 h-2.5" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0 text-[11px] font-mono truncate">
                      {slug.includes('.') ? slug.slice(slug.indexOf('.') + 1) : slug}
                    </span>
                    {active && <ShieldCheck className="shrink-0 w-3 h-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-semantic-warning/40 bg-semantic-warning-tint text-[10px] font-mono text-semantic-warning hover:bg-semantic-warning/10 transition-colors"
        >
          <RotateCw className="w-3 h-3" />
          Reload to apply role changes
        </button>
      )}
    </div>
  );
}
