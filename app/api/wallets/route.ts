import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import { allWallets, linkWallet, WALLET_ROLE } from '@/lib/walletLinks';

export const dynamic = 'force-dynamic';

/** GET /api/wallets → every organisation's public wallet address (same shape as public/wallets.json). */
export async function GET() {
    const parties = Object.fromEntries(allWallets().map(w => [w.company, w]));
    return NextResponse.json({ parties });
}

/** POST /api/wallets { address } → links the MetaMask address to the logged-in organisation. */
export async function POST(request: NextRequest) {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Log in to link a wallet.' }, { status: 401 });
    const role = WALLET_ROLE[user.role];
    if (!role || !user.company) return NextResponse.json({ error: 'Only manufacturers, distributors, pharmacies and hospitals link wallets.' }, { status: 403 });
    try {
        const { address } = await request.json();
        const entry = linkWallet(user.company, role, String(address ?? ''), user.email);
        return NextResponse.json({ entry });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
