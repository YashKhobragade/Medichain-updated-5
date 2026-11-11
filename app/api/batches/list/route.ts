import { NextRequest, NextResponse } from 'next/server';
import { DEMO_BATCHES, DEMO_PRODUCTS } from '@/utils/demo';
import { getAuthUser } from '@/middleware/auth';
import { localBatches } from '@/lib/localBatches';
import { allBatches, stateOf } from '@/lib/supplyChain';
import { entries } from '@/lib/shipments';

export const dynamic = 'force-dynamic';

const PRODUCTS = new Map(DEMO_PRODUCTS.map(p => [p.id, p]));
const DEMO = new Map(DEMO_BATCHES.map(b => [b.batch_id, b]));
const LOCAL = () => new Map(localBatches().map((b: any) => [b.batch_id, b]));

/**
 * GET /api/batches/list → the real batch list with live status from the shipment ledger.
 * Manufacturers see the batches they made; admins and others see all.
 * Also returns `activity`: the latest creations and shipments, newest first.
 */
export async function GET(request: NextRequest) {
    const user = getAuthUser(request);
    const company = (user?.company ?? '').toLowerCase();
    const local = LOCAL();
    const list = entries();

    const mine = (b: { manufacturer: string; createdBy?: string }) =>
        user?.role !== 'manufacturer' || b.manufacturer.toLowerCase() === company || (!!b.createdBy && b.createdBy === user.email);

    const batches = allBatches().filter(mine).map(b => {
        const raw: any = local.get(b.batchId);
        const demo = DEMO.get(b.batchId);
        const product = demo ? PRODUCTS.get(demo.product_id) : undefined;
        const st = stateOf(b, list);
        const last = st.ships[st.ships.length - 1];
        const status = demo?.status === 'Flagged' ? 'FLAGGED'
            : st.fresh ? 'CREATED'
                : st.inTransit ? 'IN_TRANSIT'
                    : last && (last.toType === 'Pharmacy' || last.toType === 'Hospital') ? 'DELIVERED'
                        : 'IN_TRANSIT';
        return {
            id: b.batchId,
            batch_id: b.batchId,
            product_name: b.productName,
            product_category: raw?.product_category || product?.category || '—',
            sku: raw?.sku || product?.sku || '—',
            manufacturer_name: b.manufacturer,
            origin_location: raw?.origin_location || demo?.origin_location || '—',
            production_date: raw?.production_date || demo?.production_date || null,
            expiry_date: b.expiryDate,
            quantity: b.quantity,
            status,
            holder: st.holder,
            created_at: raw?.created_at || (demo?.production_date ? demo.production_date + 'T00:00:00Z' : null),
            source: raw ? 'created' : 'demo',
        };
    }).sort((a, b) => (b.source === 'created' ? 1 : 0) - (a.source === 'created' ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)));

    // Activity: batches created in the app + ledger shipments, for the batches this user sees
    const ids = new Set(batches.map(b => b.batch_id));
    const activity = [
        ...batches.filter(b => b.source === 'created' && b.created_at).map(b => ({
            kind: 'created', at: b.created_at as string, text: `Batch created: ${b.product_name} (${b.batch_id}) by ${b.manufacturer_name}`,
        })),
        ...list.filter(e => ids.has(e.batchId)).map(e => ({
            kind: e.type === 'SENT' ? 'sent' : 'received', at: e.at,
            text: e.type === 'SENT' ? `Shipped ${e.batchId}: ${e.from} → ${e.to}` : `${e.to} confirmed receipt of ${e.batchId}`,
        })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

    return NextResponse.json({ success: true, batches, count: batches.length, activity });
}
