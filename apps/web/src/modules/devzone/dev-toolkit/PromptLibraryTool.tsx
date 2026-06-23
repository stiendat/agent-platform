import { useAui, useThread } from '@assistant-ui/react';
import {
  Check,
  ChevronRight,
  Copy,
  CornerDownLeft,
  ListChecks,
  Play,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePanelUI } from '@/modules/agent/chat-experience/agent-provider';

/**
 * Prompt Library — a quick-grab bench of test prompts for ARIA.
 *
 * Two seeded sets exercise the full product surface:
 *  • "ARIA Dashboard" — every custom-dashboard widget kind + report chart +
 *    in-place edit. Run these inside a dashboard's Agent Studio sidebar (the
 *    dev toolkit can't reach that local input, so the action is copy → paste).
 *  • "Chat Cards" — every renderable chat card type. These drop straight into
 *    the main agent chat composer via the panel ("→ chat" button).
 *
 * Devs can also save their own prompts (persisted to localStorage).
 */

type PromptTarget = 'chat' | 'dashboard';

interface PromptItem {
  id: string;
  title: string;
  prompt: string;
  /** Capability this prompt exercises — shown as a dim trailing tag. */
  capability?: string;
  /** Precondition shown as a small caution note (e.g. role requirement). */
  note?: string;
}

interface PromptGroup {
  id: string;
  label: string;
  hint: string;
  target: PromptTarget;
  items: PromptItem[];
}

const STORAGE_KEY = 'seta.devtoolkit.custom-prompts';

const PRESET_GROUPS: PromptGroup[] = [
  {
    id: 'dashboard',
    label: 'ARIA Dashboard',
    hint: 'Run inside a dashboard’s Agent Studio sidebar — copy, then paste.',
    target: 'dashboard',
    items: [
      {
        id: 'd-create',
        title: 'Create a scoped dashboard',
        prompt:
          'Create a new custom dashboard called "Q2 Workforce Health" scoped to period 2026-04.',
        capability: 'createCustomDashboard',
      },
      {
        id: 'd-header-text',
        title: 'Header + text block',
        prompt:
          'Add a section header titled "Q2 Targets" and a short text block summarising our focus for the quarter.',
        capability: 'header · text',
      },
      {
        id: 'd-indicators',
        title: 'KPI indicator tiles',
        prompt:
          'Add three indicator tiles — total employees in scope, high-risk headcount, and total at-risk employees.',
        capability: 'indicator',
      },
      {
        id: 'd-list',
        title: 'Risk-signals list',
        prompt:
          'Add a list widget titled "Active Risk Signals" with the current risk signals across the team.',
        capability: 'list',
      },
      {
        id: 'd-top',
        title: 'Top performers card',
        prompt:
          'Add a card with the top 5 performers across all accounts, with scores and classifications.',
        capability: 'card · top_performers',
      },
      {
        id: 'd-bottom',
        title: 'Bottom performers card',
        prompt: 'Add a card showing the 5 lowest performers by score across all accounts.',
        capability: 'card · bottom_performers',
      },
      {
        id: 'd-atrisk',
        title: 'At-risk roster card',
        prompt:
          'Add a card listing everyone at risk right now, with each employee’s risk signals and recommended action.',
        capability: 'card · at_risk_list',
      },
      {
        id: 'd-account',
        title: 'Account risk summary card',
        prompt:
          'Add an account-level risk summary card rolling up high / medium / low risk across the workforce.',
        capability: 'card · account_summary',
      },
      {
        id: 'd-pie',
        title: 'Risk distribution pie',
        prompt: 'Add a pie chart breaking the workforce down by risk level (high, medium, low).',
        capability: 'report · pie',
      },
      {
        id: 'd-bar',
        title: 'High-risk-by-account bar',
        prompt:
          'Add a bar chart comparing the number of high-risk employees across accounts ACC-A through ACC-E.',
        capability: 'report · bar',
      },
      {
        id: 'd-line',
        title: 'KPI trend line',
        prompt:
          'Add a line chart of EMP-001’s KPI score across the two review periods (2026-03 and 2026-04).',
        capability: 'report · line',
      },
      {
        id: 'd-table',
        title: 'At-risk detail table',
        prompt:
          'Add a table of at-risk employees with columns for risk level, risk summary, and recommended action.',
        capability: 'report · table',
      },
      {
        id: 'd-update',
        title: 'Edit a widget in place',
        prompt: 'Rewrite the top-performers card to show the top 10 instead of 5.',
        capability: 'updateDashboardWidget',
        note: 'A top-performers card must already exist on the canvas.',
      },
    ],
  },
  {
    id: 'chat-cards',
    label: 'Chat Cards',
    hint: 'Drop into the main agent chat — “→ chat” prefills the composer.',
    target: 'chat',
    items: [
      {
        id: 'c-profile',
        title: 'Full employee profile',
        prompt: 'Show me the full performance profile for EMP-031.',
        capability: 'employee_profile_report',
      },
      {
        id: 'c-inline',
        title: 'Quick employee snapshot',
        prompt: 'Give me a quick snapshot of EMP-007’s current performance.',
        capability: 'inline_transcript',
      },
      {
        id: 'c-atrisk',
        title: 'Team at-risk roster',
        prompt: 'Who on account ACC-A is at risk right now?',
        capability: 'at_risk_list',
      },
      {
        id: 'c-account',
        title: 'Workforce risk summary',
        prompt: 'Give me a workforce-level risk summary across the whole org.',
        capability: 'account_summary',
      },
      {
        id: 'c-top',
        title: 'Top performers ranking',
        prompt: 'Who are the top 5 performers this quarter?',
        capability: 'top_performers',
      },
      {
        id: 'c-bottom',
        title: 'Bottom performers ranking',
        prompt: 'Who are the 5 lowest performers this quarter?',
        capability: 'bottom_performers',
      },
      {
        id: 'c-norm',
        title: 'Why is this person at risk?',
        prompt: 'Why is EMP-031 flagged at risk? Explain the NORM rules that triggered.',
        capability: 'norm_explainer',
      },
      {
        id: 'c-report',
        title: 'Multi-chart report',
        prompt:
          'Build a workforce risk report: a pie of risk levels, a bar of high-risk employees by account, and a table of at-risk employees with their risk level and recommended action.',
        capability: 'report',
      },
      {
        id: 'c-denied',
        title: 'RBAC guardrail (access denied)',
        prompt: 'As a team leader, what is EMP-031’s promotion readiness and salary band?',
        capability: 'access_denied',
        note: 'Only fires for a non-HR role — grant a Leader role (Roles tab) and drop admin first.',
      },
      {
        id: 'c-review',
        title: 'Sensitive verdict (human review)',
        prompt: 'Should EMP-031 be placed on a performance improvement plan?',
        capability: 'human_review_flag',
        note: 'ARIA gates the verdict behind a human-review card before revealing it.',
      },
    ],
  },
];

/**
 * A scenario is an ordered run of prompts. Click the name and each prompt is
 * sent to the agent in turn, advancing only when the previous run finishes.
 * These drive the active thread, so on a dashboard editor they build the
 * *current* dashboard end-to-end (the agent already has its page context).
 */
interface Scenario {
  id: string;
  label: string;
  hint: string;
  prompts: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 's-dashboard-tour',
    label: 'Full dashboard capability tour',
    hint: 'Open a dashboard editor first — builds every widget kind + all four charts on it.',
    prompts: [
      'Add a section header titled "Workforce Health — Q2" and a short text block summarising overall workforce health.',
      'Add three KPI indicator tiles — total employees in scope, high-risk headcount, and total at-risk employees.',
      'Add a list widget titled "Active Risk Signals" with the current risk signals across the team.',
      'Add a card with the top 5 performers across all accounts, with scores and classifications.',
      'Add a card listing everyone at risk right now, with each person’s risk signals and recommended action.',
      'Add an account-level risk summary card rolling up high / medium / low risk across the workforce.',
      'Add a pie chart breaking the workforce down by risk level (high, medium, low).',
      'Add a bar chart comparing the number of high-risk employees across accounts ACC-A through ACC-E.',
      'Add a line chart of EMP-001’s KPI score across the two review periods (2026-03 and 2026-04).',
      'Add a table of at-risk employees with columns for risk level, risk summary, and recommended action.',
    ],
  },
  {
    id: 's-charts',
    label: 'Charts showcase',
    hint: 'Open a dashboard editor first — adds a pie, bar, line and table in sequence.',
    prompts: [
      'Add a pie chart breaking the workforce down by risk level (high, medium, low).',
      'Add a bar chart comparing the number of high-risk employees across accounts ACC-A through ACC-E.',
      'Add a line chart of EMP-001’s KPI score across the two review periods (2026-03 and 2026-04).',
      'Add a table of at-risk employees with columns for risk level, risk summary, and recommended action.',
    ],
  },
];

function loadCustom(): PromptItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PromptItem[]) : [];
  } catch {
    return [];
  }
}

function saveCustom(items: PromptItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage disabled / private mode — in-memory only for this session
  }
}

export function PromptLibraryTool() {
  const { setPendingPrompt, setPanelOpen } = usePanelUI();
  const aui = useAui();
  const isRunning = useThread((s) => s.isRunning);
  const [custom, setCustom] = useState<PromptItem[]>(loadCustom);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');

  // Scenario runner — drives the active thread one prompt at a time, advancing
  // only when the prior run completes (isRunning true→false). Dashboard tools
  // execute without HITL suspend, so a single false edge means "step done".
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const queueRef = useRef<string[]>([]);
  const sawRunningRef = useRef(false);

  useEffect(() => {
    if (copiedId === null) return;
    const t = setTimeout(() => setCopiedId(null), 1400);
    return () => clearTimeout(t);
  }, [copiedId]);

  const sendPrompt = useCallback(
    (text: string) => {
      aui.thread().append({ role: 'user', content: [{ type: 'text', text }] });
    },
    [aui],
  );

  function startScenario(s: Scenario) {
    if (isRunning || activeScenario || s.prompts.length === 0) return;
    queueRef.current = s.prompts.slice();
    sawRunningRef.current = false;
    setActiveScenario(s);
    setStepIndex(0);
    setPanelOpen(false); // keep the dashboard's inline studio visible, not the panel
    sendPrompt(queueRef.current[0] as string);
  }

  function stopScenario() {
    queueRef.current = [];
    sawRunningRef.current = false;
    setActiveScenario(null);
    setStepIndex(0);
  }

  // Advance the queue on each completed run. Guard with `sawRunning` so the gap
  // between append and the run actually starting doesn't count as a completion.
  useEffect(() => {
    if (!activeScenario) return;
    if (isRunning) {
      sawRunningRef.current = true;
      return;
    }
    if (!sawRunningRef.current) return;
    sawRunningRef.current = false;
    queueRef.current.shift();
    if (queueRef.current.length === 0) {
      setActiveScenario(null);
      setStepIndex(0);
      return;
    }
    setStepIndex((i) => i + 1);
    sendPrompt(queueRef.current[0] as string);
  }, [isRunning, activeScenario, sendPrompt]);

  const groups = useMemo<PromptGroup[]>(() => {
    if (custom.length === 0) return PRESET_GROUPS;
    return [
      ...PRESET_GROUPS,
      {
        id: 'custom',
        label: 'My Prompts',
        hint: 'Saved on this browser.',
        target: 'chat',
        items: custom,
      },
    ];
  }, [custom]);

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy(item: PromptItem) {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopiedId(item.id);
    } catch {
      // Clipboard blocked (insecure context / permissions). Surface nothing —
      // the "→ chat" send path still works for chat-target prompts.
    }
  }

  function sendToChat(item: PromptItem) {
    setPendingPrompt({ text: item.prompt, autoSend: false });
    setPanelOpen(true);
  }

  function addCustom() {
    const text = draftPrompt.trim();
    if (!text) return;
    const item: PromptItem = {
      id: `u-${text.slice(0, 24)}-${custom.length}`,
      title: draftTitle.trim() || text.slice(0, 40),
      prompt: text,
    };
    const next = [...custom, item];
    setCustom(next);
    saveCustom(next);
    setDraftTitle('');
    setDraftPrompt('');
    setAdding(false);
  }

  function removeCustom(id: string) {
    const next = custom.filter((p) => p.id !== id);
    setCustom(next);
    saveCustom(next);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[10px] text-ink-tertiary font-mono leading-relaxed">
        Test prompts for ARIA. Copy any prompt, or send chat prompts straight to the agent panel.
      </p>

      {/* Scenarios — one click runs an ordered sequence against the active thread. */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <ListChecks className="w-3 h-3 text-ink-tertiary" />
          <span className="text-[11px] font-mono font-medium text-ink">Scenarios</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {SCENARIOS.map((s) => {
            const running = activeScenario?.id === s.id;
            const disabled = (isRunning || activeScenario !== null) && !running;
            return (
              <li
                key={s.id}
                className={[
                  'rounded-lg border px-2.5 py-2 transition-colors',
                  running ? 'border-primary/50 bg-primary/5' : 'border-hairline bg-surface-3',
                ].join(' ')}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => (running ? stopScenario() : startScenario(s))}
                    disabled={disabled}
                    aria-label={running ? 'Stop scenario' : `Run scenario: ${s.label}`}
                    className={[
                      'mt-0.5 w-6 h-6 shrink-0 flex items-center justify-center rounded transition-colors',
                      running
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-primary hover:bg-primary/10 disabled:text-ink-tertiary disabled:hover:bg-transparent disabled:opacity-50',
                    ].join(' ')}
                  >
                    {running ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => (running ? stopScenario() : startScenario(s))}
                    disabled={disabled}
                    className="flex-1 min-w-0 text-left disabled:opacity-50"
                  >
                    <p className="text-[11px] font-mono text-ink leading-tight">{s.label}</p>
                    {running ? (
                      <p className="text-[9px] font-mono text-primary leading-relaxed mt-0.5">
                        Running step {stepIndex + 1} / {s.prompts.length}
                        {isRunning ? '…' : ' — waiting'}
                      </p>
                    ) : (
                      <>
                        <p className="text-[9px] font-mono text-ink-tertiary leading-relaxed mt-0.5">
                          {s.hint}
                        </p>
                        <p className="text-[8.5px] font-mono text-ink-subtle mt-0.5">
                          {s.prompts.length} prompts
                        </p>
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-[8.5px] font-mono text-semantic-warning/90 leading-relaxed">
          Keep this tab open while a scenario runs — switching tabs stops it.
        </p>
      </section>

      <div className="flex flex-col gap-2.5 max-h-[52vh] overflow-y-auto -mx-0.5 px-0.5">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.id);
          return (
            <section key={group.id} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
                className="flex items-center gap-1.5 text-left group/header"
              >
                <ChevronRight
                  className={[
                    'w-3 h-3 text-ink-tertiary transition-transform',
                    isCollapsed ? '' : 'rotate-90',
                  ].join(' ')}
                />
                <span className="text-[11px] font-mono font-medium text-ink">{group.label}</span>
                <span className="text-[9px] font-mono text-ink-tertiary">{group.items.length}</span>
              </button>

              {!isCollapsed && (
                <>
                  <p className="text-[9px] font-mono text-ink-tertiary leading-relaxed pl-[18px]">
                    {group.hint}
                  </p>
                  <ul className="flex flex-col gap-1.5 pl-[18px]">
                    {group.items.map((item) => {
                      const copied = copiedId === item.id;
                      const sendable = group.target === 'chat';
                      const isCustom = group.id === 'custom';
                      return (
                        <li
                          key={item.id}
                          className="group/row rounded-lg border border-hairline bg-surface-3 px-2.5 py-2"
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-mono text-ink leading-tight truncate">
                                {item.title}
                              </p>
                              <p className="text-[9px] font-mono text-ink-tertiary leading-relaxed mt-0.5 line-clamp-2">
                                {item.prompt}
                              </p>
                              {item.capability && (
                                <p className="text-[8.5px] font-mono text-ink-subtle mt-1 truncate">
                                  {item.capability}
                                </p>
                              )}
                              {item.note && (
                                <p className="text-[8.5px] font-mono text-semantic-warning/90 leading-relaxed mt-1">
                                  {item.note}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              {sendable && (
                                <button
                                  type="button"
                                  onClick={() => sendToChat(item)}
                                  aria-label="Send to agent chat"
                                  title="Send to agent chat"
                                  className="w-6 h-6 flex items-center justify-center rounded text-ink-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <CornerDownLeft className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void copy(item)}
                                aria-label={copied ? 'Copied' : 'Copy prompt'}
                                title="Copy prompt"
                                className="w-6 h-6 flex items-center justify-center rounded text-ink-tertiary hover:text-ink hover:bg-surface-1 transition-colors"
                              >
                                {copied ? (
                                  <Check className="w-3 h-3 text-semantic-success" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => removeCustom(item.id)}
                                  aria-label="Delete prompt"
                                  title="Delete prompt"
                                  className="w-6 h-6 flex items-center justify-center rounded text-ink-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          );
        })}
      </div>

      {/* Add a custom prompt */}
      {adding ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-surface-3 p-2">
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-surface-1 rounded border border-hairline px-2 py-1 text-[10px] font-mono text-ink outline-none focus:border-primary/50 placeholder:text-ink-tertiary"
          />
          <textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="Prompt text…"
            rows={2}
            className="w-full resize-none bg-surface-1 rounded border border-hairline px-2 py-1 text-[10px] font-mono text-ink outline-none focus:border-primary/50 placeholder:text-ink-tertiary"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraftTitle('');
                setDraftPrompt('');
              }}
              className="px-2 py-1 rounded text-[10px] font-mono text-ink-tertiary hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addCustom}
              disabled={!draftPrompt.trim()}
              className="px-2 py-1 rounded text-[10px] font-mono text-primary border border-primary/40 hover:bg-primary/10 transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-hairline text-[10px] font-mono text-ink-tertiary hover:text-ink hover:border-hairline-strong transition-colors"
        >
          <Plus className="w-3 h-3" />
          Save a prompt
        </button>
      )}
    </div>
  );
}
