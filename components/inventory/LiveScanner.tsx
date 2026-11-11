'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Pause, Play, Square, RotateCcw, SwitchCamera, Download, Loader2, AlertCircle } from 'lucide-react';
import { btn } from '@/components/ui/Modal';
import { VerdictBadge } from '@/components/verification/VerdictBits';
import type { VerificationResult } from '@/lib/verification';
import type { ScanGroup, ScannedCode } from '@/lib/scanTypes';
import { saveCount } from '@/lib/stockStore';
import { CodeOverlay, GroupCard, TONE, dot, exportCounts, formatUnits, groupIssues, needsAttention, sortGroups } from './scanShared';

type Phase = 'idle' | 'starting' | 'running' | 'paused' | 'finished';

interface Frame {
    width: number;
    height: number;
    codes: ScannedCode[];
    unrecognised: { text: string; points: number[][] }[];
    groups: Map<string, ScanGroup>;
    at: number;
}

const MAX_FRAME_SIDE = 1920;   // matches the ML service's live mode
const MIN_GAP_MS = 120;        // breathing room between scans
const STALE_MS = 1000;         // outlines fade out as they age (the camera keeps moving)

function cameraError(e: any): string {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'The camera only works on a secure connection. On this computer open the app at http://localhost:3000. On a phone, use an HTTPS link (see the README: "Scanning with a phone").';
    }
    switch (e?.name) {
        case 'NotAllowedError': return 'Camera permission was blocked. Allow camera access from the icon in the address bar, then try again.';
        case 'NotFoundError': return 'No camera was found on this device.';
        case 'NotReadableError': return 'The camera is being used by another app. Close it and try again.';
        case 'OverconstrainedError': return 'This camera does not support the requested settings. Try switching camera.';
        default: return e?.message || 'Could not start the camera.';
    }
}

export function LiveScanner({ onViewStock }: { onViewStock?: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const runningRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Everything seen during this scan (refs so the scan loop never reads stale state).
    // One batch = one box, so we remember each batch once, plus the most times its QR
    // appeared together in a single frame (more than once = copied labels).
    const seenRef = useRef(new Map<string, number>());
    const verificationRef = useRef(new Map<string, VerificationResult>());

    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [frame, setFrame] = useState<Frame | null>(null);
    const [version, setVersion] = useState(0);
    const [rate, setRate] = useState(0);
    const [latest, setLatest] = useState<string[]>([]);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [cameraIndex, setCameraIndex] = useState(0);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [finishedAt, setFinishedAt] = useState<number | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [now, setNow] = useState(Date.now());
    const [saved, setSaved] = useState<string | null>(null);

    const stopCamera = useCallback(() => {
        runningRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
        abortRef.current?.abort();
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => stopCamera, [stopCamera]);

    // Tick a clock so stale outlines fade and the timer moves
    useEffect(() => {
        if (phase !== 'running') return;
        const t = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(t);
    }, [phase]);

    const resetCounts = () => {
        seenRef.current.clear(); verificationRef.current.clear();
        setFrame(null); setLatest([]); setVersion(v => v + 1); setSelected(null);
    };

    /** Fold one frame's results into the running count. */
    const absorb = (codes: ScannedCode[], groups: ScanGroup[]) => {
        const added: string[] = [];
        for (const g of groups) {
            verificationRef.current.set(g.batchId, g.verification);
            const before = seenRef.current.get(g.batchId);
            if (before === undefined) added.push(g.batchId);
            seenRef.current.set(g.batchId, Math.max(before ?? 0, g.count));
        }
        if (added.length) {
            setLatest(prev => [...added, ...prev].slice(0, 6));
            try { navigator.vibrate?.(25); } catch { /* not supported */ }
        }
        setVersion(v => v + 1);
    };

    const scanOnce = useCallback(async () => {
        if (!runningRef.current) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth) {
            timerRef.current = setTimeout(scanOnce, 200);
            return;
        }
        const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(video.videoWidth, video.videoHeight));
        const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
        const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(video, 0, 0, w, h);
        const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
        if (!blob || !runningRef.current) return;

        const started = performance.now();
        abortRef.current = new AbortController();
        try {
            const body = new FormData();
            body.append('image', blob, 'frame.jpg');
            const res = await fetch('/api/scan?mode=live', { method: 'POST', body, signal: abortRef.current.signal });
            const data = await res.json();
            if (res.status === 503) { stopCamera(); setPhase('idle'); setError(data.error); return; }
            if (!res.ok) throw new Error(data.error || 'Scan failed');
            if (!runningRef.current) return;
            setNotice(null);
            absorb(data.codes, data.groups);
            setFrame({
                width: data.width, height: data.height, codes: data.codes, unrecognised: data.unrecognised,
                groups: new Map((data.groups as ScanGroup[]).map(g => [g.batchId, g])), at: Date.now(),
            });
            const took = performance.now() - started;
            setRate(r => (r ? r * 0.7 + (1000 / (took + MIN_GAP_MS)) * 0.3 : 1000 / (took + MIN_GAP_MS)));
            timerRef.current = setTimeout(scanOnce, MIN_GAP_MS);
        } catch (e: any) {
            if (e?.name === 'AbortError' || !runningRef.current) return;
            setNotice('Lost contact with the scanner. Retrying…');
            timerRef.current = setTimeout(scanOnce, 1500);
        }
    }, [stopCamera]);

    const startCamera = useCallback(async (index = cameraIndex) => {
        setError(null); setPhase('starting');
        try {
            if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error(), { name: window.isSecureContext ? 'NotFoundError' : 'Insecure' });
            stopCamera();
            const deviceId = cameras[index]?.deviceId;
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
                    width: { ideal: 1920 }, height: { ideal: 1080 },
                },
            });
            streamRef.current = stream;
            const video = videoRef.current!;
            video.srcObject = stream;
            await video.play();
            // Labels are only known after permission is granted
            const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
            setCameras(devices);
            runningRef.current = true;
            setPhase('running');
            setStartedAt(s => s ?? Date.now());
            scanOnce();
        } catch (e: any) {
            stopCamera();
            setPhase('idle');
            setError(cameraError(e));
        }
    }, [cameraIndex, cameras, scanOnce, stopCamera]);

    const pause = () => { runningRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); abortRef.current?.abort(); setPhase('paused'); setFrame(null); };
    const resume = () => { runningRef.current = true; setPhase('running'); scanOnce(); };
    const finish = () => {
        stopCamera(); setFrame(null); setFinishedAt(Date.now()); setPhase('finished');
        // every finished live scan becomes a stock count
        try { setSaved(groups.length ? (saveCount(groups, 'live'), 'Saved as today\'s stock count.') : null); }
        catch (e: any) { setSaved(e.message); }
    };
    const again = () => { setSaved(null); resetCounts(); setStartedAt(null); setFinishedAt(null); startCamera(); };
    const switchCamera = () => { const next = (cameraIndex + 1) % Math.max(1, cameras.length); setCameraIndex(next); startCamera(next); };

    // Running totals in the same shape as a photo scan, so the same cards and export work
    const groups: ScanGroup[] = useMemo(() => {
        const out: ScanGroup[] = [];
        seenRef.current.forEach((count, batchId) => {
            const verification = verificationRef.current.get(batchId);
            if (verification) out.push({ batchId, count, verification });
        });
        return sortGroups(out);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version]);

    const totalBoxes = groups.reduce((t, g) => t + g.count, 0);
    const totalUnits = groups.reduce((t, g) => t + (g.verification.quantity ?? 0), 0);
    const attention = groups.filter(needsAttention).length;
    const elapsed = startedAt ? Math.round(((finishedAt ?? now) - startedAt) / 1000) : 0;
    const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
    const fresh = frame && now - frame.at < STALE_MS;
    const live = phase === 'running' || phase === 'paused' || phase === 'starting';

    // ---------- finished: same result cards as a photo scan ----------
    if (phase === 'finished') {
        return (
            <div className="max-w-3xl">
                <h2 className="text-xl text-gray-100 tracking-tight">
                    Found <span className="font-semibold tabular-nums">{totalBoxes}</span> box{totalBoxes === 1 ? '' : 'es'} holding <span className="tabular-nums">{formatUnits(totalUnits)}</span> units, in {clock}.
                </h2>
                <p className={`text-sm mt-1 ${attention ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {totalBoxes === 0 ? 'No MediChain labels were read.' : attention ? `${attention} batch${attention > 1 ? 'es need' : ' needs'} attention.` : 'Every box checks out.'}
                </p>
                <ul className="mt-5 space-y-3">
                    {groups.map(g => (
                        <GroupCard key={g.batchId} g={g} open={selected === g.batchId}
                            onToggle={() => setSelected(s => s === g.batchId ? null : g.batchId)} />
                    ))}
                </ul>
                {saved && <p className="mt-4 text-sm text-emerald-300">{saved}{onViewStock && <> <button className="underline" onClick={onViewStock}>See stock levels</button></>}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                    <button className={btn.primary} onClick={again}><RotateCcw className="w-4 h-4" aria-hidden />Scan again</button>
                    {groups.length > 0 && <button className={btn.secondary} onClick={() => exportCounts(groups, 'live-count.csv')}><Download className="w-4 h-4" aria-hidden />Export counts (CSV)</button>}
                </div>
            </div>
        );
    }

    // ---------- idle / live ----------
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
            <div className="min-w-0">
                <div className={`relative rounded-xl overflow-hidden border bg-gray-950 ${live ? 'border-gray-700' : 'border-dashed border-gray-800'}`}>
                    <video ref={videoRef} playsInline muted className={`w-full h-auto block ${live ? '' : 'hidden'}`} />
                    {live && fresh && frame && (
                        <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: Math.max(0.25, 1 - (now - frame.at) / STALE_MS) }}>
                        <CodeOverlay width={frame.width} height={frame.height} codes={frame.codes} unrecognised={frame.unrecognised} groups={frame.groups} focus={selected} />
                        </div>
                    )}

                    {!live && (
                        <div className="px-6 py-16 text-center">
                            <Camera className="w-10 h-10 mx-auto text-gray-600 mb-4" aria-hidden />
                            <p className="text-gray-200">Point the camera at your boxes</p>
                            <p className="text-sm text-gray-500 mt-1 mb-6 max-w-md mx-auto">Move slowly along the shelf. Each box is counted once, however many times the camera sees it. If two boxes show the same QR, one is a copy.</p>
                            <button className={btn.primary} onClick={() => startCamera()}><Camera className="w-4 h-4" aria-hidden />Start camera</button>
                        </div>
                    )}

                    {phase === 'starting' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70">
                            <span className="inline-flex items-center gap-2 text-sm text-gray-200"><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Starting camera…</span>
                        </div>
                    )}

                    {(phase === 'running' || phase === 'paused') && (
                        <>
                            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-950/75 text-xs text-gray-200">
                                {phase === 'running'
                                    ? <><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" aria-hidden />Live · {rate ? `${rate.toFixed(1)} scans/s` : 'starting'} · {clock}</>
                                    : <><Pause className="w-3 h-3" aria-hidden />Paused · {clock}</>}
                            </div>
                            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gray-950/75 text-sm text-gray-50 tabular-nums">
                                <span className="font-semibold">{totalBoxes}</span> box{totalBoxes === 1 ? '' : 'es'}
                            </div>
                            {notice && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-amber-500/90 text-gray-950 text-xs">{notice}</div>}
                        </>
                    )}
                </div>

                {(phase === 'running' || phase === 'paused') && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {phase === 'running'
                            ? <button className={btn.secondary} onClick={pause}><Pause className="w-4 h-4" aria-hidden />Pause</button>
                            : <button className={btn.secondary} onClick={resume}><Play className="w-4 h-4" aria-hidden />Resume</button>}
                        <button className={btn.primary} onClick={finish}><Square className="w-4 h-4" aria-hidden />Finish</button>
                        <button className={btn.ghost} onClick={resetCounts}><RotateCcw className="w-3.5 h-3.5" aria-hidden />Reset count</button>
                        {cameras.length > 1 && <button className={btn.ghost} onClick={switchCamera}><SwitchCamera className="w-3.5 h-3.5" aria-hidden />Switch camera</button>}
                        <span className="text-xs text-gray-500 sm:ml-auto">Hold 0.5–1 m from the labels and move slowly. Avoid glare.</span>
                    </div>
                )}

                {error && (
                    <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200 flex gap-3" role="alert">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden /><span className="break-words">{error}</span>
                    </div>
                )}
            </div>

            {/* Running tally */}
            <aside className="min-w-0" aria-live="polite">
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-semibold tabular-nums text-gray-50">{totalBoxes}</span>
                    <span className="text-sm text-gray-400">box{totalBoxes === 1 ? '' : 'es'} · {formatUnits(totalUnits)} units inside</span>
                </div>
                {attention > 0 && <p className="text-sm text-rose-300 mt-1">{attention} batch{attention > 1 ? 'es need' : ' needs'} attention</p>}

                {groups.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-4">{live ? 'Boxes appear here as soon as their labels are read.' : 'Start the camera to count boxes live.'}</p>
                ) : (
                    <ul className="mt-4 rounded-xl border border-gray-800 divide-y divide-gray-800 overflow-hidden">
                        {groups.map(g => {
                            const issues = groupIssues(g).filter(i => i.tone === 'red');
                            return (
                                <li key={g.batchId}>
                                    <button onClick={() => setSelected(s => s === g.batchId ? null : g.batchId)}
                                        className={`w-full text-left px-3.5 py-3 flex gap-3 items-start transition-colors ${selected === g.batchId ? 'bg-gray-800/60' : 'hover:bg-gray-900'}`}>
                                        <span className="w-12 text-right shrink-0 leading-tight">
                                            <span className="block text-base font-semibold tabular-nums text-gray-50">{formatUnits(g.verification.quantity)}</span>
                                            <span className="block text-[10px] text-gray-500">units</span>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-start justify-between gap-2">
                                                <span className="text-sm text-gray-100 truncate">{g.verification.productName ?? 'Unknown medicine'}</span>
                                                <VerdictBadge verdict={g.verification.verdict} />
                                            </span>
                                            <span className="block font-mono text-[11px] text-gray-500">{g.batchId}</span>
                                            {issues.slice(0, 2).map((i, k) => <span key={k} className="flex gap-1.5 text-[11px] text-rose-200 mt-1">{dot(i.tone)}<span>{i.text}</span></span>)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {latest.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-1.5">Just counted</p>
                        <div className="flex flex-wrap gap-1.5">
                            {latest.map(b => {
                                const g = groups.find(x => x.batchId === b);
                                const bad = !!g && needsAttention(g);
                                return <span key={b} className="px-1.5 py-0.5 rounded font-mono text-[11px]" style={{ background: bad ? 'rgb(244 63 94 / .2)' : 'rgb(52 211 153 / .12)', color: bad ? '#fecdd3' : TONE.green }}>{b}</span>;
                            })}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
