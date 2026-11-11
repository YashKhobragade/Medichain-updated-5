// Parsing for bulk verification uploads: CSV, TSV, Excel or pasted text.
import Papa from 'papaparse';

export type FieldKey = 'batchId' | 'productName' | 'expiry' | 'quantity';

export const FIELDS: { key: FieldKey; label: string; required?: boolean; hint: string }[] = [
    { key: 'batchId', label: 'Batch ID', required: true, hint: 'Printed on the pack or in the QR code' },
    { key: 'productName', label: 'Medicine name', hint: 'What the pack says it is — checked against the ledger' },
    { key: 'expiry', label: 'Expiry', hint: 'As printed, e.g. 08/2027 — checked against the ledger' },
    { key: 'quantity', label: 'Quantity', hint: 'Units received — appears in the report' },
];

const SYNONYMS: Record<FieldKey, string[]> = {
    batchId: ['batchid', 'batch', 'batchno', 'batchnumber', 'lot', 'lotno', 'lotnumber', 'id', 'qr', 'qrcode'],
    productName: ['productname', 'product', 'medicine', 'medicinename', 'drug', 'drugname', 'item', 'itemname', 'name', 'description', 'brand'],
    expiry: ['expiry', 'expirydate', 'exp', 'expdate', 'expires', 'expiration', 'expirationdate', 'bestbefore', 'useby'],
    quantity: ['boxes', 'noofboxes', 'boxcount', 'quantity', 'qty', 'units', 'count', 'packs', 'noofunits', 'receivedqty'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const looksLikeBatchId = (v: string) => /^[A-Za-z]{2,}[-_/]?[A-Za-z0-9-_/]*\d/.test(v.trim());

export interface ParsedTable {
    columns: string[];
    rows: string[][];
    hasHeader: boolean;
    mapping: Partial<Record<FieldKey, number>>;
    skippedBlank: number;
}

function detectMapping(columns: string[], rows: string[][], hasHeader: boolean): Partial<Record<FieldKey, number>> {
    const mapping: Partial<Record<FieldKey, number>> = {};
    if (hasHeader) {
        const used = new Set<number>();
        for (const f of Object.keys(SYNONYMS) as FieldKey[]) {
            // Exact synonym match first, then "contains" (e.g. "Batch No.")
            let idx = columns.findIndex((c, i) => !used.has(i) && SYNONYMS[f].includes(norm(c)));
            if (idx < 0) idx = columns.findIndex((c, i) => !used.has(i) && SYNONYMS[f].some(s => s.length > 3 && norm(c).includes(s)));
            if (idx >= 0) { mapping[f] = idx; used.add(idx); }
        }
    }
    if (mapping.batchId === undefined) {
        // No header (or no obvious one): pick the column that mostly looks like batch IDs
        const sample = rows.slice(0, 20);
        let best = 0, bestScore = -1;
        columns.forEach((_, i) => {
            const score = sample.filter(r => looksLikeBatchId(r[i] ?? '')).length;
            if (score > bestScore) { best = i; bestScore = score; }
        });
        mapping.batchId = best;
    }
    return mapping;
}

export function parseDelimited(text: string): ParsedTable {
    const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { skipEmptyLines: false });
    let data = parsed.data.map(r => r.map(c => (c ?? '').toString().trim()));
    const before = data.length;
    data = data.filter(r => r.some(c => c !== ''));
    const skippedBlank = Math.max(0, before - data.length - (text.endsWith('\n') ? 1 : 0));
    if (data.length === 0) return { columns: [], rows: [], hasHeader: false, mapping: {}, skippedBlank };

    const first = data[0];
    const hasHeader = first.some(c => Object.values(SYNONYMS).some(list => list.includes(norm(c))))
        || (!first.some(looksLikeBatchId) && data.length > 1 && data.slice(1, 6).some(r => r.some(looksLikeBatchId)));
    const width = Math.max(...data.map(r => r.length));
    const columns = hasHeader
        ? Array.from({ length: width }, (_, i) => first[i] || `Column ${i + 1}`)
        : Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
    const rows = (hasHeader ? data.slice(1) : data).map(r => Array.from({ length: width }, (_, i) => r[i] ?? ''));
    return { columns, rows, hasHeader, mapping: detectMapping(columns, rows, hasHeader), skippedBlank };
}

/** Pasted text: one batch per line, or a pasted spreadsheet range (tabs). */
export function parsePasted(text: string): ParsedTable {
    const trimmed = text.trim();
    if (!trimmed) return { columns: [], rows: [], hasHeader: false, mapping: {}, skippedBlank: 0 };
    if (/[\t,;]/.test(trimmed.split('\n')[0])) return parseDelimited(trimmed);
    // Whitespace-separated list of IDs
    const ids = trimmed.split(/\s+/).filter(Boolean);
    return { columns: ['Batch ID'], rows: ids.map(i => [i]), hasHeader: false, mapping: { batchId: 0 }, skippedBlank: 0 };
}

export async function parseFile(file: File): Promise<ParsedTable> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        // dateNF keeps expiry cells readable instead of Excel serial numbers
        return parseDelimited(XLSX.utils.sheet_to_csv(sheet, { dateNF: 'yyyy-mm-dd' }));
    }
    return parseDelimited(await file.text());
}

export interface RowInput { row: number; batchId: string; productName?: string; expiry?: string; quantity?: number }

export function toRows(table: ParsedTable, mapping: Partial<Record<FieldKey, number>>): RowInput[] {
    const offset = table.hasHeader ? 2 : 1; // spreadsheet row numbers people can look up
    const pick = (r: string[], k: FieldKey) => (mapping[k] === undefined ? undefined : (r[mapping[k]!] || undefined));
    return table.rows
        .map((r, i) => {
            const qty = pick(r, 'quantity');
            const n = qty ? Number(qty.replace(/[, ]/g, '')) : undefined;
            return {
                row: i + offset,
                batchId: (pick(r, 'batchId') ?? '').trim(),
                productName: pick(r, 'productName'),
                expiry: pick(r, 'expiry'),
                quantity: n !== undefined && Number.isFinite(n) ? n : undefined,
            };
        })
        .filter(r => r.batchId);
}

export const SAMPLE_CSV = `batch_id,product_name,expiry,quantity
BAT-MED-001,Paracetamol 500mg,10/2028,200
BAT-MED-005,Amoxicillin 500mg,09/2027,120
BAT-MED-010,Omeprazole 20mg,11/2027,80
BAT-MED-016,Cetirizine 10mg,12/2026,60
BAT-MED-012,Atorvastatin 10mg,12/2028,90
BAT-MED-012,Atorvastatin 10mg,12/2028,30
BAT-MED-011,Ibuprofen 400mg,06/2028,100
BAT-MED-008,Paracetamol 500mg,08/2027,50
BAT-MED-007,InsulinPen FlexiDose,08/2026,24
BAT-MED-SUS-001,Azithromycin 500mg,08/2027,60
BAT-MED-999,Paracetamol 500mg,03/2028,40
`;
