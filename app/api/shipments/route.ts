import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/middleware/auth';
import { ChainError, actingCompany, overview, receive, send } from '@/lib/supplyChain';

export const dynamic = 'force-dynamic';

function fail(e: any) {
    const status = e instanceof ChainError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Something went wrong.' }, { status });
}

/** GET /api/shipments?as=<company for admins> → incoming, batches you hold, history, ledger status */
export async function GET(request: NextRequest) {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Log in to see shipments.' }, { status: 401 });
    try {
        const company = actingCompany(user, request.nextUrl.searchParams.get('as'));
        return NextResponse.json(overview(user, company));
    } catch (e) { return fail(e); }
}

/**
 * POST /api/shipments
 *   { action: 'send', batchId, to, location, as? }
 *   { action: 'receive', batchId, shipmentId, as? }
 * Who you are comes from your login token, not from the request body.
 */
export async function POST(request: NextRequest) {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Log in to record shipments.' }, { status: 401 });
    try {
        const body = await request.json();
        const company = actingCompany(user, body.as);
        const entry = body.action === 'receive'
            ? receive(user, company, String(body.batchId ?? ''), String(body.shipmentId ?? ''))
            : send(user, company, String(body.batchId ?? ''), String(body.to ?? ''), String(body.location ?? ''));
        return NextResponse.json({ entry, ...overview(user, company) });
    } catch (e) { return fail(e); }
}
