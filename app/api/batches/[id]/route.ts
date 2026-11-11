import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const batchId = params.id;

        // Get batch details
        const batch = await db.getBatch(batchId);

        if (!batch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        // Get transfer history
        const transfers = await db.getTransferHistory(batchId);

        // Get scan history
        const scans = await db.getScanHistory(batchId);

        return NextResponse.json({
            success: true,
            batch,
            transfers,
            scans,
            scanCount: scans.length,
        });
    } catch (error: any) {
        console.error('Error fetching batch:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch batch' },
            { status: 500 }
        );
    }
}
