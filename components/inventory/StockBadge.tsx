'use client';

import { useEffect, useState } from 'react';
import { alertCount, read, subscribe } from '@/lib/stockStore';

/** Number of medicines that are low or out of stock in the latest count. */
export function useStockAlerts() {
    const [a, setA] = useState({ out: 0, low: 0 });
    useEffect(() => { const load = () => setA(alertCount(read())); load(); return subscribe(load); }, []);
    return a;
}

export function StockBadge({ dotOnly = false }: { dotOnly?: boolean }) {
    const { out, low } = useStockAlerts();
    const total = out + low;
    if (!total) return null;
    const cls = out ? 'bg-rose-500' : 'bg-amber-400';
    return dotOnly
        ? <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${cls}`} aria-label={`${total} stock alerts`} />
        : <span className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold text-gray-950 flex items-center justify-center ${cls}`} aria-label={`${total} stock alerts`}>{total}</span>;
}

/** Dashboard card, shown only when the latest stock count has alerts. */
export function StockAlertCard() {
    const { out, low } = useStockAlerts();
    if (!out && !low) return null;
    return (
        <a href="/inventory" className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm transition-colors ${out ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10' : 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'}`}>
            <span className="text-gray-100">
                Stock alert: {[out && `${out} medicine${out > 1 ? 's' : ''} out of stock`, low && `${low} running low`].filter(Boolean).join(', ')}.
            </span>
            <span className="text-xs text-gray-400 whitespace-nowrap">View stock →</span>
        </a>
    );
}
