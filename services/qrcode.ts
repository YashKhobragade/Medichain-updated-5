import { ethers } from 'ethers';
import { generateNonce } from '@/lib/utils';
import type { QRCodeData } from '@/types';

/**
 * Generate simple QR code data without signature
 * Use this when you don't want to require MetaMask signing
 */
export function generateSimpleQRCodeData(batchId: string): QRCodeData {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = generateNonce();

    return {
        batchId,
        timestamp,
        nonce,
        signature: '', // Empty signature - no MetaMask signing required
    };
}

/**
 * Generate QR code data with cryptographic signature
 * This prevents QR code forgery and reuse
 */
export async function generateQRCodeData(
    batchId: string,
    signer: ethers.Signer
): Promise<QRCodeData> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = generateNonce();

    // Create message to sign
    const message = ethers.solidityPackedKeccak256(
        ['string', 'uint256', 'string'],
        [batchId, timestamp, nonce]
    );

    // Sign the message
    const signature = await signer.signMessage(ethers.getBytes(message));

    return {
        batchId,
        timestamp,
        nonce,
        signature,
    };
}

/**
 * Verify QR code signature
 */
export async function verifyQRCodeSignature(
    qrData: QRCodeData,
    expectedSigner: string
): Promise<boolean> {
    try {
        // Recreate the message
        const message = ethers.solidityPackedKeccak256(
            ['string', 'uint256', 'string'],
            [qrData.batchId, qrData.timestamp, qrData.nonce]
        );

        // Recover signer from signature
        const recoveredAddress = ethers.verifyMessage(
            ethers.getBytes(message),
            qrData.signature
        );

        // Check if signer matches expected manufacturer
        return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
    } catch (error) {
        console.error('Failed to verify QR code signature:', error);
        return false;
    }
}

/**
 * Check if QR code is expired (24 hours validity for initial scan)
 */
export function isQRCodeExpired(timestamp: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = 24 * 60 * 60; // 24 hours
    return now - timestamp > expiryTime;
}

/**
 * Encode QR code data to JSON string
 */
export function encodeQRCodeData(qrData: QRCodeData): string {
    return JSON.stringify(qrData);
}

/**
 * Decode QR code data from JSON string
 */
export function decodeQRCodeData(qrString: string): QRCodeData | null {
    try {
        const data = JSON.parse(qrString);
        if (!data.batchId || !data.timestamp || !data.nonce || !data.signature) {
            return null;
        }
        return data as QRCodeData;
    } catch (error) {
        console.error('Failed to decode QR code data:', error);
        return null;
    }
}
