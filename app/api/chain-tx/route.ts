import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import { entries } from '@/lib/shipments';
import { localBatches } from '@/lib/localBatches';
import { batchKey, saveReceipt, shipmentKey } from '@/lib/chainTx';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chain-tx  { kind: 'shipment' | 'batch', ref, txHash, network, chainId }
 * Links a public blockchain transaction to a shipment or batch you made.
 */
export async function POST(request: NextRequest) {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Log in first.' }, { status: 401 });
    const b = await request.json().catch(() => ({}));
    const txHash = String(b.txHash ?? '');
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return NextResponse.json({ error: 'Not a transaction hash.' }, { status: 400 });
    const receipt = { txHash, network: String(b.network ?? 'unknown'), chainId: Number(b.chainId) || 0, at: new Date().toISOString() };

    if (b.kind === 'shipment') {
        const e = entries().find(x => String(x.seq) === String(b.ref) && x.type === 'SENT');
        if (!e) return NextResponse.json({ error: 'Shipment not found.' }, { status: 404 });
        if (e.by !== user.email && user.role !== 'admin') return NextResponse.json({ error: 'You did not record this shipment.' }, { status: 403 });
        saveReceipt(shipmentKey(e.seq), receipt);
    } else if (b.kind === 'batch') {
        const batch = localBatches().find(x => String(x.batch_id).toUpperCase() === String(b.ref).toUpperCase());
        if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
        if (batch.created_by && batch.created_by !== user.email && user.role !== 'admin') return NextResponse.json({ error: 'You did not create this batch.' }, { status: 403 });
        saveReceipt(batchKey(batch.batch_id), receipt);
    } else {
        return NextResponse.json({ error: 'kind must be shipment or batch.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}
