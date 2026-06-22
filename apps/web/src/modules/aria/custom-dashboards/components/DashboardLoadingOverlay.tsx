import { cn } from '@seta/shared-ui';
import React from 'react';

const GRID = 5; // 5×5 pixel mosaic

/**
 * A pixel-dissolve mosaic in Seta blue — a diagonal wave ripples across a grid
 * of squares. Used as the "ARIA is composing" affordance, echoing the editor's
 * generative feel. Falls back to a static grid under reduced-motion.
 */
export function PixelLoader({ label, className }: { label?: string; className?: string }) {
  const cells = React.useMemo(
    () =>
      Array.from({ length: GRID * GRID }, (_, i) => ({
        i,
        // Diagonal wave: cells on the same (row+col) anti-diagonal pulse together.
        delay: ((Math.floor(i / GRID) + (i % GRID)) * 90) % 1100,
      })),
    [],
  );

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div
        className="grid gap-[3px] dashboard-pixel-grid"
        style={{ gridTemplateColumns: `repeat(${GRID}, 0.625rem)` }}
        aria-hidden
      >
        {cells.map((c) => (
          <span
            key={c.i}
            className="size-2.5 rounded-[2px] bg-primary dashboard-pixel"
            style={{ animationDelay: `${c.delay}ms` }}
          />
        ))}
      </div>
      {label && (
        <p className="text-body-sm font-medium text-primary dashboard-pixel-label">{label}</p>
      )}

      <style>{`
        @keyframes dashboard-pixel-pulse {
          0%, 100% { opacity: 0.15; transform: scale(0.6); }
          45%      { opacity: 1;    transform: scale(1); }
        }
        @keyframes dashboard-pixel-fade {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        .dashboard-pixel {
          animation: dashboard-pixel-pulse 1.1s cubic-bezier(0.22, 1, 0.36, 1) infinite;
          will-change: opacity, transform;
        }
        .dashboard-pixel-label {
          animation: dashboard-pixel-fade 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dashboard-pixel { animation: none !important; opacity: 0.55; transform: none; }
          .dashboard-pixel-label { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

interface DashboardLoadingOverlayProps {
  visible: boolean;
  label?: string;
}

export function DashboardLoadingOverlay({
  visible,
  label = 'Updating dashboard…',
}: DashboardLoadingOverlayProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-[2px]',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!visible}
    >
      <PixelLoader label={label} />
    </div>
  );
}
