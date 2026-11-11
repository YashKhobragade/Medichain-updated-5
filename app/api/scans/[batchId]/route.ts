import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: { batchId: string } }
) {
    try {
        const batchId = params.batchId;

        const scans = await db.getScanHistory(batchId);

        return NextResponse.json({
            success: true,
            scans,
            count: scans.length,
        });
    } catch (error: any) {
        console.error('Error fetching scan history:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch scan history' },
            { status: 500 }
        );
    }
}
