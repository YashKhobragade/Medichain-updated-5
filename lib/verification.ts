// ============================================================
// MediChain verification engine
// ------------------------------------------------------------
// One set of rules for every place a batch gets checked:
// single QR scans, hospital bulk uploads and stock receiving.
// Pure functions only — no DB or network access here, so this
// file is safe to import from server and client code alike.
// ============================================================

export type Verdict = 'genuine' | 'suspicious' | 'expired' | 'counterfeit' | 'not_found';
export type CheckOutcome = 'pass' | 'warn' | 'fail' | 'skip';
export type PartyType =
    | 'Manufacturer' | 'Warehouse' | 'Distributor' | 'Logistics'
    | 'Pharmacy' | 'Hospital' | 'Unknown';

export interface CustodyStep {
    from: string;
    to: string;
    fromType: PartyType;
    toType: PartyType;
    status?: string;
    timestamp?: string;
    location?: string;
    txHash?: string;
    /** public blockchain transaction (e.g. Sepolia), when this step was also written on-chain */
    chainTx?: string;
    chainUrl?: string | null;
}

/** Everything the engine needs to know about a batch, regardless of where it came from. */
export interface LedgerRecord {
    batchId: string;
    productName: string;
    manufacturer: string;
    manufacturerRegistered: boolean;
    expiryDate: string | null;
    currentStage: string;
    flagged: boolean;
    custody: CustodyStep[];
    /** true if the shipment ledger's hash chain no longer checks out */
    tampered?: boolean;
    source: 'database' | 'demo' | 'session';
    /** Units packed in the batch's box (one box and one QR per batch) */
    quantity: number | null;
}

/** What the person holding the pack can see printed on it (all optional). */
export interface PackClaims {
    productName?: string;
    expiry?: string;
    quantity?: number;
}

export interface Check {
    id: 'ledger' | 'integrity' | 'origin' | 'custody' | 'handoffs' | 'journey' | 'expiry' | 'label' | 'duplicate';
    label: string;
    outcome: CheckOutcome;
    detail: string;
}

export interface VerificationResult {
    batchId: string;
    verdict: Verdict;
    trustScore: number;
    summary: string;
    action: string;
    checks: Check[];
    productName: string | null;
    manufacturer: string | null;
    expiryDate: string | null;
    daysToExpiry: number | null;
    currentStage: string | null;
    quantity: number | null;
    /** how far the batch has travelled; the score is only 100 once this is complete */
    journey?: { complete: boolean; holder: string; holderType: PartyType; inTransitTo: string | null; detail: string };
    path: { name: string; type: PartyType }[];
    source: LedgerRecord['source'] | null;
    claims?: PackClaims;
    row?: number;
}

export const NEAR_EXPIRY_DAYS = 90;

const STAGE_ORDER: Record<string, number> = {
    manufacturer: 0, warehouse: 1, distributor: 2, logistics: 3, pharmacy: 4, hospital: 4,
};

export const VERDICT_COPY: Record<Verdict, { label: string; action: string }> = {
    genuine: { label: 'Genuine', action: 'Accept into stock' },
    suspicious: { label: 'Suspicious', action: 'Hold and query the supplier before use' },
    expired: { label: 'Expired', action: 'Do not dispense — return or destroy' },
    counterfeit: { label: 'Counterfeit', action: 'Quarantine and report to CDSCO' },
    not_found: { label: 'Not on ledger', action: 'Quarantine — no blockchain record exists' },
};

/** Lower number = more urgent. Used for default sort order. */
export const VERDICT_SEVERITY: Record<Verdict, number> = {
    counterfeit: 0, not_found: 1, expired: 2, suspicious: 3, genuine: 4,
};

// ---------- helpers ----------

function daysBetween(from: Date, to: Date) {
    return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Parse the many ways an expiry gets printed or typed:
 * 2027-08-15, 15/08/2027, 08/2027, 2027-08, Aug 2027, AUG-27.
 * Returns year + month (packs usually only print month/year).
 */
export function parseExpiry(raw: string): { year: number; month: number } | null {
    const s = raw.trim();
    if (!s) return null;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const fixYear = (y: number) => (y < 100 ? 2000 + y : y);

    let m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
    if (m) return { year: +m[1], month: +m[2] };
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/); // DD/MM/YYYY (Indian convention)
    if (m) return { year: fixYear(+m[3]), month: +m[2] };
    m = s.match(/^(\d{1,2})[-/.](\d{2,4})$/); // MM/YYYY
    if (m) return { year: fixYear(+m[2]), month: +m[1] };
    m = s.toLowerCase().match(/^([a-z]{3})[a-z]*[\s\-/.,]*(\d{2,4})$/); // Aug 2027
    if (m && months.includes(m[1])) return { year: fixYear(+m[2]), month: months.indexOf(m[1]) + 1 };
    return null;
}

function buildPath(record: LedgerRecord) {
    const path: { name: string; type: PartyType }[] = [
        { name: record.manufacturer, type: record.manufacturerRegistered ? 'Manufacturer' : 'Unknown' },
    ];
    for (const step of record.custody) {
        const last = path[path.length - 1];
        if (last.name !== step.from) path.push({ name: step.from, type: step.fromType });
        path.push({ name: step.to, type: step.toType });
    }
    return path;
}

// ---------- the engine ----------

export function verifyRecord(
    record: LedgerRecord | null,
    batchId: string,
    opts: { claims?: PackClaims; duplicateCount?: number; now?: Date } = {},
): VerificationResult {
    const now = opts.now ?? new Date();
    const checks: Check[] = [];

    if (!record) {
        checks.push({ id: 'ledger', label: 'Registered on ledger', outcome: 'fail', detail: 'No batch with this ID has ever been registered.' });
        return {
            batchId, verdict: 'not_found', trustScore: 0,
            summary: 'This batch ID does not exist on the ledger.',
            action: VERDICT_COPY.not_found.action,
            checks, productName: null, manufacturer: null, expiryDate: null, daysToExpiry: null,
            currentStage: null, quantity: null, path: [], source: null, claims: opts.claims,
        };
    }

    checks.push({ id: 'ledger', label: 'Registered on ledger', outcome: 'pass', detail: `Found in ${record.source === 'database' ? 'the MediChain database' : record.source === 'session' ? 'batches created this session' : 'the demo ledger'}.` });

    // 0. Ledger integrity: every entry must still match its hash
    if (record.tampered) {
        checks.push({ id: 'integrity', label: 'Ledger untampered', outcome: 'fail', detail: 'The shipment ledger has been edited: its hash chain no longer matches, so this history cannot be trusted.' });
    } else if (record.custody.length) {
        checks.push({ id: 'integrity', label: 'Ledger untampered', outcome: 'pass', detail: 'Every shipment record still matches its SHA-256 hash.' });
    }

    // 1. Origin
    const unknownParties = record.custody.flatMap(s => [
        s.fromType === 'Unknown' ? s.from : null,
        s.toType === 'Unknown' ? s.to : null,
    ]).filter(Boolean) as string[];

    if (record.flagged || !record.manufacturerRegistered) {
        checks.push({
            id: 'origin', label: 'Licensed manufacturer', outcome: 'fail',
            detail: record.flagged
                ? 'The batch has been flagged on-chain for a suspicious origin.'
                : `"${record.manufacturer}" is not a registered manufacturer.`,
        });
    } else {
        checks.push({ id: 'origin', label: 'Licensed manufacturer', outcome: 'pass', detail: `${record.manufacturer} is a registered manufacturer.` });
    }

    // 2. Custody continuity — every hand-off must start where the previous one ended
    let custodyOutcome: CheckOutcome = 'pass';
    let custodyDetail = `${record.custody.length} hand-off${record.custody.length === 1 ? '' : 's'}, each signed by the previous holder.`;
    if (unknownParties.length) {
        custodyOutcome = 'fail';
        custodyDetail = `Unregistered part${unknownParties.length > 1 ? 'ies' : 'y'} in the chain: ${Array.from(new Set(unknownParties)).join(', ')}.`;
    } else if (record.custody.length === 0) {
        const stageIdx = STAGE_ORDER[record.currentStage.toLowerCase()] ?? 0;
        if (stageIdx > 0) {
            custodyOutcome = 'fail';
            custodyDetail = `Batch claims to be at ${record.currentStage} but no hand-off was ever recorded.`;
        } else {
            custodyOutcome = 'skip';
            custodyDetail = 'Still with the manufacturer — nothing to check yet.';
        }
    } else {
        let holder = record.manufacturer;
        for (const step of record.custody) {
            if (normalise(step.from) !== normalise(holder)) {
                custodyOutcome = 'fail';
                custodyDetail = `Gap in custody: the ledger shows ${holder} holding it, then ${step.from} passing it on. Nobody recorded how it got from one to the other.`;
                break;
            }
            holder = step.to;
        }
    }
    checks.push({ id: 'custody', label: 'Unbroken custody', outcome: custodyOutcome, detail: custodyDetail });

    // 3. Route. Any route is allowed as long as every hand-off is recorded (check 2).
    //    Skipping a distributor is legitimate (e.g. hospitals buying direct), so it's
    //    only a note, not a failure.
    const path = buildPath(record);
    const types = path.map(p => p.type);
    const reachedDispenser = types.includes('Pharmacy') || types.includes('Hospital');
    const hasDistributor = types.includes('Distributor');
    if (reachedDispenser && !hasDistributor) {
        checks.push({ id: 'handoffs', label: 'Route', outcome: 'warn', detail: 'Went from manufacturer to dispenser without a distributor. Normal for direct purchases; worth confirming otherwise.' });
    } else if (reachedDispenser) {
        checks.push({ id: 'handoffs', label: 'Route', outcome: 'pass', detail: `Distributed by ${path.find(p => p.type === 'Distributor')?.name}.` });
    } else {
        checks.push({ id: 'handoffs', label: 'Route', outcome: 'skip', detail: 'Not yet at a pharmacy or hospital.' });
    }

    // 4. Expiry
    let daysToExpiry: number | null = null;
    if (record.expiryDate) {
        daysToExpiry = daysBetween(now, new Date(record.expiryDate));
        if (daysToExpiry < 0) {
            checks.push({ id: 'expiry', label: 'In date', outcome: 'fail', detail: `Expired ${Math.abs(daysToExpiry)} days ago (${record.expiryDate.slice(0, 10)}).` });
        } else if (daysToExpiry <= NEAR_EXPIRY_DAYS) {
            checks.push({ id: 'expiry', label: 'In date', outcome: 'warn', detail: `Expires in ${daysToExpiry} days (${record.expiryDate.slice(0, 10)}). Use first.` });
        } else {
            checks.push({ id: 'expiry', label: 'In date', outcome: 'pass', detail: `Expires ${record.expiryDate.slice(0, 10)}.` });
        }
    } else {
        checks.push({ id: 'expiry', label: 'In date', outcome: 'warn', detail: 'No expiry date on the ledger.' });
    }

    // 5. Pack details vs ledger (catches relabelled or repackaged stock)
    const claims = opts.claims;
    if (claims && (claims.productName || claims.expiry)) {
        const problems: string[] = [];
        if (claims.productName) {
            const a = normalise(claims.productName), b = normalise(record.productName);
            if (!(a.includes(b) || b.includes(a))) problems.push(`pack says "${claims.productName}", ledger says "${record.productName}"`);
        }
        if (claims.expiry && record.expiryDate) {
            const printed = parseExpiry(claims.expiry);
            const ledger = new Date(record.expiryDate);
            if (!printed) problems.push(`couldn't read expiry "${claims.expiry}"`);
            else if (printed.year !== ledger.getUTCFullYear() || printed.month !== ledger.getUTCMonth() + 1) {
                problems.push(`pack expiry ${String(printed.month).padStart(2, '0')}/${printed.year} vs ledger ${record.expiryDate.slice(0, 7)}`);
            }
        }
        checks.push(problems.length
            ? { id: 'label', label: 'Pack matches ledger', outcome: 'fail', detail: `Mismatch: ${problems.join('; ')}. Possible relabelling.` }
            : { id: 'label', label: 'Pack matches ledger', outcome: 'pass', detail: 'Printed details match the ledger.' });
    }

    // 6. Same ID listed more than once in one upload
    if (opts.duplicateCount && opts.duplicateCount > 1) {
        checks.push({ id: 'duplicate', label: 'Listed once', outcome: 'warn', detail: `This batch ID appears ${opts.duplicateCount} times in the file. Fine for split deliveries; check if unexpected.` });
    }

    // 4. Journey. 100 is reserved for a batch that has completed the chain in order:
    //    manufacturer → distributor → pharmacy/hospital, with the last hand-off received.
    //    An unfinished journey is not suspicious (outcome 'skip'), it just caps the score.
    const lastStep = record.custody[record.custody.length - 1];
    const lastReceived = !lastStep || lastStep.status !== 'In Transit';
    const rank = (t: PartyType) => STAGE_ORDER[t.toLowerCase()] ?? -1;
    const ranks = path.map(p => rank(p.type));
    const outOfOrder = ranks.some((r, i) => i > 0 && r >= 0 && ranks[i - 1] >= 0 && r < ranks[i - 1]);
    const holder = !lastStep || lastReceived ? path[path.length - 1] : (path.find(p => p.name === lastStep.from) ?? path[0]);
    const inTransitTo = lastStep && !lastReceived ? lastStep.to : null;
    const where = `Now with ${holder.name}${inTransitTo ? `, on its way to ${inTransitTo}` : ''}`.replace(/\.?$/, '.');
    let journeyCap = 100;
    let journey: Check;
    const custodyBroken = checks.some(c => c.id === 'custody' && c.outcome === 'fail');
    if (custodyBroken) {
        journeyCap = 60;
        journey = { id: 'journey', label: 'Journey', outcome: 'skip', detail: `Can't be confirmed: there is a gap in the chain of custody. ${where}` };
    } else if (outOfOrder) {
        journeyCap = 85;
        journey = { id: 'journey', label: 'Journey', outcome: 'warn', detail: `Moved backwards in the chain (e.g. from a pharmacy back to a distributor). ${where}` };
    } else if (reachedDispenser && hasDistributor && lastReceived) {
        journey = { id: 'journey', label: 'Journey', outcome: 'pass', detail: `Complete: manufacturer → distributor → ${holder.type.toLowerCase()}, every hand-off confirmed.` };
    } else {
        const r = rank(holder.type);
        journeyCap = reachedDispenser ? 90 : r >= 1 ? 80 : 60;
        journey = { id: 'journey', label: 'Journey', outcome: 'skip', detail: `Not finished yet. ${where}` };
    }
    checks.push(journey);

    // ---- verdict ----
    const failed = (id: Check['id']) => checks.some(c => c.id === id && c.outcome === 'fail');
    let verdict: Verdict = 'genuine';
    if (failed('origin') || unknownParties.length) verdict = 'counterfeit';
    else if (failed('expiry')) verdict = 'expired';
    else if (checks.some(c => c.outcome === 'fail')) verdict = 'suspicious';

    // ---- trust score: start at 100 and deduct per finding ----
    const penalties: Record<Check['id'], { fail: number; warn: number }> = {
        ledger: { fail: 100, warn: 0 }, integrity: { fail: 50, warn: 0 }, origin: { fail: 70, warn: 0 }, custody: { fail: 35, warn: 10 },
        handoffs: { fail: 35, warn: 10 }, expiry: { fail: 30, warn: 8 }, label: { fail: 35, warn: 10 },
        duplicate: { fail: 10, warn: 3 }, journey: { fail: 0, warn: 15 },
    };
    let score = 100;
    for (const c of checks) {
        if (c.outcome === 'fail') score -= penalties[c.id].fail;
        if (c.outcome === 'warn') score -= penalties[c.id].warn;
    }
    score = Math.max(0, Math.min(journeyCap, score));

    const firstFail = checks.find(c => c.outcome === 'fail');
    const firstWarn = checks.find(c => c.outcome === 'warn');
    const summary = firstFail?.detail
        ?? (firstWarn ? `Authentic. ${firstWarn.detail}`
            : journey.outcome === 'pass' ? 'Authentic. Every check passed and the journey is complete.' : `Authentic. ${journey.detail}`);

    return {
        batchId, verdict, trustScore: score, summary,
        action: VERDICT_COPY[verdict].action,
        checks,
        productName: record.productName,
        manufacturer: record.manufacturer,
        expiryDate: record.expiryDate,
        daysToExpiry,
        currentStage: record.currentStage,
        quantity: record.quantity,
        journey: { complete: journey.outcome === 'pass', holder: holder.name, holderType: holder.type, inTransitTo, detail: journey.detail },
        path,
        source: record.source,
        claims,
    };
}
