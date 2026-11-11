import { NextRequest, NextResponse } from 'next/server';
import { openLedger } from '@/lib/ledger';
import { parseBatchCode } from '@/lib/batchCode';
import { verifyRecord, VERDICT_SEVERITY } from '@/lib/verification';
import { isCopied, type ScanGroup, type ScannedCode } from '@/lib/scanTypes';

export const dynamic = 'force-dynamic';

const ML_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const NOT_RUNNING = 'The scanner service is not running. In a second terminal run: cd ml-service && python main.py';

/** GET /api/scan → is the ML service up? */
export async function GET() {
    try {
        const res = await fetch(`${ML_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        return NextResponse.json({ ready: res.ok, ...data });
    } catch {
        return NextResponse.json({ ready: false, error: NOT_RUNNING });
    }
}

/**
 * POST /api/scan (multipart "image") → batches found and checked
 * ?mode=live for camera frames (faster), default photo
 */
export async function POST(request: NextRequest) {
    const mode = request.nextUrl.searchParams.get('mode') === 'live' ? 'live' : 'photo';
    const form = await request.formData().catch(() => null);
    const image = form?.get('image');
    if (!(image instanceof File)) {
        return NextResponse.json({ error: 'Attach a photo in the "image" field.' }, { status: 400 });
    }

    // 1. Machine learning: find and read every QR code in the picture
    let ml: { width: number; height: number; codes: { text: string; points: number[][] }[]; ms: number };
    try {
        const body = new FormData();
        body.append('image', image, image.name || 'photo.jpg');
        const res = await fetch(`${ML_URL}/scan?mode=${mode}`, { method: 'POST', body, signal: AbortSignal.timeout(mode === 'live' ? 10000 : 60000) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return NextResponse.json({ error: data.detail || 'The scanner could not read that photo.' }, { status: 422 });
        ml = data;
    } catch {
        return NextResponse.json({ error: NOT_RUNNING }, { status: 503 });
    }

    // 2. Which batch does each QR belong to?
    const unrecognised: { text: string; points: number[][] }[] = [];
    const codes: ScannedCode[] = [];
    ml.codes.forEach((c, i) => {
        const batchId = parseBatchCode(c.text);
        if (batchId) codes.push({ id: i, text: c.text, points: c.points, batchId, status: 'ok' });
        else unrecognised.push(c);
    });

    // 3. Check each batch once on the ledger; the same QR twice means a copy
    const ledger = await openLedger();
    const counts = new Map<string, number>();
    codes.forEach(c => counts.set(c.batchId, (counts.get(c.batchId) ?? 0) + 1));
    codes.forEach(c => { if ((counts.get(c.batchId) ?? 0) > 1) c.status = 'copy'; });

    const groups: ScanGroup[] = [];
    for (const [batchId, count] of Array.from(counts.entries())) {
        groups.push({ batchId, count, verification: verifyRecord(await ledger.lookup(batchId), batchId) });
    }
    const attention = (g: ScanGroup) => g.verification.verdict !== 'genuine' || isCopied(g);
    groups.sort((a, b) =>
        Number(attention(b)) - Number(attention(a))
        || VERDICT_SEVERITY[a.verification.verdict] - VERDICT_SEVERITY[b.verification.verdict]
        || (a.verification.productName ?? '').localeCompare(b.verification.productName ?? ''));

    return NextResponse.json({
        width: ml.width,
        height: ml.height,
        ms: ml.ms,
        codes,
        unrecognised,
        groups,
        totals: {
            boxes: codes.length,
            batches: groups.length,
            needAttention: groups.filter(attention).length,
            // stock on the shelf: each real box counted once, from its ledger quantity
            units: groups.reduce((t, g) => t + (g.verification.quantity ?? 0), 0),
        },
        source: ledger.usingDatabase ? 'database' : 'demo',
    });
}
