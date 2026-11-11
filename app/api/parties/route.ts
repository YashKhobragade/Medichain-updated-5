import { NextResponse } from 'next/server';
import { registeredParties } from '@/lib/localUsers';

export const dynamic = 'force-dynamic';

/** GET /api/parties → every registered organisation (built-in + signed up), name and type only. */
export async function GET() {
    return NextResponse.json({ parties: registeredParties().map(p => ({ name: p.name, kind: p.kind })) });
}
