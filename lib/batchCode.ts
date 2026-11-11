// ============================================================
// Batch QR codes
// ------------------------------------------------------------
// One batch = one box = one QR code. The QR holds a small JSON
// object that any phone (e.g. Google Lens) shows as text:
//     {"id":"MED-123","name":"Pantocid","by":"Midas","mfg":"10/2026","exp":"09/2028"}
// It is kept short (short keys, month/year dates, company name cut
// to 20 letters) so the code stays easy to read from a distance;
// tested with the inventory scanner. Verify, Inventory Scan and Bulk
// Verify read the batch ID from "id". Older link codes still work.
// ============================================================

const BATCH_RE = '([A-Za-z]{2,}-[A-Za-z0-9-]*[A-Za-z0-9])';

export function batchQrUrl(origin: string, batchId: string) {
    return `${origin.replace(/\/$/, '')}/verify/${encodeURIComponent(batchId)}`;
}

export interface QrDetails { productName?: string; manufacturer?: string; productionDate?: string; expiryDate?: string }

const monthYear = (d?: string) => d && !isNaN(Date.parse(d))
    ? new Date(d).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : undefined;

/** What goes inside a batch's QR code. */
export function batchQrJson(batchId: string, d: QrDetails = {}) {
    const by = (d.manufacturer || '').length > 20 ? (d.manufacturer || '').slice(0, 20).replace(/\s+\S*$/, '') : d.manufacturer;
    return JSON.stringify({ id: batchId, name: d.productName || undefined, by: by || undefined, mfg: monthYear(d.productionDate), exp: monthYear(d.expiryDate) });
}

/** Returns the batch ID inside a scanned QR, or null if it isn't a MediChain code. */
export function parseBatchCode(raw: string): string | null {
    const text = raw.trim();
    if (!text) return null;
    if (text.startsWith('{')) {
        try {
            const j = JSON.parse(text);
            const id = j.id || j.batchId || j.batch_id;
            return id ? String(id).toUpperCase() : null;
        } catch {
            return null;
        }
    }
    const m = text.match(new RegExp(`/verify/${BATCH_RE}(?:[/?#]|$)`)) ?? text.match(new RegExp(`^${BATCH_RE}$`));
    return m ? decodeURIComponent(m[1]).toUpperCase() : null;
}
