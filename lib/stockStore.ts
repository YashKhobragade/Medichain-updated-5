// ============================================================
// Stock levels (stored in this browser)
// ------------------------------------------------------------
// Two-bin rule: alerts are by BOXES, which is what the camera
// can see. 2+ boxes = OK, 1 box left = low (reorder now),
// 0 boxes = out of stock. Units are shown for information.
// ------------------------------------------------------------
// Authenticity comes from the blockchain on every scan. Stock
// levels are the pharmacy's own day-to-day records, so they are
// kept in the browser's localStorage. Everything goes through
// this file: to move stock into PostgreSQL later, replace
// read()/write() and nothing else changes.
// ============================================================

import type { ScanGroup } from '@/lib/scanTypes';
import type { Verdict } from '@/lib/verification';

const KEY = 'medichain_stock_v1';
export const DEFAULT_MIN_BOXES = 2;
const EVENT = 'medichain-stock-changed';
const MAX_COUNTS = 20;

export interface CountedBox {
    batchId: string;
    productName: string | null;
    manufacturer: string | null;
    expiryDate: string | null;
    verdict: Verdict;
    /** units packed in the box, from the blockchain (information only) */
    packed: number | null;
    /** how many times this QR was seen (more than 1 = copies) */
    seen: number;
}

export interface StockCount {
    id: string;
    at: string;
    source: 'live' | 'photo';
    boxes: CountedBox[];
}

export interface StockData {
    version: 2;
    /** minimum boxes per medicine; medicines not listed use DEFAULT_MIN_BOXES */
    minBoxes: Record<string, number>;
    counts: StockCount[];
}

export type StockStatus = 'out' | 'low' | 'ok';

export interface MedicineLine {
    name: string;
    /** every box of this medicine in the count, usable or not */
    boxes: CountedBox[];
    usableBoxes: CountedBox[];
    /** units in the usable boxes (information only) */
    units: number;
    minBoxes: number;
    status: StockStatus;
}

const empty = (): StockData => ({ version: 2, minBoxes: {}, counts: [] });

/** Accepts current data and older saves (v1 had unit-based minimums, which no longer apply). */
function normalize(d: any): StockData | null {
    if (!d || !Array.isArray(d.counts)) return null;
    if (d.version === 2 && typeof d.minBoxes === 'object') return d as StockData;
    if (d.version === 1) return { version: 2, minBoxes: {}, counts: d.counts };
    return null;
}

// ---------- storage ----------

export function read(): StockData {
    if (typeof window === 'undefined') return empty();
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return empty();
        return normalize(JSON.parse(raw)) ?? empty();
    } catch {
        return empty();
    }
}

function write(d: StockData) {
    try {
        localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
        throw new Error('Could not save: browser storage is full or blocked.');
    }
    window.dispatchEvent(new Event(EVENT));
}

/** Re-render when stock changes (in this tab or another one). */
export function subscribe(fn: () => void) {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
    window.addEventListener(EVENT, fn);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(EVENT, fn); window.removeEventListener('storage', onStorage); };
}

// ---------- rules ----------

/** Only genuine boxes count as stock. Suspicious ones are on hold; the rest can't be used. */
export const isUsable = (b: CountedBox) => b.verdict === 'genuine';

export const unitsOf = (b: CountedBox) => b.packed ?? 0;

export function notUsableReason(b: CountedBox): string {
    switch (b.verdict) {
        case 'counterfeit': return 'Counterfeit';
        case 'expired': return 'Expired';
        case 'not_found': return 'Not on the blockchain';
        case 'suspicious': return 'On hold: suspicious history';
        default: return '';
    }
}

export function summarize(count: StockCount | null, minBoxes: Record<string, number>): MedicineLine[] {
    const byName = new Map<string, CountedBox[]>();
    for (const b of count?.boxes ?? []) {
        if (!b.productName) continue;
        byName.set(b.productName, [...(byName.get(b.productName) ?? []), b]);
    }
    // Only medicines seen in this scan are listed (a saved "reorder below" number alone doesn't add one)

    const rank: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };
    return Array.from(byName.entries()).map(([name, boxes]) => {
        const usableBoxes = boxes.filter(isUsable);
        const min = minBoxes[name] ?? DEFAULT_MIN_BOXES;
        // Two-bin rule: the last box is always "Low: reorder", even if the minimum was set to 1
        const status: StockStatus = usableBoxes.length === 0 ? 'out' : usableBoxes.length <= 1 || usableBoxes.length < min ? 'low' : 'ok';
        return { name, boxes, usableBoxes, units: usableBoxes.reduce((t, b) => t + unitsOf(b), 0), minBoxes: min, status };
    }).sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}

export function alertCount(d: StockData = read()) {
    const latest = d.counts[0];
    if (!latest) return { out: 0, low: 0 };
    const lines = summarize(latest, d.minBoxes);
    return { out: lines.filter(l => l.status === 'out').length, low: lines.filter(l => l.status === 'low').length };
}

// ---------- changes ----------

export function saveCount(groups: ScanGroup[], source: StockCount['source']): StockCount {
    const d = read();
    const count: StockCount = {
        id: `SC-${Date.now().toString(36).toUpperCase()}`,
        at: new Date().toISOString(),
        source,
        boxes: groups.map(g => ({
            batchId: g.batchId,
            productName: g.verification.productName,
            manufacturer: g.verification.manufacturer,
            expiryDate: g.verification.expiryDate,
            // a copied QR is never trusted as stock, even if the batch itself is genuine
            verdict: g.count > 1 && g.verification.verdict === 'genuine' ? 'suspicious' : g.verification.verdict,
            packed: g.verification.quantity,
            seen: g.count,
        })),
    };
    d.counts = [count, ...d.counts].slice(0, MAX_COUNTS);
    write(d);
    return count;
}

/** "Reorder below" level of a medicine, in boxes. null resets it to the default (2). */
export function setMinBoxes(name: string, value: number | null) {
    const d = read();
    if (value == null || !Number.isFinite(value) || value < 1) delete d.minBoxes[name];
    else d.minBoxes[name] = Math.round(value);
    write(d);
}

/** A box has been used up: take it off the latest count right away (the next scan confirms it). */
export function finishBox(countId: string, batchId: string) {
    const d = read();
    const count = d.counts.find(c => c.id === countId);
    if (!count) return;
    count.boxes = count.boxes.filter(b => b.batchId !== batchId);
    write(d);
}

export function deleteCount(countId: string) {
    const d = read();
    d.counts = d.counts.filter(c => c.id !== countId);
    write(d);
}

export function clearAll() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVENT));
}

// ---------- backup ----------

export function exportBackup() {
    const blob = new Blob([JSON.stringify(read(), null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `medichain-stock-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importBackup(file: File) {
    let d: StockData | null = null;
    try { d = normalize(JSON.parse(await file.text())); } catch { /* handled below */ }
    if (!d) throw new Error('That file is not a MediChain stock backup.');
    write({ ...d, counts: d.counts.slice(0, MAX_COUNTS) });
}
