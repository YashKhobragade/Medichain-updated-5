import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { DEMO_BATCHES } from '@/utils/demo';
import { demoRecord } from '@/lib/ledger';
import { verifyRecord } from '@/lib/verification';

/** No database: same figures computed from the bundled demo ledger. */
function demoAnalytics() {
    const results = DEMO_BATCHES.map(b => verifyRecord(demoRecord(b.batch_id), b.batch_id));
    const bad = results.filter(r => r.verdict !== 'genuine');
    const events = bad.map(r => ({
        event_type: r.verdict === 'counterfeit' ? 'COUNTERFEIT_DETECTED' : r.verdict === 'expired' ? 'EXPIRED' : 'SUSPICIOUS_CHAIN',
        batch_id: r.batchId, product_name: r.productName, details: r.summary, timestamp: new Date().toISOString(),
    }));
    return {
        totalBatches: results.length,
        flaggedBatches: results.filter(r => r.verdict === 'counterfeit').length,
        lowTrustBatches: results.filter(r => r.trustScore < 50).length,
        counterfeitAttempts: events.length,
        eventCounts: events.reduce((a, e) => ({ ...a, [e.event_type]: (a[e.event_type] ?? 0) + 1 }), {} as Record<string, number>),
        manufacturerRankings: [],
        recentEvents: events.slice(0, 10),
    };
}

export async function GET() {
    try {
        // Get counterfeit attempts
        const counterfeitEvents = await db.getCounterfeitAttempts();

        // Get all batches for statistics
        const allBatches = await db.listBatches();

        // Calculate statistics
        const totalBatches = allBatches.length;
        const flaggedBatches = allBatches.filter(b => b.status === 'FLAGGED').length;
        const lowTrustBatches = allBatches.filter(b => b.trust_score < 50).length;

        // Group by event type
        const eventCounts = counterfeitEvents.reduce((acc, event) => {
            acc[event.event_type] = (acc[event.event_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Get manufacturer trust rankings
        const manufacturerStats = allBatches.reduce((acc, batch) => {
            if (!acc[batch.manufacturer_address]) {
                acc[batch.manufacturer_address] = {
                    address: batch.manufacturer_address,
                    totalBatches: 0,
                    avgTrustScore: 0,
                    flaggedCount: 0,
                };
            }

            acc[batch.manufacturer_address].totalBatches++;
            acc[batch.manufacturer_address].avgTrustScore += batch.trust_score;
            if (batch.status === 'FLAGGED') {
                acc[batch.manufacturer_address].flaggedCount++;
            }

            return acc;
        }, {} as Record<string, any>);

        // Calculate averages
        Object.values(manufacturerStats).forEach((stat: any) => {
            stat.avgTrustScore = Math.round(stat.avgTrustScore / stat.totalBatches);
        });

        const manufacturerRankings = Object.values(manufacturerStats)
            .sort((a: any, b: any) => b.avgTrustScore - a.avgTrustScore);

        return NextResponse.json({
            success: true,
            analytics: {
                totalBatches,
                flaggedBatches,
                lowTrustBatches,
                counterfeitAttempts: counterfeitEvents.length,
                eventCounts,
                manufacturerRankings,
                recentEvents: counterfeitEvents.slice(0, 10),
            },
        });
    } catch (error: any) {
        // Database not available (normal for local demos): fall back to the demo ledger
        const analytics = demoAnalytics();
        return NextResponse.json({ success: true, source: 'demo', analytics, events: analytics.recentEvents });
    }
}
