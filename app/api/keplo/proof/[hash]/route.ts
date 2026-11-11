import { NextRequest, NextResponse } from 'next/server';
import { keplo } from '@/services/keplo';

export async function GET(
    request: NextRequest,
    { params }: { params: { hash: string } }
) {
    try {
        const hash = params.hash;

        const proof = await keplo.getProof(hash);

        if (!proof) {
            return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            proof,
        });
    } catch (error: any) {
        console.error('Error retrieving proof:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to retrieve proof' },
            { status: 500 }
        );
    }
}
