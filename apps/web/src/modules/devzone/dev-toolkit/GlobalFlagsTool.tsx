import { AlertCircle, Loader2, RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type GlobalFlags, getGlobalFlags, setGlobalFlag } from './api.ts';

const FLAG_META: { key: keyof GlobalFlags; label: string; description: string }[] = [
  {
    key: 'force_expand_reasoning',
    label: 'Force-show agent reasoning',
    description:
      'Every chat renders reasoning steps + tool calls expanded, overriding each user’s collapse preference. Applies deployment-wide.',
  },
];

export function GlobalFlagsTool() {
  const [flags, setFlags] = useState<GlobalFlags | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    getGlobalFlags().then((f) => alive && setFlags(f));
    return () => {
      alive = false;
    };
  }, []);

  async function toggle(key: keyof GlobalFlags) {
    if (!flags) return;
    setActing(key);
    setError(null);
    const res = await setGlobalFlag(key, !flags[key]);
    if (res.ok && res.flags) {
      setFlags(res.flags);
      setDirty(true);
    } else {
      setError(res.error ?? 'Update failed');
    }
    setActing(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] text-ink-tertiary font-mono leading-relaxed">
        Deployment-wide runtime flags. Affect every user.
      </p>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-destructive">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}

      {flags === null ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-mono text-ink-tertiary">
          <Loader2 className="w-3 h-3 animate-spin" />
          Loading flags…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {FLAG_META.map(({ key, label, description }) => {
            const on = flags[key];
            const busy = acting === key;
            return (
              <div
                key={key}
                className="flex items-start gap-2.5 rounded-lg border border-hairline bg-surface-3 px-2.5 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-ink leading-tight">{label}</p>
                  <p className="text-[9px] font-mono text-ink-tertiary leading-relaxed mt-0.5">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={label}
                  disabled={acting !== null}
                  onClick={() => void toggle(key)}
                  className={[
                    'relative shrink-0 w-8 h-4 rounded-full border transition-colors disabled:opacity-50',
                    on ? 'bg-primary/30 border-primary/50' : 'bg-surface-1 border-hairline',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all',
                      on ? 'left-4 bg-primary' : 'left-0.5 bg-ink-tertiary',
                    ].join(' ')}
                  >
                    {busy && <Loader2 className="w-2.5 h-2.5 animate-spin text-ink" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {dirty && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-semantic-warning/40 bg-semantic-warning-tint text-[10px] font-mono text-semantic-warning hover:bg-semantic-warning/10 transition-colors"
        >
          <RotateCw className="w-3 h-3" />
          Reload to apply
        </button>
      )}
    </div>
  );
}
