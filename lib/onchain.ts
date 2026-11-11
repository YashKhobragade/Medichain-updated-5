'use client';

// ============================================================
// Public blockchain (Ethereum Sepolia) — browser side
// ------------------------------------------------------------
// MediChain always records batches and shipments in its own
// hash-linked ledger. When MetaMask is connected to the network
// the contract is deployed on (public/contract-address.json),
// the same action is ALSO written to the smart contract and the
// transaction can be opened on Etherscan.
//
// Organisations are matched to wallet addresses through
// /api/wallets: wallets linked in the app ("Link this wallet")
// plus public/wallets.json (public addresses only — never keys).
// ============================================================

import { ethers } from 'ethers';
import { CONTRACT_ABI } from '@/lib/contract-abi';

interface Deployment { address: string; network: string; chainId?: number }
interface Wallets { parties: Record<string, { address: string; role: string }> }

const CHAIN_IDS: Record<string, number> = { sepolia: 11155111, mainnet: 1, localhost: 31337, hardhat: 31337 };
const NETWORK_NAMES: Record<number, string> = { 11155111: 'Sepolia', 1: 'Ethereum', 31337: 'local Hardhat', 1337: 'local Hardhat' };

export interface ChainStatus {
    ready: boolean;
    /** plain-language reason when not ready */
    reason?: string;
    account?: string;
    chainId?: number;
    network?: string;
    /** the wallet is on the wrong network and can be asked to switch */
    needsSwitch?: boolean;
    expectedChainId?: number;
}

export interface ChainReceipt { txHash: string; chainId: number; network: string; url: string | null }

/** Thrown when the batch exists in MediChain but was never written to this blockchain. */
export class NotOnChainError extends Error { }

const eth = () => (typeof window !== 'undefined' ? (window as any).ethereum : undefined);

async function getJSON<T>(url: string): Promise<T | null> {
    try {
        const r = await fetch(url, { cache: 'no-store' });
        return r.ok ? await r.json() : null;
    } catch { return null; }
}

export const explorerUrl = (chainId: number, txHash: string) =>
    chainId === 11155111 ? `https://sepolia.etherscan.io/tx/${txHash}` : chainId === 1 ? `https://etherscan.io/tx/${txHash}` : null;

async function deployment(): Promise<(Deployment & { chainId: number }) | null> {
    const d = await getJSON<Deployment>('/contract-address.json');
    if (!d?.address) return null;
    return { ...d, chainId: d.chainId ?? CHAIN_IDS[d.network] ?? 0 };
}

export async function chainStatus(): Promise<ChainStatus> {
    const d = await deployment();
    if (!d) return { ready: false, reason: 'Smart contract not deployed yet, so actions are recorded in the MediChain ledger only (see GUIDE.md to deploy on Sepolia).' };
    const e = eth();
    if (!e) return { ready: false, reason: 'MetaMask is not installed, so actions are recorded in the MediChain ledger only.' };
    const accounts: string[] = await e.request({ method: 'eth_accounts' }).catch(() => []);
    if (!accounts.length) return { ready: false, reason: 'Connect MetaMask to also write to the blockchain.', expectedChainId: d.chainId };
    const chainId = parseInt(await e.request({ method: 'eth_chainId' }), 16);
    const net = NETWORK_NAMES[d.chainId] ?? d.network;
    if (chainId !== d.chainId) {
        return { ready: false, needsSwitch: d.chainId === 11155111, account: accounts[0], chainId, expectedChainId: d.chainId,
            reason: `MetaMask is on a different network. The contract is on ${net}.` };
    }
    return { ready: true, account: accounts[0], chainId, network: net, expectedChainId: d.chainId };
}

export async function walletOf(org: string): Promise<string | null> {
    const w = (await getJSON<Wallets>('/api/wallets')) ?? (await getJSON<Wallets>('/wallets.json'));
    const hit = Object.entries(w?.parties ?? {}).find(([name]) => name.toLowerCase() === org.toLowerCase());
    const addr = hit?.[1].address?.trim();
    return addr && ethers.isAddress(addr) ? ethers.getAddress(addr) : null;
}

async function contractWithSigner() {
    const d = await deployment();
    if (!d) throw new Error('The smart contract has not been deployed yet.');
    const provider = new ethers.BrowserProvider(eth());
    const signer = await provider.getSigner();
    return { contract: new ethers.Contract(d.address, CONTRACT_ABI, signer), signer, d };
}

/** Turn MetaMask / contract errors into something a person can act on. */
export function friendlyChainError(e: any): string {
    const text = [e?.shortMessage, e?.reason, e?.info?.error?.message, e?.message].filter(Boolean).join(' ');
    if (e?.code === 'ACTION_REJECTED' || /user (rejected|denied)/i.test(text)) return 'You cancelled the transaction in MetaMask.';
    if (e?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(text)) return 'This wallet has no test ETH to pay for gas. Get free Sepolia ETH from a faucet and try again.';
    if (/Unauthorized: Invalid role/.test(text)) return 'This wallet is not approved as a manufacturer on the blockchain yet. Link it (bar at the top) and ask the admin to approve it.';
    if (/Only current owner/.test(text)) return 'On the blockchain this batch belongs to a different wallet. Switch MetaMask to the wallet of the organisation that holds it.';
    if (/Recipient has no role/.test(text)) return 'The receiving organisation’s wallet is not approved on the blockchain yet. Ask the admin to approve it (Admin → Wallet approvals).';
    if (/Recipient must be distributor or vendor/.test(text)) return 'On the blockchain, batches can only go to a distributor or a pharmacy/hospital wallet.';
    if (/Batch already exists/.test(text)) return 'This batch is already on the blockchain.';
    if (/Expiry date must be in future/.test(text)) return 'The expiry date must be in the future.';
    if (/expired batch/.test(text)) return 'The blockchain refused: this batch has expired.';
    return e?.shortMessage || e?.message || 'The blockchain transaction failed.';
}

function receipt(txHash: string, d: { chainId: number; network: string }): ChainReceipt {
    return { txHash, chainId: d.chainId, network: d.network, url: explorerUrl(d.chainId, txHash) };
}

/** Register a new batch on the blockchain. */
export async function createOnChain(batchId: string, expiryDate: string, metadata: string): Promise<ChainReceipt> {
    const { contract, d } = await contractWithSigner();
    const expiry = Math.floor(new Date(expiryDate).getTime() / 1000);
    const tx = await contract.createBatch(batchId, expiry, ethers.id(metadata));
    await tx.wait();
    return receipt(tx.hash, d);
}

/** Move a batch to another organisation on the blockchain. */
export async function transferOnChain(batchId: string, toOrg: string, location: string): Promise<ChainReceipt> {
    const to = await walletOf(toOrg);
    if (!to) throw new Error(`${toOrg} has not linked a wallet yet, so this shipment was recorded in the MediChain ledger only.`);
    const { contract, signer, d } = await contractWithSigner();
    let owner: string;
    try {
        owner = (await contract.getBatch(batchId)).currentOwner;
    } catch {
        throw new NotOnChainError(`${batchId} was never written to the blockchain (it was created without MetaMask on this network), so this shipment was recorded in the MediChain ledger only.`);
    }
    const me = await signer.getAddress();
    if (owner.toLowerCase() !== me.toLowerCase()) {
        throw new Error(`On the blockchain ${batchId} belongs to wallet ${owner.slice(0, 8)}…, not the one connected (${me.slice(0, 8)}…). Switch MetaMask to that wallet.`);
    }
    const tx = await contract.transferBatch(batchId, to, location);
    await tx.wait();
    return receipt(tx.hash, d);
}

// ---------------- Wallet approvals ----------------

/** Contract roles: pharmacies and hospitals are both VENDOR (3). */
export const CONTRACT_ROLE: Record<string, number> = { manufacturer: 1, distributor: 2, pharmacy: 3, hospital: 3 };

/** The address's role on the contract (0 = none), or null when MetaMask isn't on the contract's network. */
export async function roleOnChain(address: string): Promise<number | null> {
    const st = await chainStatus();
    if (!st.ready) return null;
    const d = await deployment();
    if (!d) return null;
    try {
        const c = new ethers.Contract(d.address, CONTRACT_ABI, new ethers.BrowserProvider(eth()));
        return Number(await c.getRole(address));
    } catch { return null; }
}

/** Admin only: gives a company's wallet its role on the contract (MetaMask asks to confirm). */
export async function approveOnChain(address: string, role: string): Promise<ChainReceipt> {
    const want = CONTRACT_ROLE[role];
    if (!want) throw new Error(`Unknown role "${role}".`);
    const { contract, signer, d } = await contractWithSigner();
    const admin: string = await contract.admin();
    const me = await signer.getAddress();
    if (admin.toLowerCase() !== me.toLowerCase()) {
        throw new Error(`Only the wallet that deployed the contract can approve wallets. Switch MetaMask to ${admin.slice(0, 8)}…${admin.slice(-4)}.`);
    }
    const tx = await contract.assignRole(address, want);
    await tx.wait();
    return receipt(tx.hash, d);
}
