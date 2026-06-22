import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Curated prompts that ARIA reliably fulfils on a custom dashboard. Anchored on
 * the proven widget types (top/bottom performers, at-risk roster, account
 * summary, header, text, and renderReport charts) — no "heatmap" or other shape
 * ARIA has no tool for. Each cycles through the showcase to demonstrate breadth.
 */
const SAMPLE_PROMPTS: { title: string; sub: string; prompt: string }[] = [
  {
    title: 'Top performers leaderboard',
    sub: 'Ranked card with scores + classifications',
    prompt: 'Add a card with the top 5 performers across all accounts and their scores.',
  },
  {
    title: 'Lowest performers',
    sub: 'Bottom-ranked employees by score',
    prompt: 'Add a card listing the 5 lowest performers by score across all accounts.',
  },
  {
    title: 'Who is at risk',
    sub: 'Attrition / overload / compliance roster',
    prompt: 'Add a card showing who is at risk right now, with each employee’s risk signals.',
  },
  {
    title: 'Account risk summary',
    sub: 'Workforce-level risk roll-up',
    prompt: 'Add an account-level risk summary card rolling up risk across the workforce.',
  },
  {
    title: 'Section header + context',
    sub: 'Header and a short text block',
    prompt:
      'Add a section header titled "Q2 Targets" and a text block explaining our key focus areas.',
  },
  {
    title: 'Risk distribution chart',
    sub: 'High / medium / low as a pie chart',
    prompt: 'Add a pie chart breaking down the workforce by risk level (high, medium, low).',
  },
];

const VISIBLE = 3;
const INTERVAL_MS = 4000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function PromptSuggestions({ onPick }: { onPick: (prompt: string) => void }) {
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (paused || reduced) return;
    const id = setInterval(
      () => setStart((s) => (s + VISIBLE) % SAMPLE_PROMPTS.length),
      INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [paused, reduced]);

  const visible = Array.from(
    { length: VISIBLE },
    (_, i) => SAMPLE_PROMPTS[(start + i) % SAMPLE_PROMPTS.length],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover only pauses the auto-advance carousel — a non-essential enhancement, not a control
    <div
      className="space-y-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-1.5 px-1 text-caption text-ink-subtle">
        <Sparkles className="size-3 text-primary" />
        <span>Try asking ARIA</span>
      </div>
      <div key={start} className="space-y-2 prompt-suggestions-fade">
        {visible.map((s, i) => (
          <button
            key={s?.prompt ?? ''}
            type="button"
            onClick={() => s && onPick(s.prompt)}
            className="block w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-surface-3"
            style={{ animationDelay: reduced ? '0ms' : `${i * 60}ms` }}
          >
            <p className="text-body-sm text-ink">{s?.title}</p>
            <p className="text-caption text-ink-subtle">{s?.sub}</p>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes prompt-suggestions-fade-kf {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .prompt-suggestions-fade > button {
          animation: prompt-suggestions-fade-kf 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .prompt-suggestions-fade > button { animation: none; }
        }
      `}</style>
    </div>
  );
}
