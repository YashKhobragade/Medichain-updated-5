// Type definitions for the application

export enum Role {
    NONE = 0,
    MANUFACTURER = 1,
    DISTRIBUTOR = 2,
    PHARMACY = 3,
    HOSPITAL = 4,
    CUSTOMER = 5,
}

export enum BatchStatus {
    CREATED = 0,
    IN_TRANSIT = 1,
    DELIVERED = 2,
    FLAGGED = 3,
}

export interface Batch {
    batchId: string;
    manufacturer: string;
    currentOwner: string;
    status: BatchStatus;
    createdAt: number;
    expiryDate: number;
    metadataHash: string;
    supplyChain: string[];
}

export interface Transfer {
    from: string;
    to: string;
    timestamp: number;
    location: string;
}

export interface BatchMetadata {
    name: string;
    dosage: string;
    manufacturer: string;
    description: string;
    imageUrl?: string;
}

export interface QRCodeData {
    batchId: string;
    timestamp: number;
    nonce: string;
    signature: string;
}

export interface VerificationResult {
    isValid: boolean;
    reason: string;
    batch?: Batch;
    transfers?: Transfer[];
}

export interface BulkVerificationResult {
    batchId: string;
    status: 'genuine' | 'suspicious' | 'counterfeit' | 'not_found';
    reason: string;
}
