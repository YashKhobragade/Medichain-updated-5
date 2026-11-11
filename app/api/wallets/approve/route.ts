import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import { markApproved } from '@/lib/walletLinks';

/** POST /api/wallets/approve { company, address, txHash } → admin records the on-chain approval. */
export async function POST(request: NextRequest) {
    const user = getAuthUser(request);
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Only the admin approves wallets.' }, { status: 403 });
    try {
        const { company, address, txHash } = await request.json();
        if (!/^0x[0-9a-fA-F]{64}$/.test(String(txHash ?? ''))) throw new Error('Missing transaction hash.');
        return NextResponse.json({ entry: markApproved(String(company ?? ''), String(address ?? ''), txHash) });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
