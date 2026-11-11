// ============================================================
// Ledger lookups (server only)
// ------------------------------------------------------------
// Turns a batch ID into a LedgerRecord the verification engine
// understands. Looks in PostgreSQL first, then batches created
// in this server session, then the bundled demo ledger.
// ============================================================

import { localBatches } from '@/lib/localBatches';
import { DEMO_BATCHES, DEMO_PRODUCTS, DEMO_COMPANIES } from '@/utils/demo';
import { entries, shipmentsOf, verifyChain } from '@/lib/shipments';
import { partyKind } from '@/lib/localUsers';
import type { LedgerRecord, PartyType, CustodyStep } from '@/lib/verification';

const PRODUCTS = new Map(DEMO_PRODUCTS.map(p => [p.id, p]));
const COMPANY_TYPES = new Map(DEMO_COMPANIES.map(c => [c.company_name.toLowerCase(), c.company_type as PartyType]));

export function partyType(name: string | null | undefined): PartyType {
    if (!name) return 'Unknown';
    const known = COMPANY_TYPES.get(name.toLowerCase());
    if (known) return known;
    // DB rows carry a stage label rather than a company we know
    const n = name.toLowerCase();
    if (n.includes('manufactur')) return 'Manufacturer';
    if (n.includes('warehouse') || n.includes('storage') || n.includes('depot')) return 'Warehouse';
    if (n.includes('distribut')) return 'Distributor';
    if (n.includes('logistic') || n.includes('freight') || n.includes('express')) return 'Logistics';
    if (n.includes('hospital')) return 'Hospital';
    if (n.includes('pharmacy') || n.includes('vendor') || n.includes('medical store') || n.includes('chemist')) return 'Pharmacy';
    return 'Unknown';
}

/** Strict lookup: a company is only trusted if it's registered (built-in or a signed-up organisation). */
function registeredType(name: string): PartyType {
    return COMPANY_TYPES.get(name.toLowerCase()) ?? partyKind(name);
}

/** Custody = the built-in history plus everything on the shipment ledger. */
function custodyOf(batchId: string): { custody: CustodyStep[]; tampered: boolean } {
    const list = entries();
    const chain = verifyChain(list);
    const custody = shipmentsOf(batchId, registeredType, list).map(s => ({
        from: s.from, to: s.to, fromType: s.fromType, toType: s.toType,
        status: s.received ? 'Completed' : 'In Transit', timestamp: s.at, location: s.location, txHash: s.hash,
        chainTx: s.chainTx, chainUrl: s.chainUrl,
    }));
    return { custody, tampered: !chain.ok };
}

function stageOf(custody: CustodyStep[], fallback: string) {
    return custody.length ? custody[custody.length - 1].toType : fallback;
}

export function demoRecord(batchId: string): LedgerRecord | null {
    const batch = DEMO_BATCHES.find(b => b.batch_id.toLowerCase() === batchId.toLowerCase());
    if (!batch) return null;
    const product = PRODUCTS.get(batch.product_id);
    const manufacturer = product?.manufacturer ?? 'Unknown';
    const { custody, tampered } = custodyOf(batch.batch_id);
    const flagged = batch.status === 'Flagged';
    return {
        batchId: batch.batch_id,
        productName: product?.product_name ?? batch.product_id,
        // A flagged batch's custody begins at an unknown party, so treat its claimed maker as unverified
        manufacturer: flagged ? (custody[0]?.from ?? 'Unknown origin') : manufacturer,
        manufacturerRegistered: !flagged && registeredType(manufacturer) === 'Manufacturer',
        expiryDate: batch.expiry_date,
        currentStage: stageOf(custody, batch.current_stage),
        flagged,
        tampered,
        custody,
        source: 'demo',
        quantity: (batch as any).quantity ?? null,
    };
}

export function sessionRecord(batchId: string): LedgerRecord | null {
    const mock = localBatches();
    const b = mock?.find(x => x.batch_id?.toLowerCase() === batchId.toLowerCase());
    if (!b) return null;
    const { custody, tampered } = custodyOf(b.batch_id);
    return {
        batchId: b.batch_id,
        productName: b.product_name || b.product_id || 'Unknown product',
        manufacturer: b.manufacturer_name || 'Session manufacturer',
        manufacturerRegistered: true,
        expiryDate: b.expiry_date || null,
        currentStage: stageOf(custody, 'Manufacturer'),
        flagged: b.status === 'FLAGGED',
        custody,
        tampered,
        source: 'session',
        quantity: Number(b.quantity) > 0 ? Number(b.quantity) : null,
    };
}

async function databaseRecord(db: any, batchId: string): Promise<LedgerRecord | null> {
    const batch = await db.getBatch(batchId);
    if (!batch) return null;
    const events: any[] = await db.getTransferHistory(batchId);
    // DB events record "actor + stage reached"; rebuild hand-offs from consecutive events
    const custody: CustodyStep[] = [];
    let holder = 'Manufacturer';
    for (const e of events) {
        if (e.event_type !== 'RECEIVED') continue;
        const to = e.actor_name || e.stage;
        custody.push({
            from: holder, to,
            fromType: partyType(holder),
            toType: partyType(e.actor_name) !== 'Unknown' ? partyType(e.actor_name) : partyType(e.stage),
            timestamp: e.timestamp, location: e.location, txHash: e.blockchain_tx_hash,
        });
        holder = to;
    }
    return {
        batchId: batch.batch_id,
        productName: batch.product_name,
        manufacturer: 'Manufacturer',
        manufacturerRegistered: !String(batch.manufacturer_address).includes('FAKE'),
        expiryDate: batch.expiry_date ? new Date(batch.expiry_date).toISOString() : null,
        currentStage: batch.status === 'DELIVERED' ? 'Pharmacy' : batch.status === 'CREATED' ? 'Manufacturer' : 'Logistics',
        flagged: batch.status === 'FLAGGED',
        custody,
        source: 'database',
        quantity: Number(batch.quantity) > 0 ? Number(batch.quantity) : null,
    };
}

/**
 * Returns a lookup function bound to whichever sources are reachable.
 * The DB is probed once up front so a missing database costs one
 * timeout, not one per row of a 2,000-line upload.
 */
let dbProbe: { at: number; db: any } | null = null;
const PROBE_TTL_MS = 30_000; // live scanning calls this several times a second

export async function openLedger() {
    let db: any = null;
    if (dbProbe && Date.now() - dbProbe.at < PROBE_TTL_MS) {
        db = dbProbe.db;
    } else {
        try {
            const mod = await import('@/lib/database');
            await mod.db.getBatch('__healthcheck__');
            db = mod.db;
        } catch {
            db = null;
        }
        dbProbe = { at: Date.now(), db };
    }

    return {
        usingDatabase: !!db,
        async lookup(batchId: string): Promise<LedgerRecord | null> {
            if (db) {
                try {
                    const rec = await databaseRecord(db, batchId);
                    if (rec) return rec;
                } catch { /* fall through to local sources */ }
            }
            return sessionRecord(batchId) ?? demoRecord(batchId);
        },
    };
}

/** Built-in or locally created batch, without touching the database. */
export function localRecord(batchId: string): LedgerRecord | null {
    return sessionRecord(batchId) ?? demoRecord(batchId);
}
