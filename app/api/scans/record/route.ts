import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
    try {
        const {
            batch_id,
            scanner_address,
            geo_hash,
            ip_address,
            qr_nonce,
            scan_location,
        } = await request.json();

        if (!batch_id) {
            return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
        }

        // Check if batch exists
        const batch = await db.getBatch(batch_id);
        if (!batch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        // Get previous scans
        const previousScans = await db.getScanHistory(batch_id);

        // Check for duplicate scans (same geo_hash within 1 hour)
        const recentScans = previousScans.filter(scan => {
            const scanTime = new Date(scan.timestamp).getTime();
            const now = Date.now();
            return (now - scanTime) < 3600000; // 1 hour
        });

        const duplicateScan = recentScans.find(scan => scan.metadata?.geo_hash === geo_hash);

        if (duplicateScan) {
            // Log suspicious activity
            await db.logEvent({
                event_type: 'DUPLICATE_SCAN',
                batch_id,
                details: {
                    geo_hash,
                    previous_scan: duplicateScan.id,
                    time_diff: Date.now() - new Date(duplicateScan.timestamp).getTime(),
                },
                severity: 'WARNING',
            });
        }

        // Record the scan
        const scan = await db.recordScan({
            batch_id,
            scanner_address,
            geo_hash,
            ip_address,
            qr_nonce,
            is_valid: !duplicateScan,
            scan_location,
        });

        // Update trust score if duplicate detected
        if (duplicateScan) {
            const newTrustScore = Math.max(0, batch.trust_score - 10);
            await db.updateTrustScore(batch_id, newTrustScore);
        }

        return NextResponse.json({
            success: true,
            scan,
            isDuplicate: !!duplicateScan,
            scanCount: previousScans.length + 1,
        });
    } catch (error: any) {
        console.error('Error recording scan:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to record scan' },
            { status: 500 }
        );
    }
}
