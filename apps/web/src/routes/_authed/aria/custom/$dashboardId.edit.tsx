import { MessagePrimitive, ThreadPrimitive, useAui, useThread } from '@assistant-ui/react';
import {
  Badge,
  Button,
  ChatMarkdown,
  ChatMessage,
  ChatTranscript,
  cn,
  PageChrome,
  PageChromeToolbar,
} from '@seta/shared-ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Eye,
  LayoutGrid,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ToolUIRegistry } from '@/modules/agent/components/tool-renderers';
import { useAgentContext } from '@/modules/agent/hooks/use-agent-context';
import { DashboardGrid } from '@/modules/aria/custom-dashboards/components/DashboardGrid';
import { PixelLoader } from '@/modules/aria/custom-dashboards/components/DashboardLoadingOverlay';
import { PromptSuggestions } from '@/modules/aria/custom-dashboards/components/PromptSuggestions';
import type { CustomDashboard, DashboardWidget } from '@/modules/aria/custom-dashboards/types';

const API_BASE = '/api/performance/v1/dashboards/custom';

async function fetchDashboard(id: string): Promise<CustomDashboard | null> {
  const res = await fetch(`${API_BASE}/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.dashboard ?? null;
}

async function apiSave(
  dashboardId: string,
  patch: Partial<{
    name: string;
    period_filter: string | null;
    show_in_sidebar: boolean;
    is_draft: boolean;
    widgets: DashboardWidget[];
  }>,
): Promise<CustomDashboard> {
  const res = await fetch(`${API_BASE}/${dashboardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Save failed');
  const data = await res.json();
  return data.dashboard;
}

export const Route = createFileRoute('/_authed/aria/custom/$dashboardId/edit')({
  component: DashboardEditorPage,
});

function DashboardEditorPage() {
  const { dashboardId } = Route.useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [promptText, setPromptText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gridSaveRef = useRef<(() => DashboardWidget[]) | null>(null);
  const autoArrangeRef = useRef<(() => void) | null>(null);

  useAgentContext({
    kind: 'aria-custom-dashboard',
    id: dashboardId,
    label: dashboard?.name ?? 'Custom Dashboard',
  });

  const aui = useAui();
  // Drives live widget sync: the agent writes widgets server-side as it works,
  // so we mirror the DB while the run is active and one final time after it ends.
  const isRunning = useThread((s) => s.isRunning);
  const aiRunning = isRunning;

  // Per-widget AI edit ("Edit with AI"): the widget ARIA is rewriting in place
  // (shimmer), the widget whose edit just landed (Keep / Undo), and a full-array
  // snapshot taken before the edit so Undo can restore it (incl. an accidental
  // appended duplicate).
  const [composingWidgetId, setComposingWidgetId] = useState<string | null>(null);
  const [recentlyEditedId, setRecentlyEditedId] = useState<string | null>(null);
  const editSnapshotRef = useRef<DashboardWidget[] | null>(null);
  const prevRunningRef = useRef(false);
  const keepTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetchDashboard(dashboardId).then((d) => {
      setDashboard(d);
      setLoading(false);
    });
  }, [dashboardId]);

  // Merge the server's widget set into local state without clobbering the
  // unsaved period selection (which only persists on Save).
  const syncFromServer = useCallback((d: CustomDashboard) => {
    setDashboard((prev) => (prev ? { ...d, periodFilter: prev.periodFilter } : d));
  }, []);

  // While the agent run is active, poll the DB so every widget it adds (a run
  // can write several) appears live — not just the first, and not only on reload.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      fetchDashboard(dashboardId).then((d) => {
        if (d) syncFromServer(d);
      });
    }, 1500);
    return () => clearInterval(id);
  }, [isRunning, dashboardId, syncFromServer]);

  // When the run ends, do one final reconciliation pass (the last widget may
  // land just after the stream closes).
  useEffect(() => {
    if (isRunning || loading) return;
    const t = setTimeout(() => {
      fetchDashboard(dashboardId).then((d) => {
        if (d) syncFromServer(d);
      });
    }, 900);
    return () => clearTimeout(t);
  }, [isRunning, loading, dashboardId, syncFromServer]);

  const handleWidgetsChange = useCallback((widgets: DashboardWidget[]) => {
    setDashboard((d) => {
      if (!d) return d;
      return { ...d, widgets, updatedAt: new Date().toISOString() };
    });
  }, []);

  const handlePopulatePrompt = useCallback((prompt: string) => {
    setPromptText(prompt);
    setChatOpen(true);
  }, []);

  // Per-widget AI edit: snapshot the canvas, then send a scoped instruction that
  // names the widget id so ARIA rewrites it in place (performance_updateDashboardWidget).
  const handleAiEdit = useCallback(
    (widgetId: string, prompt: string) => {
      if (!dashboard || aiRunning) return;
      editSnapshotRef.current = dashboard.widgets;
      setRecentlyEditedId(null);
      setComposingWidgetId(widgetId);
      const scoped = `Edit the widget with id ${widgetId} on this dashboard (call performance_updateDashboardWidget with that widget_id — do not add a new widget). ${prompt}`;
      aui.thread().append({ role: 'user', content: [{ type: 'text', text: scoped }] });
    },
    [dashboard, aiRunning, aui],
  );

  const handleKeepEdit = useCallback(() => {
    setRecentlyEditedId(null);
    editSnapshotRef.current = null;
  }, []);

  // Undo restores the pre-edit canvas (content + drops any appended duplicate)
  // and re-persists it.
  const handleUndoEdit = useCallback(() => {
    const snap = editSnapshotRef.current;
    setRecentlyEditedId(null);
    editSnapshotRef.current = null;
    if (!snap) return;
    setDashboard((d) => (d ? { ...d, widgets: snap } : d));
    apiSave(dashboardId, { widgets: snap }).catch((err) => console.error('Undo failed:', err));
  }, [dashboardId]);

  // When a per-widget edit run ends, do a final sync then reveal Keep / Undo on
  // that card (auto-dismisses after a while if the user walks away).
  useEffect(() => {
    if (prevRunningRef.current && !isRunning && composingWidgetId) {
      const id = composingWidgetId;
      fetchDashboard(dashboardId).then((d) => {
        if (d) syncFromServer(d);
        setComposingWidgetId(null);
        setRecentlyEditedId(id);
        if (keepTimerRef.current) clearTimeout(keepTimerRef.current);
        keepTimerRef.current = setTimeout(() => setRecentlyEditedId(null), 12000);
      });
    }
    prevRunningRef.current = isRunning;
  }, [isRunning, composingWidgetId, dashboardId, syncFromServer]);

  useEffect(
    () => () => {
      if (keepTimerRef.current) clearTimeout(keepTimerRef.current);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!dashboard) return;
    const layoutSynced = gridSaveRef.current?.();
    const widgets = layoutSynced ?? dashboard.widgets;
    setSaving(true);
    apiSave(dashboard.id, {
      widgets,
      is_draft: dashboard.isDraft,
      period_filter: dashboard.periodFilter ?? null,
    })
      .then((updated) => {
        setDashboard(updated);
        setSaving(false);
        setSaved(true);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
      })
      .catch((err) => {
        console.error('Save failed:', err);
        setSaving(false);
      });
  }, [dashboard]);

  const handleToggleDraft = useCallback(() => {
    if (!dashboard) return;
    const nextDraft = !dashboard.isDraft;
    apiSave(dashboard.id, { is_draft: nextDraft })
      .then((updated) => {
        setDashboard(updated);
      })
      .catch((err) => console.error('Toggle draft failed:', err));
  }, [dashboard]);

  const handleSubmitPrompt = useCallback(() => {
    if (!promptText.trim() || !dashboard || aiRunning) return;
    aui.thread().append({ role: 'user', content: [{ type: 'text', text: promptText }] });
    setPromptText('');
  }, [promptText, dashboard, aui, aiRunning]);

  // Minimal chat message renderers for the inline transcript
  // These must be defined inside the component so they have access to the
  // ThreadPrimitive.Messages context (provided by ChatTranscript).
  function UserMessage() {
    return (
      <ChatMessage variant="user">
        <MessagePrimitive.Parts
          components={{
            Text: ({ text }: { text: string }) =>
              text ? <p className="whitespace-pre-wrap">{text}</p> : null,
          }}
        />
      </ChatMessage>
    );
  }

  function AssistantMessage() {
    return (
      <ChatMessage variant="agent" author="ARIA">
        <MessagePrimitive.Parts
          components={{
            Text: ({ text, status }: { text: string; status: { type: string } }) =>
              text.length > 0 ? (
                <div className="relative">
                  <ChatMarkdown text={text} />
                  {status.type === 'running' && (
                    <span
                      aria-hidden
                      className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-[2px] animate-pulse bg-ink"
                    />
                  )}
                </div>
              ) : null,
            Reasoning: () => null,
          }}
        />
        <MessagePrimitive.If hasContent={false} last>
          <div className="flex items-center gap-2 text-caption text-ink-subtle py-2">
            <span aria-hidden className="inline-flex items-center gap-0.5">
              <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.32s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.16s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-primary/70" />
            </span>
            <span className="italic">Thinking...</span>
          </div>
        </MessagePrimitive.If>
      </ChatMessage>
    );
  }

  if (loading) {
    return (
      <PageChrome breadcrumb={['ARIA', 'Custom Dashboards']} title="Loading…">
        <div className="page-container py-24 flex items-center justify-center">
          <PixelLoader label="Loading dashboard…" />
        </div>
      </PageChrome>
    );
  }

  if (!dashboard) {
    return (
      <PageChrome breadcrumb={['ARIA', 'Custom Dashboards']} title="Dashboard not found">
        <div className="page-container py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-body-sm text-ink-muted">
            This dashboard doesn't exist or was deleted.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate({ to: '/aria/custom' })}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboards
          </Button>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumb={['ARIA', 'Custom Dashboards']}
      title={dashboard.name}
      subtitle={`${dashboard.widgets.length} widget${dashboard.widgets.length !== 1 ? 's' : ''}`}
      toolbar={
        <PageChromeToolbar
          left={
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate({ to: '/aria/custom' })}
                className="gap-1.5 -ml-2"
              >
                <ArrowLeft className="size-4" />
                All dashboards
              </Button>
              {dashboard.isDraft && <Badge variant="warning">Draft</Badge>}
            </>
          }
        />
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate({ to: '/aria/custom/$dashboardId', params: { dashboardId } })}
            className="gap-1.5"
          >
            <Eye className="size-4" />
            Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => autoArrangeRef.current?.()}
            className="gap-1.5"
            title="Auto-arrange cards to fit the available space"
          >
            <LayoutGrid className="size-4" />
            Arrange
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSave}
            className="gap-2"
            disabled={saving || aiRunning}
            title={
              aiRunning
                ? 'ARIA is still generating — save will be available when it finishes'
                : undefined
            }
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <span className="size-4 inline-flex items-center justify-center rounded-full bg-on-primary text-primary">
                  <svg className="size-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3 8l3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Saved
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Dashboard
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant={dashboard.isDraft ? 'secondary' : 'ghost'}
            onClick={handleToggleDraft}
            className="gap-2"
          >
            {dashboard.isDraft ? 'Mark as Saved' : 'Revert to Draft'}
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-0">
        <div
          className={cn(
            'flex flex-col border-r border-hairline bg-surface-1 transition-all duration-300 ease-out-expo',
            chatOpen ? 'w-[420px] min-w-[320px]' : 'w-0 min-w-0 overflow-hidden',
          )}
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <span className="text-body-sm font-semibold text-ink">Agent Studio</span>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="rounded-md p-1 text-ink-subtle hover:bg-surface-2 hover:text-ink transition-colors"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <ChatTranscript>
              <ThreadPrimitive.Empty>
                <div className="px-4 py-4 space-y-4">
                  <div className="text-center py-8">
                    <MessageSquare className="size-8 text-ink-subtle mx-auto mb-3" />
                    <p className="text-body-sm font-medium text-ink">
                      Build your dashboard with AI
                    </p>
                    <p className="mt-1 text-caption text-ink-subtle max-w-xs mx-auto">
                      Describe what you want to see and ARIA will generate data cards and charts on
                      the canvas.
                    </p>
                  </div>

                  <PromptSuggestions onPick={handlePopulatePrompt} />
                </div>
              </ThreadPrimitive.Empty>
              <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
            </ChatTranscript>
            <ToolUIRegistry />
          </div>

          <div className="border-t border-hairline p-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-hairline bg-surface-2 px-3 py-2">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitPrompt();
                    }
                  }}
                  placeholder={
                    aiRunning ? 'ARIA is working...' : 'Describe what you want to see...'
                  }
                  className="w-full bg-transparent text-body-sm text-ink outline-none placeholder:text-ink-subtle"
                  disabled={aiRunning}
                />
              </div>
              <Button
                size="sm"
                onClick={handleSubmitPrompt}
                disabled={!promptText.trim() || aiRunning}
              >
                {aiRunning ? <Loader2 className="size-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {!chatOpen && (
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-2 shrink-0">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-body-sm text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
              >
                <PanelLeftOpen className="size-4" />
                Open Chat
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-6">
            <DashboardGrid
              dashboard={dashboard}
              editable
              busy={aiRunning && !composingWidgetId}
              busyLabel="ARIA is composing…"
              aiRunning={aiRunning}
              composingWidgetId={composingWidgetId}
              recentlyEditedId={recentlyEditedId}
              onWidgetsChange={handleWidgetsChange}
              onAiEdit={handleAiEdit}
              onUndoEdit={handleUndoEdit}
              onKeepEdit={handleKeepEdit}
              saveRef={gridSaveRef}
              autoArrangeRef={autoArrangeRef}
            />
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
