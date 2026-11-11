// ============================================================
// Shipment ledger (server only)
// ------------------------------------------------------------
// Every hand-off between organisations is written here:
//   SENT      — the holder ships a batch to the next organisation
//   RECEIVED  — the recipient confirms it arrived
//
// Like a blockchain, entries are append-only and each one stores
// the SHA-256 hash of the entry before it. Changing any past
// entry breaks every hash after it, so tampering is detected
// (see verifyChain). Saved to data/ledger.json.
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DEMO_TRANSFERS } from '@/utils/demo';
import { explorerTxUrl, getReceipt, shipmentKey } from '@/lib/chainTx';

const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'ledger.json');
const GENESIS = '0'.repeat(64);

export type PartyKind = 'Manufacturer' | 'Warehouse' | 'Distributor' | 'Logistics' | 'Pharmacy' | 'Hospital' | 'Unknown';

export interface LedgerEntry {
    seq: number;
    type: 'SENT' | 'RECEIVED';
    batchId: string;
    from: string;
    fromType: PartyKind;
    to: string;
    toType: PartyKind;
    location: string;
    at: string;
    /** email of the account that signed this entry */
    by: string;
    /** for RECEIVED: the seq (or demo transfer id) of the shipment being confirmed */
    ref?: string;
    prevHash: string;
    hash: string;
}

type Unsigned = Omit<LedgerEntry, 'seq' | 'prevHash' | 'hash'>;

function hashOf(e: Omit<LedgerEntry, 'hash'>) {
    // Fixed field order so the same entry always gives the same hash
    const body = [e.seq, e.type, e.batchId, e.from, e.fromType, e.to, e.toType, e.location, e.at, e.by, e.ref ?? '', e.prevHash].join('|');
    return crypto.createHash('sha256').update(body).digest('hex');
}

function load(): LedgerEntry[] {
    const g = globalThis as any;
    if (!Array.isArray(g.__medichainLedger)) {
        try { g.__medichainLedger = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { g.__medichainLedger = []; }
    }
    return g.__medichainLedger;
}

/** Re-read from disk, so hand edits to data/ledger.json are noticed (for the tamper demo). */
export function entries(): LedgerEntry[] {
    const g = globalThis as any;
    try { g.__medichainLedger = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* keep memory copy */ }
    return load();
}

export function append(e: Unsigned): LedgerEntry {
    const list = load();
    const prev = list[list.length - 1];
    const base = { ...e, seq: (prev?.seq ?? 0) + 1, prevHash: prev?.hash ?? GENESIS };
    const entry: LedgerEntry = { ...base, hash: hashOf(base) };
    list.push(entry);
    try {
        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
    } catch { /* read-only host: memory only */ }
    return entry;
}

/** Recompute every hash. Returns the first entry that doesn't match, if any. */
export function verifyChain(list = entries()): { ok: boolean; brokenAt: number | null } {
    let prev = GENESIS;
    for (const e of list) {
        const { hash, ...rest } = e;
        if (e.prevHash !== prev || hashOf(rest) !== hash) return { ok: false, brokenAt: e.seq };
        prev = hash;
    }
    return { ok: true, brokenAt: null };
}

// ---------- shipment state for one batch ----------

export interface Shipment {
    id: string;              // ledger seq, or demo transfer id
    batchId: string;
    from: string; fromType: PartyKind;
    to: string; toType: PartyKind;
    location: string;
    at: string;
    received: boolean;
    by?: string;
    hash?: string;
    source: 'ledger' | 'demo';
    /** public blockchain transaction for this shipment, if it was also written on-chain */
    chainTx?: string;
    chainUrl?: string | null;
}

/** All shipments of a batch in order: built-in demo history first, then the ledger. */
export function shipmentsOf(batchId: string, typeOf: (name: string) => PartyKind, list = entries()): Shipment[] {
    const id = batchId.toUpperCase();
    const out: Shipment[] = DEMO_TRANSFERS
        .filter(t => t.batch_id.toUpperCase() === id)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .map(t => ({
            id: t.transfer_id, batchId: t.batch_id, from: t.from_company, fromType: typeOf(t.from_company),
            to: t.to_company, toType: typeOf(t.to_company), location: t.location, at: t.timestamp,
            received: t.status !== 'In Transit', hash: t.blockchain_tx_hash, source: 'demo' as const,
        }));
    for (const e of list.filter(x => x.batchId.toUpperCase() === id)) {
        if (e.type === 'SENT') {
            const r = getReceipt(shipmentKey(e.seq));
            out.push({ id: String(e.seq), batchId: e.batchId, from: e.from, fromType: e.fromType, to: e.to, toType: e.toType, location: e.location, at: e.at, received: false, by: e.by, hash: e.hash, source: 'ledger', chainTx: r?.txHash, chainUrl: r ? explorerTxUrl(r) : undefined });
        } else {
            const s = out.find(x => x.id === e.ref);
            if (s) s.received = true;
        }
    }
    return out;
}
