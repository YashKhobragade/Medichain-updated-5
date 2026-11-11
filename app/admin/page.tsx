'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { useWallet } from '@/contexts/WalletContext';
import { useContract } from '@/hooks/useContract';
import { Settings, UserPlus, Shield, ScanLine, QrCode } from 'lucide-react';
import { ChainStatusBar } from '@/components/ChainStatusBar';
import { WalletApprovals } from '@/components/WalletApprovals';
import type { ChainStatus } from '@/lib/onchain';

export default function AdminPage() {
    const { account, role, isConnected } = useWallet();
    const { assignRole, loading, error } = useContract();

    const [address, setAddress] = useState('');
    const [selectedRole, setSelectedRole] = useState('1');
    const [success, setSuccess] = useState(false);
    const [chain, setChain] = useState<ChainStatus | null>(null);

    const handleAssignRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(false);
        try {
            await assignRole(address, parseInt(selectedRole));
            setSuccess(true);
            setAddress('');
        } catch (err) { console.error('Failed to assign role:', err); }
    };

    return (
        <DashboardShell>
            <PageHeader title="Admin Panel" description="Role management and system configuration" icon={Settings} />
            <div className="mb-6"><ChainStatusBar onChange={setChain} /></div>
            <div className="mb-6"><WalletApprovals chain={chain} /></div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Role Assignment */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <UserPlus className="w-5 h-5 text-red-400" />
                        <h2 className="text-base font-semibold text-gray-200">Assign a role by address</h2>
                    </div>
                    <form onSubmit={handleAssignRole} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Wallet Address *</label>
                            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                                placeholder="0x..." required
                                className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm font-mono text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Role *</label>
                            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-red-500/40 transition-all">
                                <option value="1">Manufacturer</option>
                                <option value="2">Distributor</option>
                                <option value="3">Vendor</option>
                                <option value="4">Bulk Verifier</option>
                                <option value="5">Customer</option>
                            </select>
                        </div>

                        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
                        {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">✅ Role assigned successfully!</div>}

                        <button type="submit" disabled={loading}
                            className="w-full px-5 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Assigning...' : 'Assign Role'}
                        </button>
                    </form>
                </div>

                {/* System Info + Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-base font-semibold text-gray-200 mb-4">System Overview</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Network</span>
                                <span className="text-sm font-medium text-gray-200">Localhost / Sepolia</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Wallet</span>
                                <span className="text-sm font-mono text-gray-300 truncate max-w-[200px]">{account || 'Not connected'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-base font-semibold text-gray-200 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link href="/bulk-verify"
                                className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-500/15 transition-colors text-sm font-medium">
                                <ScanLine className="w-4 h-4" /> Bulk Verify Batches
                            </Link>
                            <Link href="/verify"
                                className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-500/15 transition-colors text-sm font-medium">
                                <QrCode className="w-4 h-4" /> Verify Single Batch
                            </Link>
                            <Link href="/analytics"
                                className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg hover:bg-emerald-500/15 transition-colors text-sm font-medium">
                                <Shield className="w-4 h-4" /> View Analytics
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
