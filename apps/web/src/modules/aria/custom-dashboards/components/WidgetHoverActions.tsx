import { Loader2, Pencil, Sparkles, Trash2, Type, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { DashboardWidget, WidgetContent } from '../types';

interface WidgetHoverActionsProps {
  widget: DashboardWidget;
  editable: boolean;
  onEditClick: (widget: DashboardWidget) => void;
  onRename: (widgetId: string, name: string) => void;
  onDelete: (widgetId: string) => void;
}

export function WidgetHoverActions({
  widget,
  editable,
  onEditClick,
  onRename,
  onDelete,
}: WidgetHoverActionsProps) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(widget.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRenameSubmit = useCallback(() => {
    if (name.trim()) {
      onRename(widget.id, name.trim());
    }
    setRenaming(false);
  }, [name, widget.id, onRename]);

  if (!editable) return null;

  return (
    <div className="absolute right-2 top-2 z-30 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
      {renaming ? (
        <div className="flex items-center gap-1 rounded-lg border border-primary-border bg-surface-1 px-2 py-1 shadow-lg">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') {
                setRenaming(false);
                setName(widget.name);
              }
            }}
            className="w-32 bg-transparent text-body-sm text-ink outline-none"
            // biome-ignore lint/a11y/noAutofocus: focus moves into a popover opened by an explicit user action, not on page load
            autoFocus
          />
          <button
            onClick={handleRenameSubmit}
            className="rounded px-1 text-caption text-primary hover:bg-primary-tint"
            type="button"
          >
            Save
          </button>
          <button
            onClick={() => {
              setRenaming(false);
              setName(widget.name);
            }}
            className="rounded px-1 text-caption text-ink-subtle hover:bg-surface-2"
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <>
          <span className="rounded bg-surface-2/90 px-1.5 py-0.5 text-[10px] font-medium text-ink-subtle backdrop-blur-sm">
            {widget.name}
          </span>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="flex size-6 items-center justify-center rounded-md bg-surface-2/90 text-ink-subtle backdrop-blur-sm hover:bg-surface-3 hover:text-ink transition-colors"
            title="Rename widget"
          >
            <span className="sr-only">Rename</span>
            <span className="text-[10px] font-medium">Aa</span>
          </button>
          <button
            type="button"
            onClick={() => onEditClick(widget)}
            className="flex size-6 items-center justify-center rounded-md bg-surface-2/90 text-ink-subtle backdrop-blur-sm hover:bg-primary-tint hover:text-primary transition-colors"
            title="Edit"
          >
            <Pencil className="size-3" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 rounded-lg border border-danger/30 bg-surface-1 px-2 py-1 shadow-lg">
              <span className="text-caption text-danger-ink">Delete?</span>
              <button
                onClick={() => onDelete(widget.id)}
                className="rounded px-1 text-caption text-danger-ink hover:bg-danger-tint"
                type="button"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded px-1 text-caption text-ink-subtle hover:bg-surface-2"
                type="button"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex size-6 items-center justify-center rounded-md bg-surface-2/90 text-ink-subtle backdrop-blur-sm hover:bg-danger-tint hover:text-danger-ink transition-colors"
              title="Delete widget"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

type EditMode = 'manual' | 'ai';

interface WidgetEditPopoverProps {
  widget: DashboardWidget;
  open: boolean;
  aiRunning: boolean;
  onClose: () => void;
  /** Live, local content edit (revertible) for manually-editable widget types. */
  onPreview: (widgetId: string, content: WidgetContent) => void;
  /** Submit a scoped AI edit for this widget (regenerates it in place). */
  onAiEdit: (widgetId: string, prompt: string) => void;
}

/** Manually editable widget kinds (cards are rendered from data, so AI-only). */
function isManualKind(c: WidgetContent): boolean {
  return c.type === 'text' || c.type === 'header' || c.type === 'indicator' || c.type === 'list';
}

export function WidgetEditPopover({
  widget,
  open,
  aiRunning,
  onClose,
  onPreview,
  onAiEdit,
}: WidgetEditPopoverProps) {
  const manual = isManualKind(widget.content);
  const [mode, setMode] = useState<EditMode>(manual ? 'manual' : 'ai');
  const [prompt, setPrompt] = useState('');
  // Snapshot the content as it was when the popover opened, so Cancel reverts any
  // live preview edits. The popover only mounts while open (and a fresh instance
  // mounts per widget), so capturing on first render is the open-time value.
  const snapshotRef = useRef<WidgetContent>(widget.content);

  const revert = useCallback(() => {
    onPreview(widget.id, snapshotRef.current);
  }, [widget.id, onPreview]);

  const handleCancel = useCallback(() => {
    revert();
    onClose();
  }, [revert, onClose]);

  const handleAiSubmit = useCallback(() => {
    if (!prompt.trim() || aiRunning) return;
    onAiEdit(widget.id, prompt.trim());
    onClose();
  }, [prompt, aiRunning, onAiEdit, widget.id, onClose]);

  if (!open) return null;

  const suggestions = getSuggestions(widget);

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 origin-top-right rounded-xl border border-hairline bg-surface-1 shadow-2xl widget-edit-pop">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-4 shrink-0 text-primary" />
          <span className="truncate text-body-sm font-semibold text-ink">Edit “{widget.name}”</span>
        </div>
        <button
          onClick={handleCancel}
          type="button"
          className="rounded-md p-1 text-ink-subtle hover:bg-surface-2 hover:text-ink transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {manual && (
        <div className="flex gap-1 border-b border-hairline px-3 py-2">
          <SegButton
            active={mode === 'manual'}
            onClick={() => setMode('manual')}
            icon={<Type className="size-3.5" />}
            label="Edit"
          />
          <SegButton
            active={mode === 'ai'}
            onClick={() => setMode('ai')}
            icon={<Sparkles className="size-3.5" />}
            label="Ask AI"
          />
        </div>
      )}

      {mode === 'manual' && manual ? (
        <ManualEditor
          widget={widget}
          onPreview={(content) => onPreview(widget.id, content)}
          onApply={onClose}
          onCancel={handleCancel}
        />
      ) : (
        <div className="px-4 py-3 space-y-3">
          <p className="text-caption text-ink-subtle">
            Describe the change. ARIA rewrites this {labelFor(widget.content.type)} in place — keep
            or undo when it’s done.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAiSubmit();
            }}
            rows={3}
            placeholder={`e.g. ${suggestions[0]?.example ?? 'switch to a bar chart'}`}
            className="w-full resize-none rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none placeholder:text-ink-subtle focus:border-primary/50 transition-colors"
            // biome-ignore lint/a11y/noAutofocus: focus moves into a popover opened by an explicit user action, not on page load
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.prompt}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-[11px] text-ink-muted hover:border-primary/40 hover:text-primary transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-3 py-1.5 text-body-sm text-ink-subtle hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAiSubmit}
              disabled={!prompt.trim() || aiRunning}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {aiRunning ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Update with AI
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes widget-edit-pop-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .widget-edit-pop { animation: widget-edit-pop-in 140ms cubic-bezier(0.16, 1, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) { .widget-edit-pop { animation: none; } }
      `}</style>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-body-sm font-medium transition-colors',
        active
          ? 'bg-primary-tint text-primary'
          : 'text-ink-subtle hover:bg-surface-2 hover:text-ink',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

function ManualEditor({
  widget,
  onPreview,
  onApply,
  onCancel,
}: {
  widget: DashboardWidget;
  onPreview: (content: WidgetContent) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const c = widget.content;

  // Drive live preview on the card as the user types.
  const update = useCallback((next: WidgetContent) => onPreview(next), [onPreview]);

  return (
    <div className="px-4 py-3 space-y-3">
      {c.type === 'header' && (
        <Field label="Heading">
          <input
            type="text"
            value={c.content}
            onChange={(e) => update({ ...c, content: e.target.value })}
            className="w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
            // biome-ignore lint/a11y/noAutofocus: focus moves into a popover opened by an explicit user action, not on page load
            autoFocus
          />
        </Field>
      )}

      {c.type === 'text' && (
        <Field label="Text">
          <textarea
            value={c.content}
            onChange={(e) => update({ ...c, content: e.target.value })}
            rows={5}
            className="w-full resize-none rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
            // biome-ignore lint/a11y/noAutofocus: focus moves into a popover opened by an explicit user action, not on page load
            autoFocus
          />
        </Field>
      )}

      {c.type === 'indicator' && (
        <>
          <Field label="Label">
            <input
              type="text"
              value={c.label}
              onChange={(e) => update({ ...c, label: e.target.value })}
              className="w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
              // biome-ignore lint/a11y/noAutofocus: focus moves into a popover opened by an explicit user action, not on page load
              autoFocus
            />
          </Field>
          <div className="flex gap-2">
            <Field label="Value" className="flex-1">
              <input
                type="text"
                value={c.value}
                onChange={(e) => update({ ...c, value: e.target.value })}
                className="w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
              />
            </Field>
            <Field label="Trend">
              <select
                value={c.trend ?? 'neutral'}
                onChange={(e) =>
                  update({ ...c, trend: e.target.value as 'up' | 'down' | 'neutral' })
                }
                className="rounded-lg border border-hairline bg-surface-2 px-2 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
              >
                <option value="up">Up</option>
                <option value="down">Down</option>
                <option value="neutral">Neutral</option>
              </select>
            </Field>
          </div>
          <Field label="Change note">
            <input
              type="text"
              value={c.change ?? ''}
              onChange={(e) => update({ ...c, change: e.target.value })}
              placeholder="e.g. +0.3 vs last month"
              className="w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none placeholder:text-ink-subtle focus:border-primary/50 transition-colors"
            />
          </Field>
        </>
      )}

      {c.type === 'list' && (
        <>
          <Field label="Title">
            <input
              type="text"
              value={c.title ?? ''}
              onChange={(e) => update({ ...c, title: e.target.value })}
              className="w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
              // biome-ignore lint/a11y/noAutofocus: focus moves into a popover opened by an explicit user action, not on page load
              autoFocus
            />
          </Field>
          <Field label="Items (one per line)">
            <textarea
              value={c.items.join('\n')}
              onChange={(e) => update({ ...c, items: e.target.value.split('\n') })}
              rows={5}
              className="w-full resize-none rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-body-sm text-ink outline-none focus:border-primary/50 transition-colors"
            />
          </Field>
        </>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-body-sm text-ink-subtle hover:bg-surface-2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-primary px-3 py-1.5 text-body-sm font-medium text-on-primary hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the form control is passed in as children and rendered inside this label (implicit association)
    <label className={['block', className].filter(Boolean).join(' ')}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-ink-subtle">
        {label}
      </span>
      {children}
    </label>
  );
}

function labelFor(type: string): string {
  switch (type) {
    case 'card':
      return 'card';
    case 'header':
      return 'heading';
    case 'text':
      return 'text block';
    case 'indicator':
      return 'indicator';
    case 'list':
      return 'list';
    default:
      return 'widget';
  }
}

function getSuggestions(
  widget: DashboardWidget,
): { label: string; prompt: string; example?: string }[] {
  const name = widget.name;
  const out: { label: string; prompt: string; example?: string }[] = [];

  if (widget.content.type === 'card') {
    out.push({
      label: 'Refresh data',
      prompt: `Re-generate "${name}" with the latest data.`,
      example: 'refresh with the latest data',
    });
    out.push({
      label: 'Change chart type',
      prompt: `Change the visualization in "${name}" to a different chart type that better shows the data.`,
      example: 'switch to a bar chart',
    });
    out.push({
      label: 'Add explanation',
      prompt: `Add a short narrative explanation interpreting the data in "${name}".`,
    });
  }
  if (widget.content.type === 'header') {
    out.push({
      label: 'Punchier',
      prompt: `Rewrite the header "${name}" to be punchier.`,
      example: 'make it punchier',
    });
  }
  if (widget.content.type === 'text') {
    out.push({
      label: 'More concise',
      prompt: `Rewrite "${name}" to be more concise and actionable.`,
      example: 'make it more concise',
    });
    out.push({ label: 'Add detail', prompt: `Expand "${name}" with more supporting detail.` });
  }
  if (widget.content.type === 'indicator') {
    out.push({
      label: 'Refresh value',
      prompt: `Update the "${widget.content.label}" indicator in "${name}" with the latest figure.`,
    });
  }
  if (widget.content.type === 'list') {
    out.push({ label: 'Reprioritize', prompt: `Reorder the items in "${name}" by priority.` });
  }
  return out;
}
