import type { VerificationResult } from '@/lib/verification';

/** One QR code found in the picture. Each batch is one box, so each code is one box. */
export interface ScannedCode {
    id: number;
    text: string;
    points: number[][];
    batchId: string;
    /** 'copy' when the same batch QR appears more than once — only one box can be real */
    status: 'ok' | 'copy';
}

/** Everything known about one batch in the picture. */
export interface ScanGroup {
    batchId: string;
    /** how many times its QR was seen (should be exactly 1) */
    count: number;
    verification: VerificationResult;
}

export const isCopied = (g: ScanGroup) => g.count > 1;
