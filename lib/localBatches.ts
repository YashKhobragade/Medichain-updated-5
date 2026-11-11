// Batches created without a database. Saved to data/batches.json so they
// survive restarts locally; on read-only hosts (e.g. Vercel) they stay in memory.
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'batches.json');

export function localBatches(): any[] {
    const g = globalThis as any;
    if (!Array.isArray(g.DEMO_DB_MOCK)) {
        try { g.DEMO_DB_MOCK = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { g.DEMO_DB_MOCK = []; }
    }
    return g.DEMO_DB_MOCK;
}

export function addLocalBatch(batch: any) {
    const list = localBatches();
    list.push(batch);
    try {
        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
    } catch { /* read-only filesystem: keep in memory only */ }
}
