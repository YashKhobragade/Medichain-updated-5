// ============================================================
// Supply-chain rules (server only)
// ------------------------------------------------------------
// Who holds a batch right now, who may ship it, who may confirm
// receipt. Every allowed action is written to the shipment
// ledger (lib/shipments.ts); anything else is refused.
// ============================================================

import { DEMO_BATCHES, DEMO_PRODUCTS } from '@/utils/demo';
import { localBatches } from '@/lib/localBatches';
import { append, entries, shipmentsOf, verifyChain, type Shipment } from '@/lib/shipments';
import { partyKind, registeredParties } from '@/lib/localUsers';
import { localRecord } from '@/lib/ledger';
import { verifyRecord } from '@/lib/verification';
import type { AuthUser } from '@/middleware/auth';

export class ChainError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}

interface BatchInfo { batchId: string; productName: string; manufacturer: string; quantity: number | null; expiryDate: string | null; createdBy?: string }

const PRODUCTS = new Map(DEMO_PRODUCTS.map(p => [p.id, p]));

export function allBatches(): BatchInfo[] {
    const demo = DEMO_BATCHES.map(b => ({
        batchId: b.batch_id, productName: PRODUCTS.get(b.product_id)?.product_name ?? b.product_id,
        manufacturer: PRODUCTS.get(b.product_id)?.manufacturer ?? 'Unknown', quantity: (b as any).quantity ?? null, expiryDate: b.expiry_date,
    }));
    const local = localBatches().map(b => ({
        batchId: b.batch_id, productName: b.product_name || b.product_id, manufacturer: b.manufacturer_name || 'Manufacturer',
        quantity: Number(b.quantity) || null, expiryDate: b.expiry_date || null, createdBy: b.created_by,
    }));
    return [...local, ...demo];
}

const kindOf = (name: string) => partyKind(name);

/** Where a batch is now: with its last recipient, or still with the manufacturer. */
export function stateOf(b: BatchInfo, list = entries()) {
    const ships = shipmentsOf(b.batchId, kindOf, list);
    const last = ships[ships.length - 1];
    return {
        ships,
        holder: last ? last.to : b.manufacturer,
        inTransit: !!last && !last.received,
        fresh: !last,
    };
}

function canShip(user: AuthUser, company: string, b: BatchInfo, st: ReturnType<typeof stateOf>) {
    if (st.inTransit) return false;
    // A new batch can be shipped by whoever created it (manufacturer or admin) or by its manufacturer
    if (st.fresh) return (!!b.createdBy && b.createdBy === user.email) || st.holder.toLowerCase() === company.toLowerCase();
    return st.holder.toLowerCase() === company.toLowerCase();
}

/** The organisation an account acts for. Admins may act for any registered organisation. */
export function actingCompany(user: AuthUser, actingAs?: string | null): string {
    if (user.role === 'admin') {
        if (!actingAs) throw new ChainError('Choose which organisation to act as.');
        if (partyKind(actingAs) === 'Unknown') throw new ChainError(`${actingAs} is not a registered organisation.`);
        return actingAs;
    }
    if (!user.company) throw new ChainError('This account does not belong to a supply-chain organisation.', 403);
    return user.company;
}

export function overview(user: AuthUser, company: string) {
    const list = entries();
    const batches = allBatches();
    const c = company.toLowerCase();
    const incoming: (Shipment & { productName: string; quantity: number | null })[] = [];
    const holding: (BatchInfo & { verdict: string })[] = [];
    const history: (Shipment & { productName: string })[] = [];

    for (const b of batches) {
        const st = stateOf(b, list);
        const last = st.ships[st.ships.length - 1];
        if (last && st.inTransit && last.to.toLowerCase() === c) incoming.push({ ...last, productName: b.productName, quantity: b.quantity });
        if (canShip(user, company, b, st)) {
            holding.push({ ...b, verdict: verifyRecord(localRecord(b.batchId), b.batchId).verdict });
        }
        st.ships.filter(s => s.source === 'ledger' && (s.from.toLowerCase() === c || s.to.toLowerCase() === c))
            .forEach(s => history.push({ ...s, productName: b.productName }));
    }
    history.sort((a, b) => b.at.localeCompare(a.at));
    const kind = partyKind(company);
    return {
        company, kind,
        incoming, holding, history: history.slice(0, 30),
        // who you can ship to: the next steps in the chain, never yourself
        recipients: registeredParties().filter(p => p.name.toLowerCase() !== c && p.kind !== 'Manufacturer'),
        chain: { ...verifyChain(list), entries: list.length },
    };
}

export function send(user: AuthUser, company: string, batchId: string, to: string, location: string) {
    const b = allBatches().find(x => x.batchId.toLowerCase() === batchId.trim().toLowerCase());
    if (!b) throw new ChainError(`Batch ${batchId} does not exist.`, 404);
    const toKind = partyKind(to);
    if (toKind === 'Unknown') throw new ChainError(`${to} is not a registered organisation. Medicine can only be shipped to registered parties.`);
    if (to.toLowerCase() === company.toLowerCase()) throw new ChainError('You cannot ship a batch to yourself.');

    const st = stateOf(b);
    if (st.inTransit) throw new ChainError(`Blocked: ${b.batchId} is already on its way to ${st.holder} and must be received first.`, 409);
    if (!canShip(user, company, b, st)) {
        throw new ChainError(`Unauthorized transfer blocked: ${b.batchId} is held by ${st.holder}, not ${company}. Only the current holder can ship it.`, 403);
    }
    // Never pass on medicine that fails verification
    const v = verifyRecord(localRecord(b.batchId), b.batchId);
    if (v.verdict === 'counterfeit' || v.verdict === 'expired') {
        throw new ChainError(`Blocked: ${b.batchId} is ${v.verdict}. ${v.summary}`, 409);
    }
    return append({
        type: 'SENT', batchId: b.batchId,
        from: st.holder, fromType: st.fresh ? 'Manufacturer' : partyKind(st.holder),
        to, toType: toKind, location: location.trim() || to, at: new Date().toISOString(), by: user.email,
    });
}

export function receive(user: AuthUser, company: string, batchId: string, shipmentId: string) {
    const b = allBatches().find(x => x.batchId.toLowerCase() === batchId.trim().toLowerCase());
    if (!b) throw new ChainError(`Batch ${batchId} does not exist.`, 404);
    const st = stateOf(b);
    const s = st.ships.find(x => x.id === shipmentId);
    if (!s || s.received) throw new ChainError('That shipment is not waiting to be received.', 409);
    if (s.to.toLowerCase() !== company.toLowerCase()) {
        throw new ChainError(`Blocked: this shipment is addressed to ${s.to}, not ${company}.`, 403);
    }
    return append({
        type: 'RECEIVED', batchId: b.batchId, from: s.from, fromType: s.fromType, to: s.to, toType: s.toType,
        location: s.location, at: new Date().toISOString(), by: user.email, ref: s.id,
    });
}
