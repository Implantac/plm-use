// Utilitários puros de export — sem libs novas.
// CSV: escapa aspas/quebras conforme RFC 4180; download via Blob.
// Print: abre janela com tabela renderizada e dispara window.print().

export type Row = Record<string, string | number | boolean | null | undefined>;

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows: Row[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols =
    columns ??
    Array.from(
      rows.reduce<Set<string>>((s, r) => {
        Object.keys(r).forEach((k) => s.add(k));
        return s;
      }, new Set()),
    );
  const header = cols.map(escapeCell).join(",");
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, rows: Row[], columns?: string[]) {
  const csv = rowsToCsv(rows, columns);
  // BOM para Excel reconhecer UTF-8
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printTable(title: string, rows: Row[], columns?: string[]) {
  if (rows.length === 0) return;
  const cols = columns ?? Object.keys(rows[0]);
  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return;
  const safe = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  const headHtml = cols.map((c) => `<th>${safe(c)}</th>`).join("");
  const bodyHtml = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${safe(String(r[c] ?? ""))}</td>`).join("")}</tr>`)
    .join("");
  const date = new Date().toLocaleString("pt-BR");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,Inter,Arial,sans-serif;margin:32px;color:#111}
  h1{font-size:18px;margin:0 0 4px;letter-spacing:.02em}
  .meta{font-size:11px;color:#666;margin-bottom:18px;text-transform:uppercase;letter-spacing:.15em}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{padding:6px 8px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}
  th{background:#f5f5f5;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#444}
  tr:nth-child(even) td{background:#fafafa}
  @media print{body{margin:12mm}}
</style></head><body>
<h1>${safe(title)}</h1>
<div class="meta">USE MODA PLM · ${safe(date)} · ${rows.length} registros</div>
<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>
<script>window.onload=()=>{window.focus();window.print();}</script>
</body></html>`);
  w.document.close();
}
