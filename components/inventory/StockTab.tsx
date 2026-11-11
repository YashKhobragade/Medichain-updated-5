'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2, ChevronDown, PackageOpen, PackageCheck } from 'lucide-react';
import { btn } from '@/components/ui/Modal';
import {
    read, subscribe, summarize, setMinBoxes, finishBox, deleteCount, exportBackup, importBackup,
    isUsable, unitsOf, notUsableReason, DEFAULT_MIN_BOXES,
    type StockData, type MedicineLine, type StockStatus,
} from '@/lib/stockStore';

const STATUS: Record<StockStatus, { label: string; cls: string }> = {
    out: { label: 'Out of stock', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
    low: { label: 'Low: reorder', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
    ok: { label: 'OK', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
};
const n = (v: number) => v.toLocaleString('en-IN');
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const plural = (k: number, word: string) => `${k} ${word}${k === 1 ? '' : 'es'}`;

export function StockTab({ onScan }: { onScan: () => void }) {
    const [data, setData] = useState<StockData | null>(null);
    const [countId, setCountId] = useState<string | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { const load = () => setData(read()); load(); return subscribe(load); }, []);
    if (!data) return null;

    const count = data.counts.find(c => c.id === countId) ?? data.counts[0] ?? null;
    const isLatest = !!count && count.id === data.counts[0]?.id;
    const lines = summarize(count, data.minBoxes);
    const out = lines.filter(l => l.status === 'out').length, low = lines.filter(l => l.status === 'low').length;
    const totalBoxes = lines.reduce((t, l) => t + l.usableBoxes.length, 0);
    const notUsable = count?.boxes.filter(b => !isUsable(b)) ?? [];

    const doImport = async (f: File) => {
        try { await importBackup(f); setMsg({ ok: true, text: 'Backup imported.' }); }
        catch (e: any) { setMsg({ ok: false, text: e.message }); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    {count ? (
                        <>
                            <p className="text-xl text-gray-100 tracking-tight">
                                <span className="font-semibold tabular-nums">{plural(totalBoxes, 'box')}</span> of {lines.filter(l => l.usableBoxes.length).length} medicines in stock.
                            </p>
                            <p className={`text-sm mt-1 ${out + low ? 'text-rose-300' : 'text-emerald-300'}`}>
                                {out + low ? [out && `${out} out of stock`, low && `${low} on the last box`].filter(Boolean).join(' · ') : 'Every medicine has at least its minimum boxes.'}
                            </p>
                        </>
                    ) : <p className="text-gray-300">No stock count yet.</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className={btn.ghost} onClick={exportBackup}><Download className="w-3.5 h-3.5" aria-hidden />Export backup</button>
                    <button className={btn.ghost} onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" aria-hidden />Import backup</button>
                    <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
                </div>
            </div>
            {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} role="status">{msg.text}</p>}

            {!count ? (
                <div className="rounded-xl border border-dashed border-gray-800 p-8 text-center">
                    <PackageOpen className="w-9 h-9 mx-auto text-gray-600 mb-3" aria-hidden />
                    <p className="text-gray-200">Scan your shelves to count stock</p>
                    <p className="text-sm text-gray-500 mt-1 mb-5">Every finished scan is saved here as a stock count.</p>
                    <button className={btn.primary} onClick={onScan}>Start a scan</button>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500">
                        <label className="inline-flex items-center gap-2">Count
                            <select value={count.id} onChange={e => setCountId(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-md px-2 py-1 text-gray-200">
                                {data.counts.map((c, i) => <option key={c.id} value={c.id}>{when(c.at)} · {c.source} · {c.boxes.length} boxes{i === 0 ? ' (latest)' : ''}</option>)}
                            </select>
                        </label>
                        <span>Each new scan replaces the count. Only medicines seen in the scan are listed.</span>
                        <button className={`${btn.ghost} sm:ml-auto`} onClick={() => { deleteCount(count.id); setCountId(null); }}><Trash2 className="w-3.5 h-3.5" aria-hidden />Delete this count</button>
                    </div>

                    <p className="text-xs text-gray-400">
                        <b className="text-gray-200 font-medium">Two-bin rule:</b> keep at least {DEFAULT_MIN_BOXES} boxes of each medicine. When only one is left, it&apos;s time to reorder. <b className="text-gray-200 font-medium">Reorder below</b> is not the stock: a medicine shows <i>Low</i> when its boxes are under that number. Change it per medicine if you like; stock only changes by scanning or <i>Box finished</i>.
                    </p>

                    <div className="rounded-xl border border-gray-800 overflow-hidden">
                        <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_70px_100px_110px_130px] gap-3 px-4 py-2.5 text-xs text-gray-500 border-b border-gray-800 bg-gray-900/60">
                            <span>Medicine</span><span className="text-right">Boxes</span><span className="text-right">Units</span><span>Reorder below</span><span>Status</span>
                        </div>
                        <ul className="divide-y divide-gray-800">
                            {lines.map(l => (
                                <Line key={`${count.id}-${l.name}-${l.minBoxes}`} l={l} countId={count.id} canFinish={isLatest}
                                    open={open === l.name} onToggle={() => setOpen(o => o === l.name ? null : l.name)} />
                            ))}
                        </ul>
                    </div>

                    {notUsable.length > 0 && (
                        <section>
                            <h3 className="text-sm font-semibold text-gray-200 mb-2">Not usable ({notUsable.length})</h3>
                            <ul className="rounded-xl border border-rose-500/20 divide-y divide-gray-800 text-sm">
                                {notUsable.map(b => (
                                    <li key={b.batchId} className="px-4 py-2.5 flex flex-wrap justify-between gap-2">
                                        <span className="text-gray-200">{b.productName ?? 'Unknown medicine'} <span className="font-mono text-xs text-gray-500">{b.batchId}</span></span>
                                        <span className="text-rose-300 text-xs">{b.seen > 1 ? `QR seen ${b.seen}× (copy)` : notUsableReason(b)}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-gray-500 mt-2">These boxes never count as stock. Remove them from the shelf.</p>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

function Line({ l, countId, canFinish, open, onToggle }: { l: MedicineLine; countId: string; canFinish: boolean; open: boolean; onToggle: () => void }) {
    const s = STATUS[l.status];
    const usable = l.usableBoxes.length;
    return (
        <li>
            <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_70px_100px_110px_130px] gap-3 items-center px-4 py-3">
                <button onClick={onToggle} aria-expanded={open} disabled={!usable} className="col-span-2 sm:col-span-1 flex items-center gap-2 text-left text-sm text-gray-100 disabled:cursor-default">
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''} ${usable ? '' : 'invisible'}`} aria-hidden />{l.name}
                </button>
                <span className="text-sm text-gray-100 sm:text-right tabular-nums font-semibold"><span className="sm:hidden text-gray-500 font-normal">Boxes </span>{usable}</span>
                <span className="text-sm text-gray-400 text-right tabular-nums">{n(l.units)}<span className="sm:hidden"> units</span></span>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="sm:sr-only">Reorder below</span>
                    <input type="number" min={1} defaultValue={l.minBoxes} aria-label={`Reorder ${l.name} below this many boxes`}
                        title="Shows Low when boxes are under this number. This is not the stock."
                        onBlur={e => {
                            // save only when the number was actually changed
                            const v = e.target.value === '' ? null : Number(e.target.value);
                            if (v === null ? l.minBoxes !== DEFAULT_MIN_BOXES : v !== l.minBoxes) setMinBoxes(l.name, v);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-16 px-2 py-1 rounded-md bg-gray-950 border border-gray-700 text-sm text-gray-100 tabular-nums" />
                </label>
                <span className={`justify-self-start px-2 py-0.5 rounded-md border text-xs ${s.cls}`}>{s.label}</span>
            </div>
            {open && (
                <ul className="px-4 pb-3 sm:pl-10 space-y-2">
                    {l.usableBoxes.map(b => (
                        <li key={b.batchId} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <span className="font-mono text-gray-300 w-40">{b.batchId}</span>
                            <span className="text-gray-400 tabular-nums">{n(unitsOf(b))} units</span>
                            {b.expiryDate && <span className="text-gray-500">exp {new Date(b.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
                            {canFinish && (
                                <button className={`${btn.ghost} sm:ml-auto`} onClick={() => finishBox(countId, b.batchId)}>
                                    <PackageCheck className="w-3.5 h-3.5" aria-hidden />Box finished
                                </button>
                            )}
                        </li>
                    ))}
                    {!canFinish && <li className="text-xs text-gray-500">Older count: switch to the latest count to mark boxes as finished.</li>}
                </ul>
            )}
        </li>
    );
}
