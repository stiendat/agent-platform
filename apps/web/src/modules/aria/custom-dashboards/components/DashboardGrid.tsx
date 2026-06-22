import { cn } from '@seta/shared-ui';
import { Check, GripVertical, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CustomDashboard, DashboardWidget, WidgetContent } from '../types';
import { DashboardLoadingOverlay, PixelLoader } from './DashboardLoadingOverlay';
import { useDashboardLoading } from './useDashboardLoading';
import { WidgetEditPopover, WidgetHoverActions } from './WidgetHoverActions';
import { WidgetRenderer } from './WidgetRenderer';

const GRID_GAP = 12; // matches gap-3
const MIN_HEIGHT_PX = 96;
const MAX_HEIGHT_PX = 1200;

interface DashboardGridProps {
  dashboard: CustomDashboard;
  editable: boolean;
  /** External busy state (e.g. an initial ARIA run); shows the grid-wide overlay. */
  busy?: boolean;
  busyLabel?: string;
  /** True while any ARIA run is active (gates per-widget AI edits). */
  aiRunning?: boolean;
  /** The widget ARIA is currently rewriting in place — shows a per-card shimmer. */
  composingWidgetId?: string | null;
  /** A widget whose AI edit just landed — shows Keep / Undo + a content fade. */
  recentlyEditedId?: string | null;
  onWidgetsChange?: (widgets: DashboardWidget[]) => void;
  onAiEdit?: (widgetId: string, prompt: string) => void;
  onUndoEdit?: (widgetId: string) => void;
  onKeepEdit?: (widgetId: string) => void;
  saveRef?: React.MutableRefObject<(() => DashboardWidget[]) | null>;
  autoArrangeRef?: React.MutableRefObject<(() => void) | null>;
}

function bpFromWidth(w: number): 'lg' | 'md' | 'sm' | 'xs' {
  if (w >= 1024) return 'lg';
  if (w >= 768) return 'md';
  if (w >= 640) return 'sm';
  return 'xs';
}

const COLS_BY_BP: Record<string, number> = { lg: 12, md: 8, sm: 6, xs: 4 };

export function DashboardGrid({
  dashboard,
  editable,
  busy,
  busyLabel,
  aiRunning,
  composingWidgetId,
  recentlyEditedId,
  onWidgetsChange,
  onAiEdit,
  onUndoEdit,
  onKeepEdit,
  saveRef,
  autoArrangeRef,
}: DashboardGridProps) {
  const [editTarget, setEditTarget] = useState<DashboardWidget | null>(null);
  // Drag-and-drop reorder. `armedId` is set on grip pointer-down so only a
  // grab that starts on the handle makes the card draggable (clicks, resize,
  // and text selection stay intact). `dragId` is the lifted card; `dragOverId`
  // is the card it's hovering over (the drop slot).
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Native DnD events can fire before React commits the dragId state, so the
  // drop handler reads the lifted id from a ref (source of truth); the state
  // mirrors it only for visual feedback.
  const dragIdRef = useRef<string | null>(null);
  const { loading, trigger } = useDashboardLoading(700);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1024);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const bp = bpFromWidth(containerWidth);
  const cols = COLS_BY_BP[bp] ?? 12;
  const colStride = (containerWidth + GRID_GAP) / cols; // px per column incl. one gap

  useImperativeHandle(saveRef, () => () => dashboard.widgets, [dashboard.widgets]);

  useImperativeHandle(
    autoArrangeRef,
    () => () => {
      const arranged = autoArrangeWidgets(dashboard.widgets, cols);
      if (onWidgetsChange) onWidgetsChange(arranged);
    },
    [dashboard.widgets, cols, onWidgetsChange],
  );

  // Reorder by moving the dragged widget to the slot of the drop target.
  const handleReorder = useCallback(
    (sourceId: string, targetId: string) => {
      if (!onWidgetsChange || sourceId === targetId) return;
      const arr = [...dashboard.widgets];
      const from = arr.findIndex((w) => w.id === sourceId);
      const to = arr.findIndex((w) => w.id === targetId);
      if (from === -1 || to === -1) return;
      const [moved] = arr.splice(from, 1);
      if (!moved) return;
      arr.splice(to, 0, moved);
      trigger();
      onWidgetsChange(arr);
    },
    [dashboard.widgets, onWidgetsChange, trigger],
  );

  const handleDragStart = useCallback((widgetId: string) => {
    dragIdRef.current = widgetId;
    setDragId(widgetId);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
    setArmedId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      const sourceId = dragIdRef.current;
      if (sourceId) handleReorder(sourceId, targetId);
      dragIdRef.current = null;
      setDragId(null);
      setDragOverId(null);
      setArmedId(null);
    },
    [handleReorder],
  );

  // Resize width (column span) and/or height (explicit px). A height drag flips
  // the widget to `heightMode: 'fixed'`; untouched widgets stay 'auto' (content
  // height), so existing dashboards render unchanged.
  const handleResize = useCallback(
    (widgetId: string, next: { span?: number; heightPx?: number }) => {
      if (!onWidgetsChange) return;
      const updated = dashboard.widgets.map((w) => {
        if (w.id !== widgetId) return w;
        const layout = { ...w.layout };
        if (next.span !== undefined) layout.w = Math.max(2, Math.min(cols, next.span));
        if (next.heightPx !== undefined) {
          layout.heightMode = 'fixed';
          layout.heightPx = Math.max(
            MIN_HEIGHT_PX,
            Math.min(MAX_HEIGHT_PX, Math.round(next.heightPx)),
          );
        }
        return { ...w, layout };
      });
      onWidgetsChange(updated);
    },
    [dashboard.widgets, cols, onWidgetsChange],
  );

  const handleRename = useCallback(
    (widgetId: string, name: string) => {
      if (!onWidgetsChange) return;
      const updated = dashboard.widgets.map((w) => (w.id === widgetId ? { ...w, name } : w));
      trigger();
      onWidgetsChange(updated);
    },
    [dashboard.widgets, onWidgetsChange, trigger],
  );

  const handleDelete = useCallback(
    (widgetId: string) => {
      if (!onWidgetsChange) return;
      const updated = dashboard.widgets.filter((w) => w.id !== widgetId);
      trigger();
      onWidgetsChange(updated);
    },
    [dashboard.widgets, onWidgetsChange, trigger],
  );

  const handleEditClick = useCallback((widget: DashboardWidget) => {
    setEditTarget((prev) => (prev?.id === widget.id ? null : widget));
  }, []);

  // Live, revertible content edit for manually-editable widgets.
  const handlePreviewContent = useCallback(
    (widgetId: string, content: WidgetContent) => {
      if (!onWidgetsChange) return;
      onWidgetsChange(dashboard.widgets.map((w) => (w.id === widgetId ? { ...w, content } : w)));
    },
    [dashboard.widgets, onWidgetsChange],
  );

  const handleAiEdit = useCallback(
    (widgetId: string, prompt: string) => {
      setEditTarget(null);
      onAiEdit?.(widgetId, prompt);
    },
    [onAiEdit],
  );

  const overlayVisible = loading || !!busy;
  const overlayLabel = busy ? (busyLabel ?? 'ARIA is composing…') : 'Updating dashboard…';

  if (dashboard.widgets.length === 0) {
    return (
      <div className="relative" ref={containerRef}>
        <DashboardLoadingOverlay visible={overlayVisible} label={overlayLabel} />
        <DashboardEmptyState editable={editable} />
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <DashboardLoadingOverlay visible={overlayVisible} label={overlayLabel} />

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {dashboard.widgets.map((widget) => {
          const composing = composingWidgetId === widget.id;
          const justEdited = recentlyEditedId === widget.id;
          const isDragging = dragId === widget.id;
          const isDropTarget = !!dragId && dragOverId === widget.id && dragId !== widget.id;
          const fixedHeight =
            widget.layout.heightMode === 'fixed' ? widget.layout.heightPx : undefined;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: native HTML5 drag-and-drop reorder zone; the drag is armed and initiated from the grip button
            <div
              key={widget.id}
              data-widget-card
              draggable={editable && armedId === widget.id}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', widget.id);
                handleDragStart(widget.id);
              }}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                if (!dragIdRef.current) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverId !== widget.id) setDragOverId(widget.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(widget.id);
              }}
              className={cn(
                'group relative rounded-xl border border-hairline bg-surface-1',
                'transition-[box-shadow,opacity,transform] duration-150',
                editable &&
                  'hover:border-primary/30 hover:shadow-[0_0_0_1px_var(--color-primary-border)]',
                composing && 'ring-1 ring-primary/40',
                isDragging && 'opacity-40',
                isDropTarget && 'ring-2 ring-primary ring-offset-2 ring-offset-canvas',
                fixedHeight !== undefined && 'overflow-hidden',
              )}
              style={{
                gridColumn: `span ${Math.min(widget.layout.w, cols)}`,
                height: fixedHeight,
              }}
            >
              {editable && (
                <>
                  <WidgetHoverActions
                    widget={widget}
                    editable
                    onEditClick={handleEditClick}
                    onRename={handleRename}
                    onDelete={handleDelete}
                  />
                  <DragHandle
                    onArm={() => setArmedId(widget.id)}
                    onDisarm={() => setArmedId((prev) => (prev === widget.id ? null : prev))}
                  />
                  <ResizeHandle
                    widgetId={widget.id}
                    axis="x"
                    span={widget.layout.w}
                    cols={cols}
                    colStride={colStride}
                    onResize={handleResize}
                  />
                  <ResizeHandle
                    widgetId={widget.id}
                    axis="y"
                    span={widget.layout.w}
                    cols={cols}
                    colStride={colStride}
                    onResize={handleResize}
                  />
                  <ResizeHandle
                    widgetId={widget.id}
                    axis="both"
                    span={widget.layout.w}
                    cols={cols}
                    colStride={colStride}
                    onResize={handleResize}
                  />
                </>
              )}

              <div
                className={cn(
                  justEdited && 'widget-content-enter',
                  fixedHeight !== undefined && 'h-full overflow-y-auto',
                )}
              >
                <WidgetRenderer widget={widget} />
              </div>

              {composing && (
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-canvas/75 backdrop-blur-[2px]">
                  <PixelLoader label="ARIA is editing…" />
                </div>
              )}

              {editable && justEdited && !composing && (
                <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 rounded-b-xl border-t border-primary/20 bg-primary-tint/90 px-3 py-1.5 backdrop-blur-sm widget-keepbar">
                  <span className="text-caption font-medium text-primary">Updated by ARIA</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUndoEdit?.(widget.id)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-caption text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
                    >
                      <RotateCcw className="size-3" />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => onKeepEdit?.(widget.id)}
                      className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-caption font-medium text-on-primary hover:bg-primary/90 transition-colors"
                    >
                      <Check className="size-3" />
                      Keep
                    </button>
                  </div>
                </div>
              )}

              {editable && editTarget?.id === widget.id && (
                <WidgetEditPopover
                  widget={widget}
                  open
                  aiRunning={!!aiRunning}
                  onClose={() => setEditTarget(null)}
                  onPreview={handlePreviewContent}
                  onAiEdit={handleAiEdit}
                />
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes widget-content-enter-kf {
          from { opacity: 0; filter: blur(4px); transform: scale(0.99); }
          to   { opacity: 1; filter: blur(0); transform: scale(1); }
        }
        .widget-content-enter { animation: widget-content-enter-kf 420ms cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes widget-keepbar-kf { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .widget-keepbar { animation: widget-keepbar-kf 200ms cubic-bezier(0.16, 1, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) {
          .widget-content-enter, .widget-keepbar { animation: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Drag to resize a card. `axis` picks the edge: 'x' (right edge → column span,
 * snaps to grid), 'y' (bottom edge → explicit pixel height), or 'both' (corner).
 * Width snaps to columns; height is free pixels and flips the widget to a fixed
 * height. The starting height is measured from the live card so an 'auto' widget
 * resizes from whatever it currently renders at.
 */
function ResizeHandle({
  widgetId,
  axis,
  span,
  cols,
  colStride,
  onResize,
}: {
  widgetId: string;
  axis: 'x' | 'y' | 'both';
  span: number;
  cols: number;
  colStride: number;
  onResize: (id: string, next: { span?: number; heightPx?: number }) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [liveSpan, setLiveSpan] = useState(span);
  const stateRef = useRef<{
    startX: number;
    startY: number;
    startSpan: number;
    startH: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const handle = e.currentTarget as HTMLElement;
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      const card = handle.closest('[data-widget-card]') as HTMLElement | null;
      stateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startSpan: span,
        startH: card?.getBoundingClientRect().height ?? MIN_HEIGHT_PX,
      };
      setLiveSpan(span);
      setDragging(true);
    },
    [span],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      if (!s) return;
      const next: { span?: number; heightPx?: number } = {};
      if (axis !== 'y' && colStride > 0) {
        const deltaCols = Math.round((e.clientX - s.startX) / colStride);
        const nextSpan = Math.max(2, Math.min(cols, s.startSpan + deltaCols));
        next.span = nextSpan;
        setLiveSpan(nextSpan);
      }
      if (axis !== 'x') {
        next.heightPx = s.startH + (e.clientY - s.startY);
      }
      onResize(widgetId, next);
    },
    [axis, colStride, cols, widgetId, onResize],
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    stateRef.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const handlerProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
  const baseShow = 'opacity-0 transition-opacity duration-150 group-hover:opacity-100';

  if (axis === 'x') {
    return (
      <button
        type="button"
        aria-label="Resize widget width"
        {...handlerProps}
        className={cn(
          'absolute right-0 top-0 z-30 flex h-full w-3 cursor-col-resize touch-none items-center justify-center',
          baseShow,
          dragging && 'opacity-100',
        )}
        title={`Width: ${span} / ${cols} columns — drag to resize`}
      >
        <span
          className={cn(
            'h-8 w-1 rounded-full bg-hairline-strong transition-colors',
            dragging && 'bg-primary',
          )}
        />
        {dragging && (
          <span className="pointer-events-none absolute right-3 top-2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-canvas">
            {liveSpan}/{cols}
          </span>
        )}
      </button>
    );
  }

  if (axis === 'y') {
    return (
      <button
        type="button"
        aria-label="Resize widget height"
        {...handlerProps}
        className={cn(
          'absolute bottom-0 left-0 z-30 flex h-3 w-full cursor-row-resize touch-none items-center justify-center',
          baseShow,
          dragging && 'opacity-100',
        )}
        title="Drag to resize height"
      >
        <span
          className={cn(
            'h-1 w-8 rounded-full bg-hairline-strong transition-colors',
            dragging && 'bg-primary',
          )}
        />
      </button>
    );
  }

  // corner — both axes
  return (
    <button
      type="button"
      aria-label="Resize widget"
      {...handlerProps}
      className={cn(
        'absolute bottom-0 right-0 z-[31] flex size-4 cursor-nwse-resize touch-none items-end justify-end p-0.5',
        baseShow,
        dragging && 'opacity-100',
      )}
      title="Drag to resize width and height"
    >
      <span
        className={cn(
          'block size-2 rounded-br-sm border-b-2 border-r-2 border-hairline-strong transition-colors',
          dragging && 'border-primary',
        )}
      />
    </button>
  );
}

/** Grab handle — arms the card for native drag-to-reorder while held. */
function DragHandle({ onArm, onDisarm }: { onArm: () => void; onDisarm: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={onArm}
      onPointerUp={onDisarm}
      onPointerCancel={onDisarm}
      className={cn(
        'absolute left-2 bottom-2 z-30 flex size-6 cursor-grab items-center justify-center rounded-md',
        'bg-surface-2/90 text-ink-subtle backdrop-blur-sm transition-colors active:cursor-grabbing',
        'opacity-0 group-hover:opacity-100 hover:bg-surface-3 hover:text-ink',
      )}
      title="Drag to reorder"
      aria-label="Drag to reorder widget"
    >
      <GripVertical className="size-3.5" />
    </button>
  );
}

function autoArrangeWidgets(widgets: DashboardWidget[], cols: number): DashboardWidget[] {
  const grid = new Map<string, boolean>();
  function tryPlace(w: number, h: number): { x: number; y: number } | null {
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= cols - w; x++) {
        let ok = true;
        for (let dx = 0; dx < w && ok; dx++) {
          for (let dy = 0; dy < h && ok; dy++) {
            if (grid.get(`${x + dx},${y + dy}`)) ok = false;
          }
        }
        if (ok) {
          for (let dx = 0; dx < w; dx++) {
            for (let dy = 0; dy < h; dy++) {
              grid.set(`${x + dx},${y + dy}`, true);
            }
          }
          return { x, y };
        }
      }
    }
    return null;
  }

  const sorted = widgets
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w.layout.w - a.w.layout.w || a.i - b.i)
    .map((x) => x.w);

  return sorted.map((w) => {
    const width = Math.min(w.layout.w, cols);
    const height = Math.max(w.layout.h, 2);
    const pos = tryPlace(width, height) ?? { x: 0, y: 0 };
    return { ...w, layout: { ...w.layout, x: pos.x, y: pos.y, w: width, h: height } };
  });
}

function DashboardEmptyState({ editable }: { editable: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-surface-2 border border-hairline mb-4">
        <div className="size-6 rounded-md border-2 border-dashed border-ink-subtle" />
      </div>
      <p className="text-body-sm font-medium text-ink">No widgets yet</p>
      <p className="mt-1 text-caption text-ink-subtle max-w-xs">
        {editable
          ? 'Ask ARIA in the chat panel to create data cards and add them to this dashboard.'
          : 'This dashboard is empty. Open the editor to add widgets.'}
      </p>
    </div>
  );
}
