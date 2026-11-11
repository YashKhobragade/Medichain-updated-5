'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Upload, ClipboardPaste, FileSpreadsheet, Download, ArrowLeft, Loader2, Search,
    ChevronDown, FileText, RotateCcw, History, X, AlertCircle,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { btn, field } from '@/components/ui/Modal';
import { CheckList, CustodyPath, VerdictBadge, VERDICT_TONE } from '@/components/verification/VerdictBits';
import { FIELDS, SAMPLE_CSV, parseDelimited, parseFile, parsePasted, toRows, type FieldKey, type ParsedTable } from '@/components/bulk-verify/parse';
import { exportCsv, openReport, downloadText, type BulkRun } from '@/components/bulk-verify/report';
import { VERDICT_COPY, VERDICT_SEVERITY, type Verdict, type VerificationResult } from '@/lib/verification';

const HISTORY_KEY = 'medichain_bulk_history';
const FACILITY_KEY = 'medichain_bulk_facility';
const MAX_ROWS = 5000;
const PAGE = 100;
const STRIP_ORDER: Verdict[] = ['counterfeit', 'not_found', 'expired', 'suspicious', 'genuine'];

type Stage = 'input' | 'review' | 'results';

function loadHistory(): BulkRun[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(run: BulkRun) {
    try {
        // Keep full results for normal-sized runs; big ones keep the summary only
        const entry = run.results.length <= 1000 ? run : { ...run, results: [] };
        const next = [entry, ...loadHistory().filter(r => r.runId !== run.runId)].slice(0, 8);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
    } catch {
        return loadHistory();
    }
}

export default function BulkVerifyPage() {
    const [stage, setStage] = useState<Stage>('input');
    const [mode, setMode] = useState<'upload' | 'paste'>('upload');
    const [pasted, setPasted] = useState('');
    const [dragging, setDragging] = useState(false);
    const [table, setTable] = useState<ParsedTable | null>(null);
    const [fileName, setFileName] = useState('');
    const [mapping, setMapping] = useState<Partial<Record<FieldKey, number>>>({});
    const [facility, setFacility] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [run, setRun] = useState<BulkRun | null>(null);
    const [history, setHistory] = useState<BulkRun[]>([]);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setHistory(loadHistory());
        try { setFacility(localStorage.getItem(FACILITY_KEY) || ''); } catch { }
    }, []);

    const accept = useCallback((t: ParsedTable, name: string) => {
        if (t.rows.length === 0) {
            setError(`${name} has no rows to check. Add one batch ID per row and try again.`);
            return;
        }
        setTable(t); setFileName(name); setMapping(t.mapping); setError(null); setStage('review');
    }, []);

    const handleFile = async (file: File) => {
        setError(null);
        if (!/\.(csv|tsv|txt|xlsx|xls)$/i.test(file.name)) {
            setError(`${file.name} isn't a spreadsheet. Upload a .csv, .tsv, .txt or Excel file.`);
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('That file is over 10 MB. Split it into smaller files.');
            return;
        }
        try {
            accept(await parseFile(file), file.name);
        } catch {
            setError(`Couldn't read ${file.name}. Save it as CSV and try again.`);
        }
    };

    const rows = useMemo(() => (table ? toRows(table, mapping) : []), [table, mapping]);
    const blankIds = table ? table.rows.length - rows.length : 0;
    const dupes = useMemo(() => {
        const seen = new Map<string, number>();
        rows.forEach(r => seen.set(r.batchId.toUpperCase(), (seen.get(r.batchId.toUpperCase()) ?? 0) + 1));
        return Array.from(seen.values()).filter(n => n > 1).length;
    }, [rows]);

    const verify = async () => {
        if (!rows.length) return;
        setRunning(true); setError(null);
        try { localStorage.setItem(FACILITY_KEY, facility); } catch { }
        try {
            const res = await fetch('/api/verify/bulk', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Verification failed.');
            const result: BulkRun = { runId: data.runId, verifiedAt: data.verifiedAt, source: data.source, stats: data.stats, results: data.results, facility, fileName };
            setRun(result);
            setHistory(saveHistory(result));
            setStage('results');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setRunning(false);
        }
    };

    const reset = () => {
        setStage('input'); setTable(null); setRun(null); setPasted(''); setError(null); setFileName('');
    };

    return (
        <DashboardShell>
            <div data-native-responsive>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-50">Bulk verification</h1>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-xl">
                        Check a whole delivery or store room against the blockchain ledger before anything reaches a patient.
                    </p>
                </div>
                {stage !== 'input' && (
                    <button className={btn.secondary} onClick={reset}><RotateCcw className="w-4 h-4" aria-hidden />New check</button>
                )}
            </div>

            <Steps stage={stage} />

            {error && (
                <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200 flex gap-3" role="alert">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /><span>{error}</span>
                </div>
            )}

            {stage === 'input' && (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
                    <section aria-label="Add batches">
                        <div className="flex rounded-lg border border-gray-800 p-0.5 text-sm w-fit mb-4" role="tablist">
                            {([['upload', 'Upload a file', Upload], ['paste', 'Paste batch IDs', ClipboardPaste]] as const).map(([v, label, Icon]) => (
                                <button key={v} role="tab" aria-selected={mode === v} onClick={() => setMode(v)}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${mode === v ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:text-gray-200'}`}>
                                    <Icon className="w-4 h-4" aria-hidden />{label}
                                </button>
                            ))}
                        </div>

                        {mode === 'upload' ? (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                                className={`rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${dragging ? 'border-emerald-400 bg-emerald-500/5' : 'border-gray-800 hover:border-gray-700'}`}
                            >
                                <FileSpreadsheet className="w-10 h-10 mx-auto text-gray-600 mb-4" aria-hidden />
                                <p className="text-gray-200">Drop a spreadsheet here</p>
                                <p className="text-sm text-gray-500 mt-1 mb-5">CSV, TSV or Excel · up to {MAX_ROWS.toLocaleString('en-IN')} rows</p>
                                <button className={btn.primary} onClick={() => fileInput.current?.click()}>Choose file</button>
                                <input ref={fileInput} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" className="sr-only"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="paste" className="sr-only">Batch IDs</label>
                                <textarea
                                    id="paste" value={pasted} onChange={e => setPasted(e.target.value)} rows={10}
                                    placeholder={'BAT-MED-001\nBAT-MED-005\nBAT-MED-011\n\nOne per line, or paste rows straight from a spreadsheet.'}
                                    className={`${field} font-mono text-[13px] leading-relaxed resize-y`}
                                />
                                <div className="flex justify-end mt-3">
                                    <button className={btn.primary} disabled={!pasted.trim()} onClick={() => accept(parsePasted(pasted), 'Pasted list')}>Continue</button>
                                </div>
                            </div>
                        )}
                    </section>

                    <aside className="space-y-8">
                        <section aria-labelledby="format-h">
                            <h2 id="format-h" className="text-sm font-semibold text-gray-200 mb-3">What to include</h2>
                            <dl className="space-y-2.5 text-sm">
                                {FIELDS.map(f => (
                                    <div key={f.key}>
                                        <dt className="text-gray-200">{f.label}{f.required ? '' : <span className="text-gray-500"> · optional</span>}</dt>
                                        <dd className="text-xs text-gray-500">{f.hint}</dd>
                                    </div>
                                ))}
                            </dl>
                            <p className="text-xs text-gray-500 mt-3">Column names don't need to match exactly; you'll confirm them on the next step.</p>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <button className={btn.secondary + ' !text-xs !px-3 !py-1.5'} onClick={() => accept(parseDelimited(SAMPLE_CSV), 'sample-delivery.csv')}>Try a sample delivery</button>
                                <button className={btn.ghost} onClick={() => downloadText(SAMPLE_CSV, 'medichain-bulk-template.csv')}><Download className="w-3.5 h-3.5" aria-hidden />Template</button>
                            </div>
                        </section>

                        {history.length > 0 && (
                            <section aria-labelledby="history-h">
                                <h2 id="history-h" className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-500" aria-hidden />Recent checks</h2>
                                <ul className="space-y-1">
                                    {history.map(h => {
                                        const flagged = h.stats.total - h.stats.genuine;
                                        return (
                                            <li key={h.runId}>
                                                <button
                                                    disabled={h.results.length === 0}
                                                    onClick={() => { setRun(h); setStage('results'); }}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-900 disabled:hover:bg-transparent disabled:cursor-default group"
                                                    title={h.results.length === 0 ? 'Large run — only the summary was kept' : undefined}
                                                >
                                                    <span className="block text-sm text-gray-200 truncate">{h.fileName}</span>
                                                    <span className="block text-xs text-gray-500">
                                                        {new Date(h.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {h.stats.total} lines ·{' '}
                                                        <span className={flagged ? 'text-amber-300' : 'text-emerald-300'}>{flagged ? `${flagged} flagged` : 'all clear'}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <button className={`${btn.ghost} mt-1`} onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }}>Clear history</button>
                            </section>
                        )}
                    </aside>
                </div>
            )}

            {stage === 'review' && table && (
                <ReviewStep
                    table={table} fileName={fileName} mapping={mapping} setMapping={setMapping}
                    rowsCount={rows.length} blankIds={blankIds} dupes={dupes}
                    facility={facility} setFacility={setFacility}
                    running={running} onBack={() => setStage('input')} onVerify={verify}
                />
            )}

            {stage === 'results' && run && <Results run={run} />}
            </div>
        </DashboardShell>
    );
}

// ------------------------------------------------------------

function Steps({ stage }: { stage: Stage }) {
    const steps: [Stage, string][] = [['input', 'Add batches'], ['review', 'Confirm columns'], ['results', 'Review results']];
    const idx = steps.findIndex(s => s[0] === stage);
    return (
        <ol className="flex items-center gap-2 text-xs mb-8" aria-label="Progress">
            {steps.map(([key, label], i) => (
                <li key={key} className="flex items-center gap-2" aria-current={i === idx ? 'step' : undefined}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center tabular-nums ${i < idx ? 'bg-emerald-500 text-gray-950' : i === idx ? 'border border-emerald-400 text-emerald-300' : 'border border-gray-700 text-gray-600'}`}>{i + 1}</span>
                    <span className={i === idx ? 'text-gray-200' : 'text-gray-500'}>{label}</span>
                    {i < steps.length - 1 && <span className="w-8 h-px bg-gray-800 mx-1" aria-hidden />}
                </li>
            ))}
        </ol>
    );
}

function ReviewStep(props: {
    table: ParsedTable; fileName: string;
    mapping: Partial<Record<FieldKey, number>>; setMapping: (m: Partial<Record<FieldKey, number>>) => void;
    rowsCount: number; blankIds: number; dupes: number;
    facility: string; setFacility: (s: string) => void;
    running: boolean; onBack: () => void; onVerify: () => void;
}) {
    const { table, mapping, setMapping } = props;
    const mappedCols = new Set(Object.values(mapping));
    const tooMany = props.rowsCount > MAX_ROWS;

    return (
        <div className="space-y-8">
            <p className="text-sm text-gray-300">
                <span className="text-gray-100 font-medium">{props.fileName}</span> · {table.rows.length.toLocaleString('en-IN')} row{table.rows.length === 1 ? '' : 's'}
                {table.hasHeader ? ', header row detected' : ', no header row'}
            </p>

            <section aria-labelledby="map-h">
                <h2 id="map-h" className="text-base font-semibold text-gray-100 mb-1">Which column is which?</h2>
                <p className="text-sm text-gray-500 mb-4">Adding the medicine name and expiry lets MediChain catch relabelled packs, not just fake batch numbers.</p>
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {FIELDS.map(f => (
                        <label key={f.key} className="block">
                            <span className="text-sm text-gray-300">{f.label}{f.required && <span className="text-rose-300"> *</span>}</span>
                            <select
                                className={`${field} mt-1.5`}
                                value={mapping[f.key] ?? ''}
                                onChange={e => {
                                    const next = { ...mapping };
                                    if (e.target.value === '') delete next[f.key]; else next[f.key] = Number(e.target.value);
                                    setMapping(next);
                                }}
                            >
                                {!f.required && <option value="">Not in file</option>}
                                {table.columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
                            </select>
                        </label>
                    ))}
                </div>
            </section>

            <section aria-labelledby="preview-h">
                <h2 id="preview-h" className="text-sm font-semibold text-gray-200 mb-2">First rows</h2>
                <div className="rounded-xl border border-gray-800 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs border-b border-gray-800 bg-gray-900/60">
                                {table.columns.map((c, i) => {
                                    const as = FIELDS.find(f => mapping[f.key] === i);
                                    return (
                                        <th key={i} scope="col" className={`font-normal px-3 py-2 whitespace-nowrap ${as ? 'text-emerald-300' : 'text-gray-600'}`}>
                                            {c}{as && <span className="block text-[10px] text-gray-500">→ {as.label}</span>}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/70">
                            {table.rows.slice(0, 6).map((r, ri) => (
                                <tr key={ri}>
                                    {r.map((cell, ci) => (
                                        <td key={ci} className={`px-3 py-2 whitespace-nowrap ${mappedCols.has(ci) ? 'text-gray-200' : 'text-gray-600'} ${mapping.batchId === ci ? 'font-mono text-[13px]' : ''}`}>{cell || <span className="text-gray-700">—</span>}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <ul className="mt-3 space-y-1 text-xs text-gray-400">
                    {props.blankIds > 0 && <li>{props.blankIds} row{props.blankIds > 1 ? 's have' : ' has'} no batch ID and will be skipped.</li>}
                    {props.dupes > 0 && <li>{props.dupes} batch ID{props.dupes > 1 ? 's appear' : ' appears'} more than once. That's normal for split deliveries; they'll be marked so you can check.</li>}
                    {tooMany && <li className="text-rose-300">That's more than {MAX_ROWS.toLocaleString('en-IN')} lines. Split the file and check it in parts.</li>}
                </ul>
            </section>

            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-6 border-t border-gray-800">
                <label className="block sm:max-w-sm w-full">
                    <span className="text-sm text-gray-300">Facility for the report</span>
                    <input className={`${field} mt-1.5`} value={props.facility} onChange={e => props.setFacility(e.target.value)} placeholder="e.g. Apollo Hospital Pharmacy, Chennai" />
                </label>
                <div className="flex gap-2">
                    <button className={btn.secondary} onClick={props.onBack}><ArrowLeft className="w-4 h-4" aria-hidden />Back</button>
                    <button className={btn.primary} onClick={props.onVerify} disabled={props.running || props.rowsCount === 0 || tooMany}>
                        {props.running && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                        {props.running ? `Checking ${props.rowsCount.toLocaleString('en-IN')} lines…` : `Verify ${props.rowsCount.toLocaleString('en-IN')} line${props.rowsCount === 1 ? '' : 's'}`}
                    </button>
                </div>
            </section>
        </div>
    );
}

// ------------------------------------------------------------

function Results({ run }: { run: BulkRun }) {
    const [filter, setFilter] = useState<Verdict | 'all'>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<'urgent' | 'file'>('urgent');
    const [open, setOpen] = useState<Set<number>>(new Set());
    const [limit, setLimit] = useState(PAGE);

    useEffect(() => { setFilter('all'); setQuery(''); setOpen(new Set()); setLimit(PAGE); }, [run.runId]);

    const counts = useMemo(() => {
        const c = { counterfeit: 0, not_found: 0, expired: 0, suspicious: 0, genuine: 0 } as Record<Verdict, number>;
        run.results.forEach(r => { c[r.verdict]++; });
        return c;
    }, [run]);

    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        const indexed = run.results.map((r, i) => ({ r, i }));
        return indexed
            .filter(({ r }) => (filter === 'all' || r.verdict === filter)
                && (!q || r.batchId.toLowerCase().includes(q) || (r.productName ?? '').toLowerCase().includes(q) || (r.claims?.productName ?? '').toLowerCase().includes(q)))
            .sort((a, b) => sort === 'file'
                ? a.i - b.i
                : VERDICT_SEVERITY[a.r.verdict] - VERDICT_SEVERITY[b.r.verdict] || a.r.trustScore - b.r.trustScore || a.i - b.i);
    }, [run, filter, query, sort]);

    const total = run.results.length;
    const flagged = total - counts.genuine;
    const toggle = (i: number) => setOpen(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });

    return (
        <div className="space-y-6">
            {/* Headline + exports */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <p className="text-xl sm:text-2xl text-gray-100 tracking-tight">
                        <span className="tabular-nums font-semibold">{counts.genuine}</span> of <span className="tabular-nums">{total}</span> cleared for use.
                        {flagged > 0
                            ? <> <span className="text-rose-300"><span className="tabular-nums font-semibold">{flagged}</span> need{flagged === 1 ? 's' : ''} action.</span></>
                            : <span className="text-emerald-300"> Nothing to act on.</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5">
                        {run.fileName}{run.facility && <> · {run.facility}</>} · {new Date(run.verifiedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · <span className="font-mono">{run.runId}</span>
                        {run.source === 'demo' && <> · demo ledger</>}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className={btn.secondary} onClick={() => exportCsv(run)}><Download className="w-4 h-4" aria-hidden />Export CSV</button>
                    <button className={btn.primary} onClick={() => openReport(run)}><FileText className="w-4 h-4" aria-hidden />Compliance report</button>
                </div>
            </div>

            {/* Verdict strip: proportional, doubles as the filter */}
            <div role="group" aria-label="Filter by verdict">
                <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {STRIP_ORDER.filter(v => counts[v] > 0).map(v => (
                        <button key={v} aria-hidden tabIndex={-1} onClick={() => setFilter(f => f === v ? 'all' : v)}
                            className={`${VERDICT_TONE[v].bar} transition-opacity ${filter !== 'all' && filter !== v ? 'opacity-25' : ''}`}
                            style={{ flexGrow: counts[v], flexBasis: 0, minWidth: 10 }} />
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-1 gap-y-1 mt-3">
                    {STRIP_ORDER.map(v => (
                        <button key={v} disabled={counts[v] === 0} aria-pressed={filter === v}
                            onClick={() => setFilter(f => f === v ? 'all' : v)}
                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors disabled:opacity-35 disabled:cursor-default ${filter === v ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900'}`}>
                            <span className={`w-2 h-2 rounded-full ${VERDICT_TONE[v].bar}`} aria-hidden />
                            <span className="tabular-nums text-gray-100">{counts[v]}</span> {VERDICT_COPY[v].label}
                        </button>
                    ))}
                    {filter !== 'all' && (
                        <button className={btn.ghost} onClick={() => setFilter('all')}><X className="w-3.5 h-3.5" aria-hidden />Show all</button>
                    )}
                </div>
                {run.stats.nearExpiry > 0 && (
                    <p className="text-xs text-amber-300/90 mt-2">{run.stats.nearExpiry} genuine line{run.stats.nearExpiry > 1 ? 's expire' : ' expires'} within 90 days. Dispense first.</p>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                    <input value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="Find a batch or medicine" aria-label="Search results"
                        className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-500">
                    Order
                    <select value={sort} onChange={e => setSort(e.target.value as any)} className="bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-emerald-500/50">
                        <option value="urgent">Most urgent first</option>
                        <option value="file">As in file</option>
                    </select>
                </label>
            </div>

            {/* Results */}
            <div className="rounded-xl border border-gray-800 overflow-hidden">
                <div className="hidden md:grid grid-cols-[52px_170px_minmax(0,1fr)_130px_56px_minmax(0,1.6fr)_24px] gap-4 px-4 py-2.5 text-xs text-gray-500 border-b border-gray-800 bg-gray-900/60">
                    <span className="text-right">Row</span><span>Batch</span><span>Medicine</span><span>Verdict</span><span className="text-right">Score</span><span>Finding</span><span />
                </div>
                {list.length === 0 && <p className="p-6 text-center text-sm text-gray-400">No lines match. <button className="underline" onClick={() => { setFilter('all'); setQuery(''); }}>Show all</button></p>}
                <ul className="divide-y divide-gray-800">
                    {list.slice(0, limit).map(({ r, i }) => (
                        <ResultRow key={i} r={r} open={open.has(i)} onToggle={() => toggle(i)} />
                    ))}
                </ul>
            </div>
            {list.length > limit && (
                <div className="text-center">
                    <button className={btn.secondary} onClick={() => setLimit(l => l + PAGE * 5)}>Show more ({(list.length - limit).toLocaleString('en-IN')} left)</button>
                </div>
            )}
        </div>
    );
}

function ResultRow({ r, open, onToggle }: { r: VerificationResult; open: boolean; onToggle: () => void }) {
    const labelMismatch = r.checks.some(c => c.id === 'label' && c.outcome === 'fail');
    const scoreCls = r.trustScore >= 80 ? 'text-emerald-300' : r.trustScore >= 50 ? 'text-amber-300' : 'text-rose-300';
    return (
        <li>
            <button onClick={onToggle} aria-expanded={open}
                className="w-full text-left grid grid-cols-[1fr_auto] md:grid-cols-[52px_170px_minmax(0,1fr)_130px_56px_minmax(0,1.6fr)_24px] gap-x-4 gap-y-1.5 items-center px-4 py-3 hover:bg-gray-900/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-400">
                <span className="hidden md:block text-right text-xs text-gray-500 tabular-nums">{r.row ?? '—'}</span>
                <span className="font-mono text-[13px] text-gray-100 truncate">{r.batchId}</span>
                <span className="md:hidden justify-self-end"><VerdictBadge verdict={r.verdict} /></span>
                <span className="text-sm text-gray-300 truncate col-span-2 md:col-span-1">
                    {r.productName ?? <span className="text-gray-600">Unknown</span>}
                    {labelMismatch && r.claims?.productName && <span className="block text-xs text-amber-300 truncate">Pack says {r.claims.productName}</span>}
                </span>
                <span className="hidden md:block"><VerdictBadge verdict={r.verdict} /></span>
                <span className={`hidden md:block text-right text-sm tabular-nums ${scoreCls}`}>{r.trustScore}</span>
                <span className="text-xs text-gray-400 col-span-2 md:col-span-1 line-clamp-2">{r.summary}</span>
                <ChevronDown className={`hidden md:block w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {open && (
                <div className="px-4 pb-5 md:pl-[84px] grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
                    <div>
                        <p className="text-xs text-gray-500 mb-2">Checks</p>
                        <CheckList checks={r.checks} />
                    </div>
                    <div className="space-y-5">
                        <div className={`rounded-lg border px-3 py-2.5 ${VERDICT_TONE[r.verdict].border} ${VERDICT_TONE[r.verdict].bg}`}>
                            <p className="text-xs text-gray-400">What to do</p>
                            <p className={`text-sm ${VERDICT_TONE[r.verdict].text}`}>{r.action}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Custody on the ledger</p>
                            <CustodyPath path={r.path} />
                        </div>
                        {(r.expiryDate || r.claims?.quantity !== undefined) && (
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {r.manufacturer && <><dt className="text-gray-500">Manufacturer</dt><dd className="text-gray-300">{r.manufacturer}</dd></>}
                                {r.expiryDate && <><dt className="text-gray-500">Expiry on ledger</dt><dd className="text-gray-300">{new Date(r.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></>}
                                {r.claims?.expiry && <><dt className="text-gray-500">Expiry on pack</dt><dd className="text-gray-300">{r.claims.expiry}</dd></>}
                                {r.claims?.quantity !== undefined && <><dt className="text-gray-500">Quantity</dt><dd className="text-gray-300 tabular-nums">{r.claims.quantity.toLocaleString('en-IN')}</dd></>}
                            </dl>
                        )}
                        {r.verdict !== 'not_found' && (
                            <a href={`/verify/${encodeURIComponent(r.batchId)}`} className="inline-block text-xs text-emerald-300 hover:underline">Open full batch history</a>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}
