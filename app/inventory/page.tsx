'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, RotateCcw, Download, AlertCircle, Cpu, Video, Image as ImageIcon, Boxes, Save } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { btn } from '@/components/ui/Modal';
import { LiveScanner } from '@/components/inventory/LiveScanner';
import { StockTab } from '@/components/inventory/StockTab';
import { StockBadge } from '@/components/inventory/StockBadge';
import { saveCount } from '@/lib/stockStore';
import { shrinkImage } from '@/lib/shrinkImage';
import { CodeOverlay, GroupCard, ServiceStatus, TONE, exportCounts, formatUnits, type ScanResult } from '@/components/inventory/scanShared';

const SAMPLES = [
    { src: '/samples/pharmacy-shelf.jpg', label: 'Pharmacy shelf', note: '24 boxes, a few problems' },
    { src: '/samples/delivery-table.jpg', label: 'New delivery', note: '12 boxes, all clean' },
];

export default function InventoryScanPage() {
    const [tab, setTab] = useState<'live' | 'photo' | 'stock'>('live');
    const [service, setService] = useState<{ ready: boolean; error?: string } | null>(null);

    useEffect(() => {
        fetch('/api/scan', { cache: 'no-store' }).then(r => r.json()).then(setService).catch(() => setService({ ready: false }));
    }, []);

    return (
        <DashboardShell>
            <div data-native-responsive>
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-50">Inventory scan</h1>
                    <p className="text-sm text-gray-400 mt-1.5 max-w-2xl">
                        Point a camera at your shelf or delivery. MediChain reads the QR on every box, checks each batch on the blockchain and shows what's inside.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex rounded-lg border border-gray-800 p-0.5 text-sm" role="tablist" aria-label="Scan mode">
                        {([['live', 'Live camera', Video], ['photo', 'Upload photo', ImageIcon], ['stock', 'Stock', Boxes]] as const).map(([v, label, Icon]) => (
                            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${tab === v ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:text-gray-200'}`}>
                                <Icon className="w-4 h-4" aria-hidden />{label}{v === 'stock' && <StockBadge />}
                            </button>
                        ))}
                    </div>
                    <ServiceStatus service={service} />
                </div>

                {/* Keep both mounted so switching tabs doesn't lose a live count */}
                <div hidden={tab !== 'live'}><LiveScanner onViewStock={() => setTab('stock')} /></div>
                <div hidden={tab !== 'photo'}><PhotoScan onService={setService} onViewStock={() => setTab('stock')} /></div>
                {tab === 'stock' && <StockTab onScan={() => setTab('live')} />}
            </div>
        </DashboardShell>
    );
}

function PhotoScan({ onService, onViewStock }: { onService: (s: { ready: boolean; error?: string }) => void; onViewStock: () => void }) {
    const [saved, setSaved] = useState(false);
    const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [hovered, setHovered] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    useEffect(() => () => { if (photo?.url.startsWith('blob:')) URL.revokeObjectURL(photo.url); }, [photo]);

    const scan = async (file: Blob, name: string) => {
        if (!file.type.startsWith('image/')) { setError('That file is not a photo. Use a JPG or PNG.'); return; }
        setError(null); setResult(null); setSelected(null); setSaved(false);
        setPhoto({ url: URL.createObjectURL(file), name });
        setScanning(true);
        try {
            // Phone photos can be 5–10 MB; shrink before sending (faster, and fits hosting upload limits)
            const upload = await shrinkImage(file);
            const body = new FormData();
            body.append('image', upload, name);
            const res = await fetch('/api/scan', { method: 'POST', body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Scan failed.');
            setResult(data);
            onService({ ready: true });
        } catch (e: any) {
            setError(e.message);
            if (String(e.message).includes('not running')) onService({ ready: false, error: e.message });
        } finally {
            setScanning(false);
        }
    };

    const loadSample = async (src: string, label: string) => scan(await fetch(src).then(r => r.blob()), `${label}.jpg`);
    const reset = () => { setPhoto(null); setResult(null); setError(null); setSelected(null); };
    const groupsById = useMemo(() => new Map(result?.groups.map(g => [g.batchId, g]) ?? []), [result]);
    const focus = hovered ?? selected;

    return (
        <>
            {error && (
                <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200 flex gap-3" role="alert">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /><span className="break-words">{error}</span>
                </div>
            )}

            {!photo && (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
                    <div
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) scan(f, f.name); }}
                        className={`rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${dragging ? 'border-emerald-400 bg-emerald-500/5' : 'border-gray-800'}`}
                    >
                        <ImagePlus className="w-10 h-10 mx-auto text-gray-600 mb-4" aria-hidden />
                        <p className="text-gray-200">Drop a photo of your boxes here</p>
                        <p className="text-sm text-gray-500 mt-1 mb-6">Labels facing the camera, one shelf at a time</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button className={btn.primary} onClick={() => fileRef.current?.click()}><ImagePlus className="w-4 h-4" aria-hidden />Choose photo</button>
                            <button className={btn.secondary} onClick={() => cameraRef.current?.click()}><Camera className="w-4 h-4" aria-hidden />Take one photo</button>
                        </div>
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) scan(f, f.name); e.target.value = ''; }} />
                        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) scan(f, f.name); e.target.value = ''; }} />
                    </div>

                    <aside>
                        <h2 className="text-sm font-semibold text-gray-200 mb-3">Try a sample photo</h2>
                        <ul className="space-y-3">
                            {SAMPLES.map(s => (
                                <li key={s.src}>
                                    <button onClick={() => loadSample(s.src, s.label)} className="w-full flex gap-3 items-center text-left p-2 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={s.src} alt="" className="w-24 h-16 object-cover rounded-lg" />
                                        <span>
                                            <span className="block text-sm text-gray-100">{s.label}</span>
                                            <span className="block text-xs text-gray-500">{s.note}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <h2 className="text-sm font-semibold text-gray-200 mt-8 mb-2">How it works</h2>
                        <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
                            <li>A machine-learning model finds every QR label in the picture.</li>
                            <li>Each batch is one box with one QR code.</li>
                            <li>Each box is checked on the blockchain and its contents are shown.</li>
                            <li>The same QR on two boxes means one of them is a copy.</li>
                        </ol>
                    </aside>
                </div>
            )}

            {photo && (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-8 items-start">
                    <figure className="min-w-0">
                        <div className="relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.url} alt="Scanned photo" className={`w-full h-auto block transition-opacity ${scanning ? 'opacity-40' : ''}`} />
                            {scanning && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-950/80 text-sm text-gray-200"><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Finding box labels…</span>
                                </div>
                            )}
                            {result && (
                                <CodeOverlay width={result.width} height={result.height} codes={result.codes} unrecognised={result.unrecognised}
                                    groups={groupsById} focus={focus}
                                    onSelect={b => setSelected(s => s === b ? null : b)} onHover={setHovered} />
                            )}
                        </div>
                        {result && (
                            <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TONE.green }} />Genuine</span>
                                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TONE.amber }} />Check</span>
                                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TONE.red }} />Problem</span>
                                <span className="sm:ml-auto inline-flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" aria-hidden />ML model read {result.codes.length + result.unrecognised.length} labels in {(result.ms / 1000).toFixed(1)} s</span>
                            </figcaption>
                        )}
                        {result && <p className="mt-2 text-xs text-gray-500">Missing a box? Its label has to face the camera. Scan one shelf at a time and keep labels sharp.</p>}
                    </figure>

                    <section aria-labelledby="counts-h" className="min-w-0">
                        <div className="flex justify-end mb-4">
                            <button className={btn.secondary} onClick={reset}><RotateCcw className="w-4 h-4" aria-hidden />Scan another photo</button>
                        </div>
                        {scanning && <p className="text-sm text-gray-400">Reading labels and checking batches…</p>}
                        {result && result.codes.length === 0 && (
                            <div className="rounded-xl border border-gray-800 p-5 text-sm text-gray-300">
                                <p className="font-medium text-gray-100 mb-1">No MediChain labels found</p>
                                <p className="text-gray-400">Move closer so each label fills more of the photo, make sure it&apos;s in focus, and avoid glare.</p>
                                {result.unrecognised.length > 0 && <p className="text-gray-500 mt-2">{result.unrecognised.length} other QR code{result.unrecognised.length > 1 ? 's were' : ' was'} found but {result.unrecognised.length > 1 ? 'aren\u2019t' : 'isn\u2019t'} a MediChain box label.</p>}
                            </div>
                        )}
                        {result && result.codes.length > 0 && (
                            <>
                                <h2 id="counts-h" className="text-xl text-gray-100 tracking-tight">
                                    <span className="font-semibold tabular-nums">{result.totals.boxes}</span> box{result.totals.boxes === 1 ? '' : 'es'} found, holding <span className="tabular-nums">{formatUnits(result.totals.units)}</span> units.
                                </h2>
                                <p className={`text-sm mt-1 ${result.totals.needAttention ? 'text-rose-300' : 'text-emerald-300'}`}>
                                    {result.totals.needAttention ? `${result.totals.needAttention} batch${result.totals.needAttention > 1 ? 'es need' : ' needs'} attention.` : 'Every box checks out.'}
                                </p>
                                {result.unrecognised.length > 0 && <p className="text-xs text-gray-500 mt-1">{result.unrecognised.length} other QR code{result.unrecognised.length > 1 ? 's' : ''} ignored (not MediChain labels).</p>}
                                <ul className="mt-5 space-y-3">
                                    {result.groups.map(g => (
                                        <GroupCard key={g.batchId} g={g} open={selected === g.batchId}
                                            onToggle={() => setSelected(s => s === g.batchId ? null : g.batchId)}
                                            onHover={h => setHovered(h ? g.batchId : null)} />
                                    ))}
                                </ul>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    <button className={btn.primary} disabled={saved} onClick={() => { try { saveCount(result.groups, 'photo'); setSaved(true); } catch (e: any) { setError(e.message); } }}><Save className="w-4 h-4" aria-hidden />{saved ? 'Saved to stock' : 'Save as stock count'}</button>
                                    <button className={btn.secondary} onClick={() => exportCounts(result.groups)}><Download className="w-4 h-4" aria-hidden />Export CSV</button>
                                </div>
                                {saved && <p className="text-sm text-emerald-300 mt-2">Saved. <button className="underline" onClick={onViewStock}>See stock levels</button></p>}
                                <p className="text-xs text-gray-500 mt-2">The CSV opens in Bulk Verify as-is.</p>
                            </>
                        )}
                    </section>
                </div>
            )}
        </>
    );
}
