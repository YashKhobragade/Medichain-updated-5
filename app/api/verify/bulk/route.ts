import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { openLedger } from '@/lib/ledger';
import { parseBatchCode } from '@/lib/batchCode';
import { verifyRecord, type PackClaims, type Verdict, type VerificationResult } from '@/lib/verification';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 5000;

interface InputRow extends PackClaims {
    batchId: string;
    row?: number;
}

const ID_HEADERS = ['batchid', 'batch_id', 'batch', 'batchno', 'batch_no', 'batchnumber', 'batch_number', 'lot', 'lotno', 'id'];

/** Legacy path: multipart upload of a raw CSV with a batch ID column. */
async function rowsFromFile(file: File): Promise<InputRow[]> {
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
        header: true, skipEmptyLines: true, transformHeader: h => h.trim(),
    });
    const headers = parsed.meta.fields ?? [];
    const idCol = headers.find(h => ID_HEADERS.includes(h.toLowerCase().replace(/[\s-]/g, '')));
    if (!idCol) throw new Error(`No batch ID column found. Columns in file: ${headers.join(', ') || 'none'}.`);
    return parsed.data
        .map((r, i) => ({ batchId: (r[idCol] ?? '').trim(), row: i + 2 }))
        .filter(r => r.batchId);
}

export async function POST(request: NextRequest) {
    try {
        let rows: InputRow[];
        const contentType = request.headers.get('content-type') ?? '';

        if (contentType.includes('application/json')) {
            const body = await request.json();
            rows = Array.isArray(body?.rows) ? body.rows : [];
        } else {
            const form = await request.formData();
            const file = form.get('file');
            if (!(file instanceof File)) {
                return NextResponse.json({ error: 'Send JSON { rows: [...] } or a CSV file in the "file" field.' }, { status: 400 });
            }
            rows = await rowsFromFile(file);
        }

        rows = rows
            // a row may hold a batch ID or a scanned MediChain QR link
            .map(r => { const raw = String(r.batchId ?? '').trim(); return { ...r, batchId: raw.includes('/verify/') || raw.startsWith('{') ? (parseBatchCode(raw) ?? raw) : raw }; })
            .filter(r => r.batchId);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No batch IDs to verify.' }, { status: 400 });
        }
        if (rows.length > MAX_ROWS) {
            return NextResponse.json({ error: `That's ${rows.length.toLocaleString()} rows. Split the file into chunks of ${MAX_ROWS.toLocaleString()} or fewer.` }, { status: 413 });
        }

        // Count repeats so the engine can flag IDs listed more than once
        const counts = new Map<string, number>();
        rows.forEach(r => counts.set(r.batchId.toUpperCase(), (counts.get(r.batchId.toUpperCase()) ?? 0) + 1));

        const ledger = await openLedger();
        const now = new Date();
        const cache = new Map<string, Awaited<ReturnType<typeof ledger.lookup>>>();

        const results: VerificationResult[] = [];
        for (const r of rows) {
            const key = r.batchId.toUpperCase();
            if (!cache.has(key)) cache.set(key, await ledger.lookup(r.batchId));
            const claims: PackClaims = {
                productName: r.productName?.toString().trim() || undefined,
                expiry: r.expiry?.toString().trim() || undefined,
                quantity: r.quantity !== undefined && r.quantity !== null && `${r.quantity}` !== '' ? Number(r.quantity) : undefined,
            };
            const result = verifyRecord(cache.get(key) ?? null, r.batchId, {
                claims, duplicateCount: counts.get(key), now,
            });
            results.push({ ...result, row: r.row });
        }

        const tally = (v: Verdict) => results.filter(r => r.verdict === v).length;
        const stats = {
            total: results.length,
            unique: counts.size,
            genuine: tally('genuine'),
            suspicious: tally('suspicious'),
            expired: tally('expired'),
            counterfeit: tally('counterfeit'),
            notFound: tally('not_found'),
            nearExpiry: results.filter(r => r.verdict === 'genuine' && r.daysToExpiry !== null && r.daysToExpiry <= 90).length,
            units: results.reduce((s, r) => s + (Number.isFinite(r.claims?.quantity) ? r.claims!.quantity! : 0), 0),
        };

        return NextResponse.json({
            success: true,
            runId: `BV-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            verifiedAt: now.toISOString(),
            source: ledger.usingDatabase ? 'database' : 'demo',
            stats,
            results,
        });
    } catch (error: any) {
        console.error('Bulk verification failed:', error);
        return NextResponse.json({ error: error.message || 'Bulk verification failed.' }, { status: 500 });
    }
}
