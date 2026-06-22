import type { CardRiskLevel } from '@seta/performance/contracts';

/**
 * Risk presentation + value-driven metric tones. The card payload reports real,
 * server-computed numbers (a KPI above target, overtime under the limit), so
 * colour is derived from the data — never hardcoded — or a "Good" employee would
 * render in alarm red.
 */

export const RISK_PRESENTATION: Record<CardRiskLevel, { label: string; pill: string }> = {
  high: { label: 'High risk', pill: 'border-transparent bg-destructive-tint text-destructive' },
  medium: {
    label: 'Medium risk',
    pill: 'border-transparent bg-semantic-warning-tint text-semantic-warning',
  },
  low: {
    label: 'Low risk',
    pill: 'border-transparent bg-semantic-success-tint text-semantic-success',
  },
  none: { label: 'No risk', pill: 'border-hairline bg-surface-1 text-ink-muted' },
};

/** Metric emphasis → text colour. Neutral stays on the ink ramp for contrast. */
export type Tone = 'good' | 'neutral' | 'warn' | 'danger';

export const TONE_TEXT: Record<Tone, string> = {
  good: 'text-semantic-success',
  neutral: 'text-ink',
  warn: 'text-semantic-warning',
  danger: 'text-danger-ink',
};

export const TONE_BAR: Record<Tone, string> = {
  good: 'bg-semantic-success',
  neutral: 'bg-primary',
  warn: 'bg-semantic-warning',
  danger: 'bg-danger',
};

export function riskToTone(level: CardRiskLevel): Tone {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warn';
  if (level === 'low') return 'good';
  return 'neutral';
}

/** A KPI at or above target is healthy; a deepening shortfall escalates. */
export function kpiTone(score: number, target: number): Tone {
  if (target <= 0) return 'neutral';
  if (score >= target) return 'good';
  if (score >= target * 0.7) return 'warn';
  return 'danger';
}

/** Over the limit is a hard breach; brushing it is a warning. */
export function overtimeTone(hours: number, limit: number): Tone {
  if (limit <= 0) return 'neutral';
  if (hours > limit) return 'danger';
  if (hours >= limit * 0.9) return 'warn';
  return 'good';
}

export function violationsTone(open: number): Tone {
  if (open <= 0) return 'good';
  if (open <= 2) return 'warn';
  return 'danger';
}

/** Healthy band is ~80–100%; over-allocation (>100%) and bench-time (<80%) both flag. */
export function allocationTone(pct: number | null): Tone {
  if (pct === null) return 'neutral';
  if (pct > 100 || pct < 80) return 'warn';
  return 'good';
}
