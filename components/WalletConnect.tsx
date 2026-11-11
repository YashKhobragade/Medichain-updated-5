'use client';

import { useWallet } from '@/contexts/WalletContext';
import { getRoleName } from '@/lib/utils';
import { Wallet, LogOut } from 'lucide-react';

interface WalletConnectProps {
    compact?: boolean;
}

export function WalletConnect({ compact = false }: WalletConnectProps) {
    const { account, role, isSepolia, isConnecting, error, connect, disconnect, isConnected, switchToSepolia } = useWallet();

    const hasEthereum = typeof window !== 'undefined' && !!window.ethereum;

    if (isConnected && account) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                    <div className={`font-medium text-gray-200 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                    <div className={`text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                        {getRoleName(role)}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isSepolia ? (
                        <span className={`bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md font-medium flex items-center justify-center ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}>
                            Sepolia
                        </span>
                    ) : (
                        <button
                            onClick={switchToSepolia}
                            className={`bg-red-500/10 text-red-500 border border-red-500/20 rounded-md font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}
                        >
                            Switch to Sepolia
                        </button>
                    )}

                    <button
                        onClick={disconnect}
                        className={`flex items-center justify-center bg-gray-800 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 hover:text-white transition-colors ${compact ? 'p-1.5' : 'px-4 py-2 gap-2'}`}
                        title="Disconnect"
                    >
                        <LogOut className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                        {!compact && <span>Disconnect</span>}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-2">
            {!hasEthereum ? (
                <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors font-medium ${compact ? 'px-3 py-1.5 text-xs' : 'px-6 py-3'}`}
                >
                    <Wallet className={compact ? "w-3.5 h-3.5" : "w-5 h-5"} />
                    Install MetaMask
                </a>
            ) : (
                <button
                    onClick={connect}
                    disabled={isConnecting}
                    className={`flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${compact ? 'px-3 py-1.5 text-xs' : 'px-6 py-3'}`}
                >
                    <Wallet className={compact ? "w-3.5 h-3.5" : "w-5 h-5"} />
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
            )}
            {error && !compact && (
                <div className="text-sm text-red-500">
                    {error}
                </div>
            )}
        </div>
    );
}

