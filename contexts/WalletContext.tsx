'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { connectWallet, getUserRole } from '@/services/blockchain';
import { useAuth } from '@/contexts/AuthContext';
import { BrowserProvider } from 'ethers';

interface WalletContextType {
    account: string | null;
    role: number;
    chainId: number | null;
    isSepolia: boolean;
    isConnecting: boolean;
    error: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    switchToSepolia: () => Promise<void>;
    isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [account, setAccount] = useState<string | null>(null);
    const [role, setRole] = useState<number>(0);
    const [chainId, setChainId] = useState<number | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSepolia = chainId === 11155111;

    // Track previous user to detect actual logout
    const prevUserRef = useRef(user);

    // Listen for MetaMask events - FORCE DISCONNECT on any change
    useEffect(() => {
        if (typeof window !== 'undefined' && window.ethereum) {
            // When accounts change in MetaMask, CLEAR wallet state
            // User must explicitly reconnect
            const handleAccountsChanged = () => {
                console.log('MetaMask account changed - clearing wallet');
                setAccount(null);
                setRole(0);
                setChainId(null);
            };

            // On chain change, update state
            const handleChainChanged = (chainIdHex: string) => {
                setChainId(parseInt(chainIdHex, 16));
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []);

    // Fetch role when account changes
    useEffect(() => {
        if (account) {
            fetchRole();
            // Try to get chainId if not already set, in case of auto-reconnect
            if (chainId === null && window.ethereum) {
                const provider = new BrowserProvider(window.ethereum);
                provider.getNetwork().then(network => setChainId(Number(network.chainId))).catch(console.error);
            }
        } else {
            setRole(0);
            setChainId(null);
        }
    }, [account, chainId]);

    // Force disconnect wallet when user logs out
    useEffect(() => {
        const prevUser = prevUserRef.current;

        // Detect logout: previous user existed, now it's null
        if (prevUser && !user) {
            console.log('User logged out - clearing wallet');
            setAccount(null);
            setRole(0);
            setChainId(null);
        }

        // Update ref for next comparison
        prevUserRef.current = user;
    }, [user]);

    const fetchRole = async () => {
        if (!account) return;

        try {
            const userRole = await getUserRole(account);
            setRole(userRole);
        } catch (err) {
            console.error('Failed to fetch role:', err);
        }
    };

    const switchToSepolia = async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
            });
        } catch (switchError: any) {
            console.error('Failed to switch network:', switchError);
        }
    };

    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);

        try {
            console.log('Connecting wallet...');
            // ALWAYS call eth_requestAccounts to prompt MetaMask
            // This is the ONLY way to connect wallet
            const address = await connectWallet();
            console.log('Wallet connected:', address);

            if (address) {
                setAccount(address);
                if (window.ethereum) {
                    const provider = new BrowserProvider(window.ethereum);
                    const network = await provider.getNetwork();
                    setChainId(Number(network.chainId));
                }
            } else {
                throw new Error('No account returned from wallet');
            }
        } catch (err: any) {
            // Clear any stale state on error
            setAccount(null);
            setRole(0);
            setChainId(null);

            setError(err.message || 'Failed to connect wallet');
            console.error('Failed to connect wallet:', err);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        console.log('Disconnecting wallet');
        setAccount(null);
        setRole(0);
        setChainId(null);
        setError(null);
    }, []);

    const value = {
        account,
        role,
        chainId,
        isSepolia,
        isConnecting,
        error,
        connect,
        disconnect,
        switchToSepolia,
        isConnected: !!account,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}

// Extend Window interface for TypeScript
declare global {
    interface Window {
        ethereum?: any;
    }
}
