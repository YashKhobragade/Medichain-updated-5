'use client';

import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Clock, ShieldAlert, HelpCircle, ArrowRight } from 'lucide-react';
import type { Check, Verdict, VerificationResult } from '@/lib/verification';
import { VERDICT_COPY } from '@/lib/verification';

export const VERDICT_TONE: Record<Verdict, { text: string; bg: string; border: string; bar: string; Icon: React.ElementType }> = {
    genuine: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-400', Icon: CheckCircle2 },
    suspicious: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-400', Icon: AlertTriangle },
    expired: { text: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', bar: 'bg-orange-500', Icon: Clock },
    counterfeit: { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', bar: 'bg-rose-500', Icon: ShieldAlert },
    not_found: { text: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30', bar: 'bg-slate-500', Icon: HelpCircle },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
    const t = VERDICT_TONE[verdict];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${t.bg} ${t.border} ${t.text} whitespace-nowrap`}>
            <t.Icon className="w-3.5 h-3.5" aria-hidden />
            {VERDICT_COPY[verdict].label}
        </span>
    );
}

const OUTCOME_ICON: Record<Check['outcome'], { Icon: React.ElementType; cls: string; sr: string }> = {
    pass: { Icon: CheckCircle2, cls: 'text-emerald-400', sr: 'Passed' },
    warn: { Icon: AlertTriangle, cls: 'text-amber-400', sr: 'Warning' },
    fail: { Icon: XCircle, cls: 'text-rose-400', sr: 'Failed' },
    skip: { Icon: MinusCircle, cls: 'text-gray-600', sr: 'Not applicable' },
};

export function CheckList({ checks }: { checks: Check[] }) {
    return (
        <ul className="space-y-2">
            {checks.map(c => {
                const o = OUTCOME_ICON[c.outcome];
                return (
                    <li key={c.id} className="flex gap-2.5">
                        <o.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${o.cls}`} aria-hidden />
                        <div className="min-w-0">
                            <p className={`text-sm ${c.outcome === 'skip' ? 'text-gray-500' : 'text-gray-200'}`}><span className="sr-only">{o.sr}: </span>{c.label}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{c.detail}</p>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

const PARTY_STYLE: Record<string, string> = {
    Manufacturer: 'border-emerald-500/30 text-emerald-200',
    Distributor: 'border-sky-500/30 text-sky-200',
    Pharmacy: 'border-violet-400/30 text-violet-200',
    Hospital: 'border-violet-400/30 text-violet-200',
    Unknown: 'border-rose-500/50 text-rose-300 bg-rose-500/10',
};

export function CustodyPath({ path }: { path: VerificationResult['path'] }) {
    if (!path.length) return <p className="text-xs text-gray-500">No custody record.</p>;
    return (
        <ol className="flex flex-wrap items-center gap-1.5">
            {path.map((p, i) => (
                <li key={i} className="flex items-center gap-1.5">
                    <span className={`px-2 py-1 rounded-md border text-xs ${PARTY_STYLE[p.type] ?? 'border-gray-700 text-gray-300'}`}>
                        {p.name}
                        <span className="ml-1.5 text-[10px] text-gray-500">{p.type === 'Unknown' ? 'unregistered' : p.type.toLowerCase()}</span>
                    </span>
                    {i < path.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600" aria-hidden />}
                </li>
            ))}
        </ol>
    );
}
