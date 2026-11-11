// ============================================================
// Organisation ↔ wallet links (server only)
// ------------------------------------------------------------
// A company links its MetaMask address from the app ("Link this
// wallet"); the admin then approves it, which gives the address
// its role on the smart contract. Links are kept in
// data/wallet-links.json. Addresses typed into public/wallets.json
// still work too; a link made in the app wins for the same company.
// Public addresses only, never keys.
// ============================================================

import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';

export type WalletRole = 'manufacturer' | 'distributor' | 'pharmacy' | 'hospital';

export interface WalletEntry {
    company: string;
    role: WalletRole;
    address: string;
    source: 'app' | 'file';
    linkedBy?: string;
    linkedAt?: string;
    approvedTx?: string;
    approvedAt?: string;
}

/** Login role → contract role name. Pharmacies and hospitals are VENDORs on the contract. */
export const WALLET_ROLE: Record<string, WalletRole> = { manufacturer: 'manufacturer', distributor: 'distributor', vendor: 'pharmacy', hospital: 'hospital' };

const FILE = path.join(process.cwd(), 'data', 'wallet-links.json');
const PUBLIC_FILE = path.join(process.cwd(), 'public', 'wallets.json');

function appLinks(): WalletEntry[] {
    try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

function save(list: WalletEntry[]) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

function fileLinks(): WalletEntry[] {
    try {
        const parties = JSON.parse(fs.readFileSync(PUBLIC_FILE, 'utf8')).parties ?? {};
        return Object.entries(parties as Record<string, { role: WalletRole; address: string }>)
            .filter(([, v]) => v.address && ethers.isAddress(v.address.trim()))
            .map(([company, v]) => ({ company, role: v.role, address: ethers.getAddress(v.address.trim()), source: 'file' as const }));
    } catch { return []; }
}

/** Every known company wallet: app links first, then public/wallets.json for companies not linked in the app. */
export function allWallets(): WalletEntry[] {
    const app = appLinks();
    const seen = new Set(app.map(l => l.company.toLowerCase()));
    return [...app, ...fileLinks().filter(f => !seen.has(f.company.toLowerCase()))];
}

export function linkWallet(company: string, role: WalletRole, address: string, by: string): WalletEntry {
    if (!ethers.isAddress(address)) throw new Error('That is not a valid wallet address.');
    const addr = ethers.getAddress(address);
    const other = allWallets().find(w => w.address === addr && w.company.toLowerCase() !== company.toLowerCase());
    if (other) throw new Error(`This wallet already belongs to ${other.company}. Each organisation needs its own MetaMask account.`);
    const list = appLinks().filter(l => l.company.toLowerCase() !== company.toLowerCase());
    const entry: WalletEntry = { company, role, address: addr, source: 'app', linkedBy: by, linkedAt: new Date().toISOString() };
    list.push(entry);
    save(list);
    return entry;
}

/** Records the admin's approval transaction (the role itself lives on the blockchain). */
export function markApproved(company: string, address: string, txHash: string) {
    const list = appLinks();
    let entry = list.find(l => l.company.toLowerCase() === company.toLowerCase());
    if (!entry) {
        // approving a company that is only in public/wallets.json: keep the receipt here
        const f = fileLinks().find(l => l.company.toLowerCase() === company.toLowerCase());
        if (!f) throw new Error(`${company} has no linked wallet.`);
        entry = { ...f };
        list.push(entry);
    }
    if (entry.address.toLowerCase() !== address.toLowerCase()) throw new Error(`${company}'s linked wallet changed. Refresh and approve again.`);
    entry.approvedTx = txHash;
    entry.approvedAt = new Date().toISOString();
    save(list);
    return entry;
}
