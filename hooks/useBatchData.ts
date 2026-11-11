'use client';

import { useState, useEffect } from 'react';
import { useContract } from './useContract';
import type { Batch, Transfer } from '@/types';

export function useBatchData(batchId: string | null) {
    const [batch, setBatch] = useState<Batch | null>(null);
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [verification, setVerification] = useState<{ isValid: boolean; reason: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const contract = useContract();

    useEffect(() => {
        if (batchId) {
            fetchBatchData();
        }
    }, [batchId]);

    const fetchBatchData = async () => {
        if (!batchId) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch batch details
            const batchData = await contract.getBatch(batchId);
            setBatch(batchData);

            // Fetch transfer history
            const history = await contract.getTransferHistory(batchId);
            setTransfers(history);

            // Verify chain integrity
            const verificationResult = await contract.verifyChainIntegrity(batchId);
            setVerification(verificationResult);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch batch data');
            console.error('Failed to fetch batch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        fetchBatchData();
    };

    return {
        batch,
        transfers,
        verification,
        loading,
        error,
        refresh,
    };
}
