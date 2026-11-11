'use client';

// Shared by the photo scan and the live camera scan.
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { CheckList, CustodyPath, VerdictBadge } from '@/components/verification/VerdictBits';
import { downloadText } from '@/components/bulk-verify/report';
import { isCopied, type ScanGroup, type ScannedCode } from '@/lib/scanTypes';

export interface ScanResult {
    width: number;
    height: number;
    ms: number;
    codes: ScannedCode[];
    unrecognised: { text: string; points: number[][] }[];
    groups: ScanGroup[];
    totals: { boxes: number; batches: number; needAttention: number; units: number };
}

export type Tone = 'green' | 'amber' | 'red' | 'grey';
export const TONE: Record<Tone, string> = { green: '#34d399', amber: '#fbbf24', red: '#f43f5e', grey: '#94a3b8' };

export const formatUnits = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-IN'));

export function needsAttention(g: ScanGroup) {
    return g.verification.verdict !== 'genuine' || isCopied(g);
}

export function codeTone(c: ScannedCode, g?: ScanGroup): Tone {
    if (c.status === 'copy') return 'red';
    const v = g?.verification.verdict;
    if (v === 'counterfeit' || v === 'not_found' || v === 'expired') return 'red';
    if (v === 'suspicious') return 'amber';
    if (g?.verification.checks.some(k => k.outcome === 'warn')) return 'amber';
    return 'green';
}

export function codeTag(c: ScannedCode, g?: ScanGroup): string | null {
    if (c.status === 'copy') return 'Copy?';
    const v = g?.verification.verdict;
    if (v === 'counterfeit') return 'Counterfeit';
    if (v === 'not_found') return 'Unknown batch';
    if (v === 'expired') return 'Expired';
    return null;
}

export function groupIssues(g: ScanGroup): { tone: Tone; text: string }[] {
    const out: { tone: Tone; text: string }[] = [];
    const v = g.verification;
    if (isCopied(g)) {
        const extra = g.count - 1;
        out.push({ tone: 'red', text: `This QR appears ${g.count} times. Each batch has only one real box, so ${extra === 1 ? 'one is a copy' : `${extra} are copies`}.` });
    }
    if (v.verdict !== 'genuine') out.push({ tone: v.verdict === 'suspicious' ? 'amber' : 'red', text: v.summary });
    const warn = v.checks.find(c => c.id === 'expiry' && c.outcome === 'warn');
    if (v.verdict === 'genuine' && warn) out.push({ tone: 'amber', text: warn.detail });
    return out;
}

export function sortGroups(groups: ScanGroup[]) {
    const sev: Record<string, number> = { counterfeit: 0, not_found: 1, expired: 2, suspicious: 3, genuine: 4 };
    return [...groups].sort((a, b) =>
        Number(needsAttention(b)) - Number(needsAttention(a))
        || sev[a.verification.verdict] - sev[b.verification.verdict]
        || (a.verification.productName ?? '').localeCompare(b.verification.productName ?? ''));
}

export const dot = (t: Tone) => <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: TONE[t] }} aria-hidden />;

export function ServiceStatus({ service }: { service: { ready: boolean; error?: string } | null }) {
    if (!service) return null;
    if (service.ready) {
        return (
            <p className="inline-flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden />Scanner ready · ML model loaded
            </p>
        );
    }
    return (
        <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
            <p className="font-medium">The scanner service isn&apos;t running</p>
            <p className="text-amber-200/80 mt-1">Start it in a second terminal, then reload this page:</p>
            <pre className="mt-2 text-xs bg-gray-950/60 rounded-lg p-3 overflow-x-auto text-gray-200">cd ml-service{'\n'}pip install -r requirements.txt{'\n'}python main.py</pre>
        </div>
    );
}

/** One batch = one box: what's in it, whether it's genuine, and whether its QR was copied. */
export function GroupCard({ g, open, onToggle, onHover }: { g: ScanGroup; open: boolean; onToggle: () => void; onHover?: (h: boolean) => void }) {
    const v = g.verification;
    const issues = groupIssues(g);
    return (
        <li className={`rounded-xl border transition-colors ${open ? 'border-gray-600 bg-gray-900/60' : 'border-gray-800'}`}
            onMouseEnter={() => onHover?.(true)} onMouseLeave={() => onHover?.(false)}>
            <button onClick={onToggle} aria-expanded={open} className="w-full text-left p-4 flex gap-4 items-start rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                <div className="text-right shrink-0 w-14">
                    <span className="block text-xl font-semibold tabular-nums text-gray-50 leading-none">{formatUnits(v.quantity)}</span>
                    <span className="block text-[11px] text-gray-500 mt-1">units</span>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-100 truncate">{v.productName ?? 'Unknown medicine'}</p>
                        <VerdictBadge verdict={v.verdict} />
                    </div>
                    <p className="font-mono text-xs text-gray-500 mt-0.5">{g.batchId}{isCopied(g) && <span className="text-rose-300 font-sans"> · seen {g.count}×</span>}</p>
                    {issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {issues.map((i, k) => <li key={k} className="flex gap-2 text-xs text-gray-300">{dot(i.tone)}<span>{i.text}</span></li>)}
                        </ul>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 mt-1 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-5 border-t border-gray-800 pt-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <dt className="text-gray-500">Manufacturer</dt><dd className="text-gray-200">{v.manufacturer ?? '—'}</dd>
                        <dt className="text-gray-500">Expiry</dt><dd className="text-gray-200">{v.expiryDate ? new Date(v.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd>
                        <dt className="text-gray-500">In the box</dt><dd className="text-gray-200">{v.quantity ? `${formatUnits(v.quantity)} units` : '—'}</dd>
                        <dt className="text-gray-500">Trust score</dt><dd className="text-gray-200 tabular-nums">{v.trustScore}/100</dd>
                    </dl>
                    <div>
                        <p className="text-xs text-gray-500 mb-2">Checks</p>
                        <CheckList checks={v.checks} />
                    </div>
                    {v.path.length > 0 && (
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Chain of custody</p>
                            <CustodyPath path={v.path} />
                        </div>
                    )}
                    <a href={`/verify/${encodeURIComponent(g.batchId)}`} className="inline-block text-xs text-emerald-300 hover:underline">Open full batch history</a>
                </div>
            )}
        </li>
    );
}

/** Coloured outlines (and problem tags) drawn over a photo or video frame. */
export function CodeOverlay({ width, height, codes, unrecognised = [], groups, focus, onSelect, onHover }: {
    width: number; height: number; codes: ScannedCode[]; unrecognised?: { points: number[][] }[];
    groups: Map<string, ScanGroup>; focus?: string | null;
    onSelect?: (batchId: string) => void; onHover?: (batchId: string | null) => void;
}) {
    const fs = width / 75;
    return (
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
            {unrecognised.map((u, i) => (
                <polygon key={`u${i}`} points={u.points.map(p => p.join(',')).join(' ')} fill="none" stroke={TONE.grey} strokeWidth={width / 450} strokeDasharray={`${width / 150}`} />
            ))}
            {codes.map(c => {
                const g = groups.get(c.batchId);
                const tone = codeTone(c, g);
                const dim = focus != null && focus !== c.batchId;
                const lit = focus === c.batchId;
                const tag = codeTag(c, g);
                const top = c.points.reduce((a, p) => (p[1] < a[1] ? p : a), c.points[0]);
                return (
                    <g key={c.id} opacity={dim ? 0.18 : 1} className={onSelect ? 'cursor-pointer' : undefined}
                        onClick={() => onSelect?.(c.batchId)}
                        onMouseEnter={() => onHover?.(c.batchId)} onMouseLeave={() => onHover?.(null)}>
                        <polygon points={c.points.map(p => p.join(',')).join(' ')}
                            fill={TONE[tone]} fillOpacity={lit ? 0.35 : 0.12}
                            stroke={TONE[tone]} strokeWidth={width / (lit ? 260 : 380)} strokeLinejoin="round" />
                        {tag && (
                            <g transform={`translate(${top[0]},${top[1] - fs * 0.6})`}>
                                <rect x={-fs * 0.3} y={-fs * 1.1} width={tag.length * fs * 0.6 + fs * 0.6} height={fs * 1.45} rx={fs * 0.3} fill={TONE[tone]} />
                                <text x={0} y={0} fontSize={fs} fontWeight={700} fill="#0b0f19" fontFamily="system-ui, sans-serif">{tag}</text>
                            </g>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

/** CSV of what was found — opens directly in Bulk Verify. */
export function exportCounts(groups: ScanGroup[], name = 'inventory-scan.csv') {
    const rows = [['batch_id', 'product_name', 'expiry', 'quantity']];
    for (const g of groups) rows.push([g.batchId, g.verification.productName ?? '', g.verification.expiryDate?.slice(0, 10) ?? '', String(g.verification.quantity ?? '')]);
    downloadText(rows.map(r => r.map(c => /[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\n'), name);
}
