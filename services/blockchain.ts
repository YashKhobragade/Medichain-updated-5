import { ethers } from 'ethers';
import { CONTRACT_ABI } from '@/lib/contract-abi';
import type { Batch, Transfer } from '@/types';

// Contract address will be loaded from public/contract-address.json after deployment
let contractAddress: string | null = null;

/**
 * Load contract address from deployment file
 */
export async function loadContractAddress(): Promise<string> {
    if (contractAddress) return contractAddress;

    try {
        const response = await fetch('/contract-address.json');
        const data = await response.json();
        contractAddress = data.address;

        if (!contractAddress) {
            throw new Error('Contract address not found in deployment file');
        }

        return contractAddress;
    } catch (error) {
        console.error('Failed to load contract address:', error);
        throw new Error('Contract not deployed. Please deploy the contract first.');
    }
}

/**
 * Get ethers provider
 */
export function getProvider(): ethers.BrowserProvider | null {
    if (typeof window === 'undefined' || !window.ethereum) {
        return null;
    }
    return new ethers.BrowserProvider(window.ethereum);
}

/**
 * Get contract instance (read-only)
 */
export async function getContract(): Promise<ethers.Contract> {
    const provider = getProvider();
    if (!provider) {
        throw new Error('No Ethereum provider found. Please install MetaMask.');
    }

    const address = await loadContractAddress();
    return new ethers.Contract(address, CONTRACT_ABI, provider);
}

/**
 * Get contract instance with signer (for write operations)
 */
export async function getContractWithSigner(): Promise<ethers.Contract> {
    const provider = getProvider();
    if (!provider) {
        throw new Error('No Ethereum provider found. Please install MetaMask.');
    }

    const signer = await provider.getSigner();
    const address = await loadContractAddress();
    return new ethers.Contract(address, CONTRACT_ABI, signer);
}

/**
 * Connect wallet
 */
export async function connectWallet(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Ethereum provider found. Please install MetaMask.');
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        return accounts[0];
    } catch (error: any) {
        console.error('Failed to connect wallet:', error);
        throw new Error(error.message || 'Failed to connect wallet');
    }
}

/**
 * Get current account
 */
export async function getCurrentAccount(): Promise<string | null> {
    if (typeof window === 'undefined' || !window.ethereum) {
        return null;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        return accounts[0] || null;
    } catch (error) {
        console.error('Failed to get current account:', error);
        return null;
    }
}

/**
 * Get user role
 */
export async function getUserRole(address: string): Promise<number> {
    const contract = await getContract();
    const role = await contract.getRole(address);
    return Number(role);
}

/**
 * Assign role (admin only)
 */
export async function assignRole(address: string, role: number): Promise<void> {
    const contract = await getContractWithSigner();
    const tx = await contract.assignRole(address, role);
    await tx.wait();
}

/**
 * Create batch (manufacturer only)
 */
export async function createBatch(
    batchId: string,
    expiryDate: number,
    metadataHash: string
): Promise<void> {
    const contract = await getContractWithSigner();
    const tx = await contract.createBatch(batchId, expiryDate, metadataHash);
    await tx.wait();
}

/**
 * Transfer batch
 */
export async function transferBatch(
    batchId: string,
    to: string,
    location: string
): Promise<void> {
    const contract = await getContractWithSigner();
    const tx = await contract.transferBatch(batchId, to, location);
    await tx.wait();
}

/**
 * Get batch details
 */
export async function getBatch(batchId: string): Promise<Batch> {
    const contract = await getContract();
    const batch = await contract.getBatch(batchId);

    return {
        batchId: batch.batchId,
        manufacturer: batch.manufacturer,
        currentOwner: batch.currentOwner,
        status: Number(batch.status),
        createdAt: Number(batch.createdAt),
        expiryDate: Number(batch.expiryDate),
        metadataHash: batch.metadataHash,
        supplyChain: batch.supplyChain,
    };
}

/**
 * Verify chain integrity
 */
export async function verifyChainIntegrity(batchId: string): Promise<{
    isValid: boolean;
    reason: string;
}> {
    const contract = await getContract();
    const result = await contract.verifyChainIntegrity(batchId);

    return {
        isValid: result.isValid,
        reason: result.reason,
    };
}

/**
 * Get transfer history
 */
export async function getTransferHistory(batchId: string): Promise<Transfer[]> {
    const contract = await getContract();
    const history = await contract.getTransferHistory(batchId);

    return history.map((transfer: any) => ({
        from: transfer.from,
        to: transfer.to,
        timestamp: Number(transfer.timestamp),
        location: transfer.location,
    }));
}

/**
 * Record scan
 */
export async function recordScan(batchId: string): Promise<void> {
    const contract = await getContractWithSigner();
    const tx = await contract.recordScan(batchId);
    await tx.wait();
}

/**
 * Get scan count
 */
export async function getScanCount(batchId: string, scanner: string): Promise<number> {
    const contract = await getContract();
    const count = await contract.getScanCount(batchId, scanner);
    return Number(count);
}

/**
 * Listen to contract events
 */
export async function listenToEvents(
    eventName: string,
    callback: (...args: any[]) => void
): Promise<void> {
    const contract = await getContract();
    contract.on(eventName, callback);
}

/**
 * Remove event listener
 */
export async function removeEventListener(
    eventName: string,
    callback: (...args: any[]) => void
): Promise<void> {
    const contract = await getContract();
    contract.off(eventName, callback);
}
