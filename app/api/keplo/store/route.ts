import { NextRequest, NextResponse } from 'next/server';
import { keplo } from '@/services/keplo';

export async function POST(request: NextRequest) {
    try {
        const { batchId, temperature, humidity, location } = await request.json();

        if (!batchId) {
            return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
        }

        // Store data to Keplo
        const proof = await keplo.storeData({
            batchId,
            temperature,
            humidity,
            location,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            proof: {
                hash: proof.hash,
                signature: proof.signature,
                timestamp: proof.timestamp,
            },
        });
    } catch (error: any) {
        console.error('Error storing to Keplo:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to store data' },
            { status: 500 }
        );
    }
}
