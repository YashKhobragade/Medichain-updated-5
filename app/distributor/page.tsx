'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Inbox, Send, History, ShieldCheck, ShieldAlert, Loader2, Search, PackageCheck, X } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { ChainStatusBar } from '@/components/ChainStatusBar';
import { VerdictBadge } from '@/components/verification/VerdictBits';
import { btn, field } from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { NotOnChainError, friendlyChainError, transferOnChain, type ChainStatus } from '@/lib/onchain';
import type { Verdict } from '@/lib/verification';

interface Ship {
    id: string; batchId: string; from: string; fromType: string; to: string; toType: string;
    location: string; at: string; received: boolean; by?: string; hash?: string;
    chainTx?: string; chainUrl?: string | null; productName: string; quantity?: number | null;
}
interface Held { batchId: string; productName: string; manufacturer: string; quantity: number | null; expiryDate: string | null; verdict: Verdict }
interface Overview {
    company: string; kind: string;
    incoming: Ship[]; holding: Held[]; history: Ship[];
    recipients: { name: string; kind: string; city?: string }[];
    chain: { ok: boolean; brokenAt: number | null; entries: number };
}
type Notice = { tone: 'ok' | 'warn' | 'error'; text: string; link?: string | null };

const ADMIN_KEY = 'medichain_admin_acting_as';
const end = (name: string) => (name.endsWith('.') ? name : `${name}.`);
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const KIND_ORDER = ['Distributor', 'Warehouse', 'Logistics', 'Pharmacy', 'Hospital'];

export default function TransfersPage() {
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [actingAs, setActingAs] = useState<string | null>(null);
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [sending, setSending] = useState<Held | null>(null);
    const [query, setQuery] = useState('');
    const [manualId, setManualId] = useState('');
    const [chain, setChain] = useState<ChainStatus | null>(null);

    useEffect(() => {
        if (!isAdmin) return;
        let saved: string | null = null;
        try { saved = localStorage.getItem(ADMIN_KEY); } catch { }
        setActingAs(saved || 'PharmaCure Labs');
    }, [isAdmin]);

    const load = useCallback(async () => {
        if (isAdmin && !actingAs) return;
        try {
            const res = await authFetch(`/api/shipments${isAdmin ? `?as=${encodeURIComponent(actingAs!)}` : ''}`, { cache: 'no-store' });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setData(d); setError(null);
        } catch (e: any) { setError(e.message || 'Could not load transfers.'); }
    }, [isAdmin, actingAs]);

    useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

    const post = async (body: object): Promise<any> => {
        const res = await authFetch('/api/shipments', { method: 'POST', body: JSON.stringify({ ...body, as: isAdmin ? actingAs : undefined }) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        setData(d);
        return d;
    };

    const receive = async (s: Ship) => {
        setBusy(s.id); setNotice(null);
        try {
            await post({ action: 'receive', batchId: s.batchId, shipmentId: s.id });
            setNotice({ tone: 'ok', text: `Received ${s.productName} (${s.batchId}) from ${end(s.from)} It's now in your stock and can be shipped on.` });
        } catch (e: any) { setNotice({ tone: 'error', text: e.message }); }
        finally { setBusy(null); }
    };

    const send = async (b: Held, to: string, location: string) => {
        setBusy(b.batchId); setNotice(null);
        try {
            const d = await post({ action: 'send', batchId: b.batchId, to, location });
            const seq = d.entry?.seq;
            let n: Notice = { tone: 'ok', text: `Shipped ${b.productName} (${b.batchId}) to ${end(to)} Recorded in the MediChain ledger, entry #${seq}.` };
            // Also write it to the public blockchain when MetaMask is ready
            if (chain?.ready) {
                setNotice({ tone: 'ok', text: `${n.text} Now confirm the blockchain transaction in MetaMask…` });
                try {
                    const r = await transferOnChain(b.batchId, to, location || to);
                    await authFetch('/api/chain-tx', { method: 'POST', body: JSON.stringify({ kind: 'shipment', ref: seq, txHash: r.txHash, network: r.network, chainId: r.chainId }) });
                    n = { tone: 'ok', text: `${n.text} Also written to ${chain.network}.`, link: r.url };
                    await load();
                } catch (e: any) {
                    n = { tone: 'warn', text: `${n.text} ${e instanceof NotOnChainError ? e.message : `Not written to the blockchain: ${friendlyChainError(e)}`}` };
                }
            }
            setNotice(n); setSending(null);
        } catch (e: any) { setNotice({ tone: 'error', text: e.message }); }
        finally { setBusy(null); }
    };

    const holding = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (data?.holding ?? []).filter(b => !q || b.batchId.toLowerCase().includes(q) || b.productName.toLowerCase().includes(q));
    }, [data, query]);

    // ---------- not logged in ----------
    if (!authLoading && !isAuthenticated) {
        return (
            <DashboardShell>
                <div className="max-w-lg mx-auto text-center py-20">
                    <h1 className="text-2xl font-semibold text-gray-50">Transfers</h1>
                    <p className="text-gray-400 mt-2">Log in as an organisation to send and receive medicine batches.</p>
                    <Link href="/login" className={`${btn.primary} mt-6`}>Log in</Link>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            <div data-native-responsive className="space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-50">Transfers</h1>
                        <p className="text-sm text-gray-400 mt-1.5 max-w-2xl">
                            Ship batches to the next organisation and confirm the ones that arrive. Only the organisation holding a batch can send it, and every hand-off is signed into a tamper-evident ledger.
                        </p>
                    </div>
                    {data && (
                        <div className="text-sm text-right">
                            {isAdmin ? (
                                <label className="inline-flex items-center gap-2 text-gray-400">Acting as
                                    <select value={actingAs ?? ''} onChange={e => { setActingAs(e.target.value); setSending(null); setNotice(null); try { localStorage.setItem(ADMIN_KEY, e.target.value); } catch { } }}
                                        className="bg-gray-900 border border-gray-700 rounded-md px-2 py-1.5 text-gray-100">
                                        {[{ name: data.company, kind: data.kind }, ...data.recipients, ...(data.company === 'PharmaCure Labs' ? [] : [{ name: 'PharmaCure Labs', kind: 'Manufacturer' }])]
                                            .filter((p, i, a) => a.findIndex(x => x.name === p.name) === i)
                                            .map(p => <option key={p.name} value={p.name}>{p.name} ({p.kind})</option>)}
                                    </select>
                                </label>
                            ) : (
                                <p className="text-gray-400">Signed in for <span className="text-gray-100 font-medium">{data.company}</span> · {data.kind}</p>
                            )}
                        </div>
                    )}
                </div>

                <ChainStatusBar onChange={setChain} />

                {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200" role="alert">{error}</div>}
                {notice && (
                    <div role="status" className={`rounded-xl border p-4 text-sm flex gap-3 items-start ${notice.tone === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100' : notice.tone === 'warn' ? 'border-amber-500/30 bg-amber-500/5 text-amber-100' : 'border-rose-500/30 bg-rose-500/5 text-rose-100'}`}>
                        <span className="flex-1">{notice.text}{notice.link && <> <a href={notice.link} target="_blank" rel="noreferrer" className="underline">View on Etherscan ↗</a></>}</span>
                        <button onClick={() => setNotice(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {!data && !error && <p className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Loading transfers…</p>}

                {data && (
                    <>
                        <p className={`flex items-center gap-2 text-xs ${data.chain.ok ? 'text-gray-500' : 'text-rose-300'}`}>
                            {data.chain.ok
                                ? <><ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden />Ledger intact: {data.chain.entries} entr{data.chain.entries === 1 ? 'y' : 'ies'}, each linked to the one before by a SHA-256 hash.</>
                                : <><ShieldAlert className="w-4 h-4" aria-hidden />Ledger tampered: entry #{data.chain.brokenAt} no longer matches its hash. Every batch shipped after it is flagged as suspicious.</>}
                        </p>

                        {/* Incoming */}
                        <section aria-labelledby="in-h">
                            <h2 id="in-h" className="text-base font-semibold text-gray-100 mb-3 flex items-center gap-2"><Inbox className="w-4 h-4 text-gray-500" aria-hidden />Incoming ({data.incoming.length})</h2>
                            {data.incoming.length === 0 ? (
                                <p className="text-sm text-gray-500">Nothing on its way to {data.company}.</p>
                            ) : (
                                <ul className="rounded-xl border border-sky-500/30 divide-y divide-gray-800">
                                    {data.incoming.map(s => (
                                        <li key={`${s.batchId}-${s.id}`} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-gray-100">{s.productName} <span className="font-mono text-xs text-gray-500">{s.batchId}</span></p>
                                                <p className="text-xs text-gray-400">From {s.from} · sent {when(s.at)}{s.location ? ` · ${s.location}` : ''}{s.quantity ? ` · ${s.quantity} units` : ''}</p>
                                            </div>
                                            <button className={btn.primary} disabled={busy === s.id} onClick={() => receive(s)}>
                                                {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" aria-hidden />}Confirm received
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Batches held */}
                        <section aria-labelledby="hold-h">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                <h2 id="hold-h" className="text-base font-semibold text-gray-100 flex items-center gap-2"><Send className="w-4 h-4 text-gray-500" aria-hidden />Batches you can ship ({data.holding.length})</h2>
                                {data.holding.length > 6 && (
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Medicine or batch" aria-label="Search batches"
                                            className="w-full sm:w-56 pl-9 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                                    </div>
                                )}
                            </div>
                            <form className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-400"
                                onSubmit={e => { e.preventDefault(); const id = manualId.trim().toUpperCase(); if (id) { setNotice(null); setSending({ batchId: id, productName: id, manufacturer: 'Typed or scanned batch ID', quantity: null, expiryDate: null, verdict: 'genuine' }); } }}>
                                <span>Ship by batch ID</span>
                                <input value={manualId} onChange={e => setManualId(e.target.value)} placeholder="e.g. BAT-MED-SUS-001" aria-label="Batch ID to ship"
                                    className="w-48 px-2.5 py-1.5 rounded-md bg-gray-900 border border-gray-800 text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                                <button className={btn.ghost} disabled={!manualId.trim()}>Prepare</button>
                                <span className="text-gray-600">MediChain checks you hold it before anything is recorded.</span>
                            </form>
                            {sending && !data.holding.some(h => h.batchId === sending.batchId) && (
                                <div className="rounded-xl border border-gray-800 px-4 py-3 mb-3">
                                    <p className="text-sm text-gray-100 font-mono">{sending.batchId}</p>
                                    <SendForm b={sending} senderKind={data.kind} recipients={data.recipients} busy={busy === sending.batchId} onCancel={() => setSending(null)} onSend={(to, loc) => send(sending, to, loc)} />
                                </div>
                            )}
                            {data.holding.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    {data.kind === 'Manufacturer' ? <>No batches to ship yet. <Link href="/manufacturer" className="underline">Create a batch</Link> first.</> : 'Nothing in stock to ship. Confirm incoming batches first.'}
                                </p>
                            ) : (
                                <ul className="rounded-xl border border-gray-800 divide-y divide-gray-800 max-h-[520px] overflow-y-auto">
                                    {holding.map(b => (
                                        <li key={b.batchId} className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-gray-100">{b.productName} <span className="font-mono text-xs text-gray-500">{b.batchId}</span></p>
                                                    <p className="text-xs text-gray-500">{b.manufacturer}{b.quantity ? ` · ${b.quantity} units` : ''}{b.expiryDate ? ` · exp ${new Date(b.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}</p>
                                                </div>
                                                <VerdictBadge verdict={b.verdict} />
                                                {sending?.batchId !== b.batchId && (
                                                    <button className={btn.secondary} onClick={() => { setSending(b); setNotice(null); }}><Send className="w-4 h-4" aria-hidden />Send</button>
                                                )}
                                            </div>
                                            {sending?.batchId === b.batchId && (
                                                <SendForm b={b} senderKind={data.kind} recipients={data.recipients} busy={busy === b.batchId} onCancel={() => setSending(null)} onSend={(to, loc) => send(b, to, loc)} />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* History */}
                        <section aria-labelledby="hist-h">
                            <h2 id="hist-h" className="text-base font-semibold text-gray-100 mb-3 flex items-center gap-2"><History className="w-4 h-4 text-gray-500" aria-hidden />Your shipment history</h2>
                            {data.history.length === 0 ? <p className="text-sm text-gray-500">No shipments recorded by or for {data.company} yet.</p> : (
                                <div className="rounded-xl border border-gray-800 overflow-x-auto">
                                    <table className="w-full text-sm min-w-[720px]">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-500 border-b border-gray-800 bg-gray-900/60">
                                                <th className="font-normal px-4 py-2.5">When</th><th className="font-normal px-4 py-2.5">Batch</th>
                                                <th className="font-normal px-4 py-2.5">Route</th><th className="font-normal px-4 py-2.5">Status</th><th className="font-normal px-4 py-2.5">Proof</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {data.history.map(s => (
                                                <tr key={`${s.batchId}-${s.id}`}>
                                                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{when(s.at)}</td>
                                                    <td className="px-4 py-2.5"><Link href={`/verify/${encodeURIComponent(s.batchId)}`} className="text-gray-100 hover:underline">{s.productName}</Link><span className="block font-mono text-[11px] text-gray-500">{s.batchId}</span></td>
                                                    <td className="px-4 py-2.5 text-xs text-gray-300"><span className="inline-flex items-center gap-1.5 flex-wrap">{s.from}<ArrowRight className="w-3 h-3 text-gray-600" aria-hidden />{s.to}</span></td>
                                                    <td className="px-4 py-2.5 text-xs">{s.received ? <span className="text-emerald-300">Received</span> : <span className="text-amber-300">In transit</span>}</td>
                                                    <td className="px-4 py-2.5 text-[11px]">
                                                        <span className="font-mono text-gray-500" title="SHA-256 hash of this ledger entry">#{s.id} · {s.hash?.slice(0, 10)}</span>
                                                        {s.chainUrl ? <a href={s.chainUrl} target="_blank" rel="noreferrer" className="block text-emerald-300 hover:underline">Etherscan ↗</a>
                                                            : s.chainTx && <span className="block text-emerald-300/80" title={s.chainTx}>on-chain ✓</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </DashboardShell>
    );
}

function SendForm({ b, senderKind, recipients, busy, onCancel, onSend }: {
    b: Held; senderKind: string; recipients: Overview['recipients']; busy: boolean; onCancel: () => void; onSend: (to: string, location: string) => void;
}) {
    const [to, setTo] = useState('');
    const [loc, setLoc] = useState('');
    const groups = KIND_ORDER.map(k => ({ kind: k, list: recipients.filter(r => r.kind === k) })).filter(g => g.list.length);
    const pick = recipients.find(r => r.name === to);
    const blocked = b.verdict === 'counterfeit' || b.verdict === 'expired';
    return (
        <form className="mt-3 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-lg border border-gray-800 bg-gray-950/60 p-3"
            onSubmit={e => { e.preventDefault(); if (to) onSend(to, loc || pick?.city || to); }}>
            <label className="block text-xs text-gray-400">Send to
                <select required value={to} onChange={e => setTo(e.target.value)} className={`${field} mt-1`}>
                    <option value="">Choose organisation…</option>
                    {groups.map(g => (
                        <optgroup key={g.kind} label={g.kind}>
                            {g.list.map(r => <option key={r.name} value={r.name}>{r.name}{r.city ? ` · ${r.city}` : ''}</option>)}
                        </optgroup>
                    ))}
                </select>
            </label>
            <label className="block text-xs text-gray-400">Route / location <span className="text-gray-600">(optional)</span>
                <input value={loc} onChange={e => setLoc(e.target.value)} placeholder={pick?.city ? `e.g. Mumbai → ${pick.city}` : 'e.g. Mumbai → Delhi'} className={`${field} mt-1`} />
            </label>
            <div className="flex gap-2">
                <button type="button" className={btn.ghost} onClick={onCancel}>Cancel</button>
                <button type="submit" className={btn.primary} disabled={!to || busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" aria-hidden />}Ship</button>
            </div>
            {pick && senderKind === 'Manufacturer' && (pick.kind === 'Pharmacy' || pick.kind === 'Hospital') && (
                <p className="sm:col-span-3 text-xs text-amber-200/80">Shipping straight to a {pick.kind.toLowerCase()} skips the distributor. That&apos;s allowed for direct supply, but verification will flag the missing link.</p>
            )}
            {blocked && <p className="sm:col-span-3 text-xs text-rose-300">This batch is {b.verdict}; MediChain will refuse to ship it.</p>}
        </form>
    );
}
