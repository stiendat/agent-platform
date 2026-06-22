/**
 * Dependency-free CSV / Excel export for ARIA roster cards. Excel opens an HTML
 * table served with the `application/vnd.ms-excel` mime type directly, so we get
 * a real `.xls` download without pulling in a spreadsheet library.
 *
 * These cards carry no employee PII — the performance schema stores `memberId`
 * as the display name — so exporting the rendered roster is safe.
 */

export type Cell = string | number;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: Cell) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','));
  triggerDownload(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), filename);
}

function esc(value: Cell) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function downloadXls(filename: string, headers: string[], rows: Cell[][]) {
  const thead = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const tbody = rows
    .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>th{background:#f4f4f3;text-align:left;border:1px solid #d9d9d9;padding:6px 10px}td{border:1px solid #e9e8e6;padding:6px 10px}</style></head><body><table>${thead}${tbody}</table></body></html>`;
  triggerDownload(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), filename);
}
