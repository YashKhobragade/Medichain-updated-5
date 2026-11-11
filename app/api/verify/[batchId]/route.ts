import { localBatches } from '@/lib/localBatches';
import { NextRequest, NextResponse } from 'next/server';
import { DEMO_BATCHES, DEMO_PRODUCTS, DEMO_TRANSFERS, DEMO_SHIPMENTS } from '@/utils/demo';
import { localRecord } from '@/lib/ledger';
import { batchKey, explorerTxUrl, getReceipt } from '@/lib/chainTx';
import { verifyRecord } from '@/lib/verification';

// Build lookups
const PRODUCT_MAP: Record<string, typeof DEMO_PRODUCTS[0]> = {};
DEMO_PRODUCTS.forEach(p => { PRODUCT_MAP[p.id] = p; });

// Map shipment IDs to batch IDs
const SHIPMENT_TO_BATCH: Record<string, string> = {};
DEMO_SHIPMENTS.forEach(s => { SHIPMENT_TO_BATCH[s.shipment_id] = s.batch_id; });

// Map product names to first matching batch ID (lowercase)
const PRODUCT_NAME_TO_BATCH: Record<string, string> = {};
DEMO_BATCHES.forEach(b => {
    const product = PRODUCT_MAP[b.product_id];
    if (product && !PRODUCT_NAME_TO_BATCH[product.product_name.toLowerCase()]) {
        PRODUCT_NAME_TO_BATCH[product.product_name.toLowerCase()] = b.batch_id;
    }
});

interface TrustScoreInputs {
    supplyChainComplete: boolean;
    anomalyCount: number;
    expiryValid: boolean;
    transferCount: number;
}

function calculateTrustScore(inputs: TrustScoreInputs): number {
    let score = 10;
    if (inputs.supplyChainComplete) score += 40;
    score -= Math.min(inputs.anomalyCount * 10, 30);
    if (inputs.expiryValid) score += 20;
    if (inputs.transferCount >= 2 && inputs.transferCount <= 6) score += 20;
    else if (inputs.transferCount > 0) score += 10;
    if (inputs.transferCount >= 1) score += 10;
    return Math.max(0, Math.min(100, score));
}

function resolveBatchId(searchId: string): string | null {
    // 1. Direct batch ID match
    if (DEMO_BATCHES.find(b => b.batch_id === searchId)) return searchId;

    // 2. Shipment ID → batch ID
    if (SHIPMENT_TO_BATCH[searchId]) return SHIPMENT_TO_BATCH[searchId];

    // 3. Product name match (case-insensitive)
    const nameLower = searchId.toLowerCase();
    if (PRODUCT_NAME_TO_BATCH[nameLower]) return PRODUCT_NAME_TO_BATCH[nameLower];

    // 4. Partial name match
    const partialMatch = Object.keys(PRODUCT_NAME_TO_BATCH).find(name => name.includes(nameLower));
    if (partialMatch) return PRODUCT_NAME_TO_BATCH[partialMatch];

    // 5. Shipment partial match (e.g. "SHP-003" → try "SHP-003")
    const shipmentMatch = Object.keys(SHIPMENT_TO_BATCH).find(id =>
        id.toLowerCase() === searchId.toLowerCase()
    );
    if (shipmentMatch) return SHIPMENT_TO_BATCH[shipmentMatch];

    return null;
}

/**
 * Full verification for a demo batch or one created in the app, built from
 * the same record the scanner and bulk verify use: built-in history plus the
 * shipment ledger, with public-blockchain receipts where they exist.
 */
function batchPayload(batchId: string) {
    const rec = localRecord(batchId);
    if (!rec) return null;
    const demo = DEMO_BATCHES.find(b => b.batch_id === rec.batchId);
    const local = localBatches().find((b: any) => String(b.batch_id).toUpperCase() === rec.batchId.toUpperCase());
    const product = demo ? PRODUCT_MAP[demo.product_id] : undefined;
    const created = getReceipt(batchKey(rec.batchId));

    const result = verifyRecord(rec, rec.batchId);
    const batchData = {
        batch_id: rec.batchId,
        product_id: demo?.product_id ?? local?.product_id,
        product_name: rec.productName,
        product_category: product?.category || local?.product_category || 'Pharmaceutical',
        sku: product?.sku || local?.sku || '—',
        description: product?.description || '',
        manufacturer_address: rec.manufacturer,
        manufacturer_name: rec.manufacturer,
        quantity: rec.quantity,
        production_date: demo?.production_date ?? local?.production_date,
        manufacturing_date: demo?.production_date ?? local?.production_date,
        expiry_date: rec.expiryDate,
        origin_location: demo?.origin_location || local?.origin_location || '—',
        status: rec.flagged ? 'FLAGGED' : rec.custody.length === 0 ? 'CREATED'
            : rec.custody[rec.custody.length - 1].status === 'In Transit' ? 'IN_TRANSIT' : 'DELIVERED',
        trust_score: result.trustScore,
        created_tx_url: created ? explorerTxUrl(created) : null,
        created_at: (demo?.production_date ? demo.production_date + 'T00:00:00Z' : local?.created_at) ?? null,
    };

    const transferEvents = rec.custody.map((t, i) => ({
        id: `${rec.batchId}-${i}`,
        batch_id: rec.batchId,
        event_type: 'TRANSFERRED',
        from_role: t.from,
        to_role: t.to,
        to_address: `${t.from} → ${t.to}`,
        stage: t.to,
        location: t.location,
        timestamp: t.timestamp,
        in_transit: t.status === 'In Transit',
        ledger_hash: t.txHash,
        chain_tx: t.chainTx ?? null,
        chain_url: t.chainUrl ?? null,
        is_anomaly: t.fromType === 'Unknown' || t.toType === 'Unknown',
    }));

    // Three-stage journey for the verify page: where the batch has been and where it is now
    const stageOf = (t: string) => (t === 'Manufacturer' ? 0 : t === 'Pharmacy' || t === 'Hospital' ? 2 : t === 'Unknown' ? -1 : 1);
    const reached = result.journey?.inTransitTo ? result.path.slice(0, -1) : result.path;
    const holderStage = stageOf(result.journey?.holderType ?? 'Manufacturer');
    const goingTo = result.journey?.inTransitTo ? stageOf(result.path[result.path.length - 1]?.type ?? '') : -1;
    const stages = ['Manufacturer', 'Distributor', 'Pharmacy / Hospital'].map((label, i) => {
        const here = reached.filter(p => stageOf(p.type) === i);
        const name = (i === 1 ? here.find(p => p.type === 'Distributor') : undefined)?.name ?? here[here.length - 1]?.name ?? null;
        const state = result.journey?.complete || (here.length && holderStage > i) ? 'done'
            : here.length && holderStage === i ? (goingTo > i || i === 2 ? 'done' : 'here')
            : goingTo === i ? 'transit' : 'pending';
        return { label, name: name ?? (goingTo === i ? result.path[result.path.length - 1]?.name : null), state };
    });

    const status = result.verdict === 'not_found' ? 'counterfeit' : result.verdict;
    const warnings = result.checks.filter(c => c.outcome === 'fail' || c.outcome === 'warn').map(c => c.detail);
    const handoff = result.checks.find(c => c.id === 'handoffs');
    const missingLink = handoff && handoff.outcome !== 'pass' && handoff.outcome !== 'skip' ? 'distributor' : null;
    const expiryValid = !result.checks.some(c => c.id === 'expiry' && c.outcome === 'fail');
    const supplyChainComplete = !result.checks.some(c => (c.id === 'custody' || c.id === 'handoffs') && c.outcome === 'fail');

    return {
        success: true,
        batch: batchData,
        transfers: transferEvents,
        events: transferEvents,
        scans: [],
        checks: result.checks,
        summary: result.summary,
        journey: result.journey ? { ...result.journey, stages } : null,
        verification: {
            status, trustScore: result.trustScore, warnings, missingLink, isExpired: !expiryValid, supplyChainComplete,
            scanCount: 0, anomalies: transferEvents.filter(e => e.is_anomaly).length, duplicateScans: 0,
        },
    };
}

export async function POST(
    request: NextRequest,
    { params }: { params: { batchId: string } }
) {
    try {
        const searchId = params.batchId;

        // Try database first
        try {
            const { db } = await import('@/lib/database');
            const batch = await db.getBatch(searchId);
            if (batch) {
                const events = await db.getTrackingHistory(searchId);
                const scans = events.filter(e => e.event_type === 'SCANNED');
                const transfers = events.filter(e => e.event_type !== 'SCANNED');
                const stages = events.map(t => t.stage.toLowerCase());
                const hasLogistics = stages.some(s => s.includes('logistic') || s.includes('distributor'));
                const hasVendor = stages.some(s => s.includes('vendor') || s.includes('retailer'));
                const supplyChainComplete = hasLogistics && hasVendor;
                const anomalies = events.filter(e => e.is_anomaly).length;
                let expiryValid = true;
                if (batch.expiry_date) expiryValid = new Date(batch.expiry_date) > new Date();
                const trustScore = calculateTrustScore({ supplyChainComplete, anomalyCount: anomalies, expiryValid, transferCount: transfers.length });
                await db.updateTrustScore(searchId, trustScore);

                let status: 'genuine' | 'suspicious' | 'counterfeit' = 'genuine';
                const warnings: string[] = [];
                if (anomalies > 0) { status = 'suspicious'; warnings.push(`${anomalies} anomalies detected`); }
                if (!expiryValid) { status = 'counterfeit'; warnings.push('Batch has expired'); }
                if (!supplyChainComplete && transfers.length > 0) { status = 'suspicious'; warnings.push('Incomplete supply chain'); }
                if (trustScore < 50) status = 'counterfeit';
                else if (trustScore < 70 && status === 'genuine') status = 'suspicious';

                await db.recordEvent({
                    event_type: 'SCANNED', batch_id: searchId, stage: 'System', is_anomaly: status === 'counterfeit',
                    metadata: { action: 'Verification Performed', trust_score: trustScore, status, warnings },
                });

                return NextResponse.json({
                    success: true, batch, transfers, events, scans,
                    verification: { status, trustScore, warnings, missingLink: null, isExpired: !expiryValid, supplyChainComplete, scanCount: scans.length, anomalies },
                });
            }
        } catch (dbError) {
            console.log('DB unavailable, using demo data');
        }

        // Resolve search ID to a batch ID (handles SHP-xxx, product names, etc.)
        const resolvedBatchId = resolveBatchId(searchId);

        // Batches created in the app (saved to data/batches.json)
        const created = localBatches().find((b: any) => [searchId, resolvedBatchId].filter(Boolean).some(id => String(b.batch_id).toUpperCase() === String(id).toUpperCase()));
        if (created) return NextResponse.json(batchPayload(created.batch_id));

        if (!resolvedBatchId) {
            // Build helpful error message
            const availableProducts = DEMO_PRODUCTS.map(p => p.product_name).join(', ');
            return NextResponse.json({
                error: `Product or batch "${searchId}" not found. Try searching by:\n• Medicine name: Paracetamol 500mg, Amoxicillin 250mg, etc.\n• Batch ID: BAT-MED-001, BAT-MED-005, BAT-MED-008\n• Shipment ID: SHP-001, SHP-002, SHP-003`
            }, { status: 404 });
        }

        const demoResult = batchPayload(resolvedBatchId);
        if (!demoResult) {
            return NextResponse.json({ error: `Could not load data for batch ${resolvedBatchId}` }, { status: 404 });
        }

        return NextResponse.json(demoResult);

    } catch (error: any) {
        console.error('Error verifying batch:', error);
        return NextResponse.json({ error: error.message || 'Failed to verify batch' }, { status: 500 });
    }
}
