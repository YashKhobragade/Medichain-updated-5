'use client';

import { useState, useCallback } from 'react';
import * as blockchain from '@/services/blockchain';
import type { Batch, Transfer } from '@/types';

export function useContract() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleError = (err: any) => {
        const message = err.reason || err.message || 'Transaction failed';
        setError(message);
        console.error('Contract error:', err);
        throw err;
    };

    const createBatch = useCallback(async (
        batchId: string,
        expiryDate: number,
        metadataHash: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            await blockchain.createBatch(batchId, expiryDate, metadataHash);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const transferBatch = useCallback(async (
        batchId: string,
        to: string,
        location: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            await blockchain.transferBatch(batchId, to, location);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const getBatch = useCallback(async (batchId: string): Promise<Batch | null> => {
        setLoading(true);
        setError(null);

        try {
            const batch = await blockchain.getBatch(batchId);
            return batch;
        } catch (err) {
            handleError(err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const verifyChainIntegrity = useCallback(async (batchId: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await blockchain.verifyChainIntegrity(batchId);
            return result;
        } catch (err) {
            handleError(err);
            return { isValid: false, reason: 'Verification failed' };
        } finally {
            setLoading(false);
        }
    }, []);

    const getTransferHistory = useCallback(async (batchId: string): Promise<Transfer[]> => {
        setLoading(true);
        setError(null);

        try {
            const history = await blockchain.getTransferHistory(batchId);
            return history;
        } catch (err) {
            handleError(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const recordScan = useCallback(async (batchId: string) => {
        setLoading(true);
        setError(null);

        try {
            await blockchain.recordScan(batchId);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const assignRole = useCallback(async (address: string, role: number) => {
        setLoading(true);
        setError(null);

        try {
            await blockchain.assignRole(address, role);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        createBatch,
        transferBatch,
        getBatch,
        verifyChainIntegrity,
        getTransferHistory,
        recordScan,
        assignRole,
    };
}
