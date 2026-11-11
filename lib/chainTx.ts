// ============================================================
// Public blockchain receipts (server only)
// ------------------------------------------------------------
// When a batch is created or shipped while MetaMask is on the
// contract's network (e.g. Sepolia), the transaction hash is
// kept here so the app can link to it on Etherscan.
// Stored next to the shipment ledger, not inside it, so adding
// a receipt never changes the ledger's hash chain.
// ============================================================

import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'chain-tx.json');

export interface ChainReceipt { txHash: string; network: string; chainId: number; at: string }
type Store = Record<string, ChainReceipt>;

function load(): Store {
    const g = globalThis as any;
    if (!g.__medichainChainTx) {
        try { g.__medichainChainTx = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { g.__medichainChainTx = {}; }
    }
    return g.__medichainChainTx;
}

export const shipmentKey = (seq: number | string) => `shipment:${seq}`;
export const batchKey = (batchId: string) => `batch:${batchId.toUpperCase()}`;

export function getReceipt(key: string): ChainReceipt | undefined {
    return load()[key];
}

export function saveReceipt(key: string, r: ChainReceipt) {
    const s = load();
    s[key] = r;
    try {
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
    } catch { /* read-only host: memory only */ }
}

/** Block-explorer link for a transaction, when the network has a public one. */
export function explorerTxUrl(r: Pick<ChainReceipt, 'txHash' | 'chainId'>): string | null {
    if (r.chainId === 11155111) return `https://sepolia.etherscan.io/tx/${r.txHash}`;
    if (r.chainId === 1) return `https://etherscan.io/tx/${r.txHash}`;
    return null;
}
