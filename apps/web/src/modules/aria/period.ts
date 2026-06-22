const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-04" → "Apr 2026" */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  const label = MONTHS[Number(month) - 1];
  return label ? `${label} ${year}` : period;
}
