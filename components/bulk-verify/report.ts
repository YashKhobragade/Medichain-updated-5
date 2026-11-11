// Exports for a bulk verification run: spreadsheet CSV and a printable compliance report.
import Papa from 'papaparse';
import { VERDICT_COPY, VERDICT_SEVERITY, type VerificationResult } from '@/lib/verification';

export interface BulkRun {
    runId: string;
    verifiedAt: string;
    source: 'database' | 'demo';
    facility: string;
    fileName: string;
    stats: {
        total: number; unique: number; genuine: number; suspicious: number; expired: number;
        counterfeit: number; notFound: number; nearExpiry: number; units: number;
    };
    results: VerificationResult[];
}

function download(content: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(content: string, name: string) {
    download(content, name, 'text/csv;charset=utf-8');
}

export function exportCsv(run: BulkRun) {
    const rows = run.results.map(r => ({
        'Row': r.row ?? '',
        'Batch ID': r.batchId,
        'Verdict': VERDICT_COPY[r.verdict].label,
        'Trust score': r.trustScore,
        'Medicine (ledger)': r.productName ?? '',
        'Manufacturer': r.manufacturer ?? '',
        'Expiry (ledger)': r.expiryDate?.slice(0, 10) ?? '',
        'Days to expiry': r.daysToExpiry ?? '',
        'Medicine (pack)': r.claims?.productName ?? '',
        'Expiry (pack)': r.claims?.expiry ?? '',
        'Quantity': r.claims?.quantity ?? '',
        'Finding': r.summary,
        'Action': r.action,
        'Custody path': r.path.map(p => p.name).join(' > '),
    }));
    // BOM so Excel opens UTF-8 (em dashes, ₹) correctly
    download('\uFEFF' + Papa.unparse(rows), `${run.runId}.csv`, 'text/csv;charset=utf-8');
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const VERDICT_COLOR: Record<string, string> = {
    genuine: '#047857', suspicious: '#b45309', expired: '#c2410c', counterfeit: '#be123c', not_found: '#475569',
};

export function reportHtml(run: BulkRun) {
    const when = new Date(run.verifiedAt);
    const fmt = when.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const sorted = [...run.results].sort((a, b) => VERDICT_SEVERITY[a.verdict] - VERDICT_SEVERITY[b.verdict] || (a.row ?? 0) - (b.row ?? 0));
    const flagged = sorted.filter(r => r.verdict !== 'genuine');
    const cleared = run.stats.genuine;
    const pill = (v: VerificationResult['verdict']) => `<span class="pill" style="color:${VERDICT_COLOR[v]};border-color:${VERDICT_COLOR[v]}">${esc(VERDICT_COPY[v].label)}</span>`;

    const row = (r: VerificationResult, withAction: boolean) => `
        <tr>
            <td class="num">${esc(r.row ?? '')}</td>
            <td class="mono">${esc(r.batchId)}</td>
            <td>${esc(r.productName ?? '—')}${r.claims?.quantity !== undefined ? `<div class="sub">${esc(r.claims.quantity)} units</div>` : ''}</td>
            <td>${pill(r.verdict)}</td>
            <td class="num">${r.trustScore}</td>
            <td>${esc(r.summary)}${withAction ? `<div class="sub"><b>Action:</b> ${esc(r.action)}</div>` : ''}</td>
        </tr>`;

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(run.runId)} — Medicine verification report</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --ink:#0f172a; --muted:#64748b; --rule:#e2e8f0; }
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: var(--ink); margin: 0; background: #f8fafc; }
  .page { max-width: 960px; margin: 24px auto; background: #fff; padding: 48px 56px; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
  header { display:flex; justify-content:space-between; gap:24px; border-bottom: 2px solid var(--ink); padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -.01em; }
  h2 { font-size: 14px; margin: 32px 0 10px; }
  .muted, .sub { color: var(--muted); }
  .sub { font-size: 11px; margin-top: 2px; }
  dl { display:grid; grid-template-columns:auto auto; gap:2px 16px; margin:0; font-size:12px; }
  dt { color: var(--muted); } dd { margin:0; text-align:right; }
  .verdict { font-size: 16px; margin: 0 0 16px; }
  .tally { display:grid; grid-template-columns: repeat(5, 1fr); border:1px solid var(--rule); border-radius:8px; overflow:hidden; }
  .tally div { padding: 12px 14px; border-right:1px solid var(--rule); }
  .tally div:last-child { border-right:0; }
  .tally b { display:block; font-size: 22px; font-variant-numeric: tabular-nums; }
  table { width:100%; border-collapse: collapse; }
  th { text-align:left; font-weight:600; font-size:11px; color:var(--muted); border-bottom:1px solid var(--ink); padding:6px 8px; }
  td { border-bottom:1px solid var(--rule); padding:7px 8px; vertical-align: top; }
  .num { text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; white-space:nowrap; }
  .pill { display:inline-block; border:1px solid; border-radius: 4px; padding: 0 6px; font-size: 11px; font-weight:600; white-space:nowrap; }
  .method li { margin-bottom: 2px; }
  .sign { display:grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px; }
  .sign div { border-top:1px solid var(--ink); padding-top:6px; font-size: 11px; color: var(--muted); }
  .toolbar { max-width:960px; margin: 16px auto 0; display:flex; justify-content:flex-end; }
  .toolbar button { font: inherit; padding: 8px 14px; border-radius: 6px; border: 1px solid #0f172a; background:#0f172a; color:#fff; cursor:pointer; }
  footer { margin-top: 32px; font-size: 11px; color: var(--muted); }
  @media print {
    body { background:#fff; } .page { box-shadow:none; margin:0; padding:0; max-width:none; } .toolbar { display:none; }
    tr { break-inside: avoid; } h2 { break-after: avoid; }
    @page { margin: 16mm 14mm; }
  }
</style></head>
<body>
<div class="toolbar"><button onclick="window.print()">Print or save as PDF</button></div>
<div class="page">
  <header>
    <div>
      <h1>Medicine verification report</h1>
      <div class="muted">${esc(run.facility || 'Facility not specified')}</div>
    </div>
    <dl>
      <dt>Report</dt><dd class="mono">${esc(run.runId)}</dd>
      <dt>Checked</dt><dd>${esc(fmt)}</dd>
      <dt>Source file</dt><dd>${esc(run.fileName)}</dd>
      <dt>Ledger</dt><dd>${run.source === 'database' ? 'MediChain database' : 'MediChain demo ledger'}</dd>
    </dl>
  </header>

  <p class="verdict"><b>${cleared} of ${run.stats.total}</b> line${run.stats.total === 1 ? '' : 's'} cleared for use${flagged.length ? `; <b>${flagged.length}</b> need${flagged.length === 1 ? 's' : ''} action before dispensing.` : '. No action required.'}</p>
  <div class="tally">
    <div><b style="color:${VERDICT_COLOR.genuine}">${run.stats.genuine}</b>Genuine</div>
    <div><b style="color:${VERDICT_COLOR.suspicious}">${run.stats.suspicious}</b>Suspicious</div>
    <div><b style="color:${VERDICT_COLOR.expired}">${run.stats.expired}</b>Expired</div>
    <div><b style="color:${VERDICT_COLOR.counterfeit}">${run.stats.counterfeit}</b>Counterfeit</div>
    <div><b style="color:${VERDICT_COLOR.not_found}">${run.stats.notFound}</b>Not on ledger</div>
  </div>
  ${run.stats.nearExpiry ? `<p class="muted">${run.stats.nearExpiry} genuine line${run.stats.nearExpiry === 1 ? '' : 's'} expire${run.stats.nearExpiry === 1 ? 's' : ''} within 90 days — dispense first.</p>` : ''}

  ${flagged.length ? `
  <h2>Action required (${flagged.length})</h2>
  <table><thead><tr><th class="num">Row</th><th>Batch</th><th>Medicine</th><th>Verdict</th><th class="num">Score</th><th>Finding</th></tr></thead>
  <tbody>${flagged.map(r => row(r, true)).join('')}</tbody></table>` : ''}

  <h2>All lines (${run.stats.total})</h2>
  <table><thead><tr><th class="num">Row</th><th>Batch</th><th>Medicine</th><th>Verdict</th><th class="num">Score</th><th>Finding</th></tr></thead>
  <tbody>${sorted.map(r => row(r, false)).join('')}</tbody></table>

  <h2>How each batch was checked</h2>
  <ol class="method muted">
    <li>Registered on the MediChain ledger.</li>
    <li>Made by a licensed, registered manufacturer and not flagged.</li>
    <li>Unbroken custody: every hand-off starts where the previous one ended, with no unregistered parties.</li>
    <li>Route noted: going straight from manufacturer to a pharmacy without a distributor is flagged for confirmation.</li>
    <li>In date (lines within 90 days of expiry are noted).</li>
    <li>Where provided, the medicine name and expiry printed on the pack match the ledger.</li>
  </ol>

  <div class="sign">
    <div>Checked by</div>
    <div>Pharmacist in charge</div>
    <div>Date</div>
  </div>
  <footer>Generated by MediChain. Trust scores start at 100 and are reduced for each failed or cautionary check.</footer>
</div>
</body></html>`;
}

export function openReport(run: BulkRun) {
    const html = reportHtml(run);
    const w = window.open('', '_blank');
    if (w) {
        w.document.open(); w.document.write(html); w.document.close();
    } else {
        // Pop-up blocked: hand over the file instead
        download(html, `${run.runId}-report.html`, 'text/html;charset=utf-8');
    }
}
