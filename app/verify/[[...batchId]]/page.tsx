'use client';

import { parseBatchCode } from '@/lib/batchCode';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { MissingLinkDetector } from '@/components/MissingLinkDetector';
import { JourneyBar } from '@/components/JourneyBar';
import { VerifyCameraScanner } from '@/components/VerifyCameraScanner';
import { QrCode, Shield, Package, Truck, Building2, CheckCircle, AlertTriangle, Search, Clock, MapPin, Camera, CameraOff } from 'lucide-react';

interface BatchData {
    batch: any;
    transfers: any[];
    scans: any[];
    verification: {
        status: 'genuine' | 'suspicious' | 'expired' | 'counterfeit';
        trustScore: number;
        warnings: string[];
        missingLink?: string | null;
        isExpired: boolean;
        supplyChainComplete: boolean;
        scanCount: number;
        duplicateScans: number;
    };
}

export default function VerifyPage() {
    const params = useParams();
    const batchId = Array.isArray(params.batchId) ? params.batchId[0] : params.batchId;

    const [data, setData] = useState<BatchData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchId, setSearchId] = useState('');
    const [cameraActive, setCameraActive] = useState(false);
    // Camera scanning lives in VerifyCameraScanner (full-frame jsQR + the ML scanner)
    const stopScanner = useCallback(() => setCameraActive(false), []);
    const onScanned = useCallback((id: string) => {
        setCameraActive(false);
        setSearchId(id);
        window.location.href = `/verify/${encodeURIComponent(id)}`;
    }, []);
    const onCameraError = useCallback((msg: string) => {
        setError(msg);
        setCameraActive(false);
    }, []);

    useEffect(() => {
        if (batchId) { verifyBatch(batchId); }
        else { setLoading(false); }
    }, [batchId]);

    const handleCameraToggle = () => {
        if (cameraActive) {
            stopScanner();
        } else {
            setError('');
            setCameraActive(true);
        }
    };

    const verifyBatch = async (id: string) => {
        setLoading(true); setError('');
        // Always the server's verdict: batches created in the app are saved there too,
        // so nothing in this browser can make a batch look genuine.
        try {
            const response = await fetch(`/api/verify/${encodeURIComponent(id)}`, { method: 'POST' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'Verification failed.');
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to verify batch. Invalid or non-existent QR code.');
        } finally { setLoading(false); }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchId.trim()) {
            window.location.href = `/verify/${searchId.trim()}`;
        }
    };

    const getRoleIcon = (role: string) => {
        const r = role.toLowerCase();
        if (r.includes('manufacturer')) return <Package className="w-4 h-4" />;
        if (r.includes('distributor')) return <Truck className="w-4 h-4" />;
        if (r.includes('vendor') || r.includes('pharmacy')) return <Building2 className="w-4 h-4" />;
        return <Shield className="w-4 h-4" />;
    };

    const statusConfig = {
        genuine: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircle className="w-10 h-10 text-emerald-400" /> },
        suspicious: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: <AlertTriangle className="w-10 h-10 text-amber-400" /> },
        expired: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: <AlertTriangle className="w-10 h-10 text-orange-400" /> },
        counterfeit: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: <Shield className="w-10 h-10 text-red-400" /> },
    };

    return (
        <DashboardShell>
            <PageHeader title="Medicine Verification" description="Verify medicine authenticity by batch ID or QR code scan" icon={QrCode} />

            {/* Search bar + Camera toggle */}
            {!batchId && (
                <div className="mb-8">
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)}
                                placeholder="Enter Batch ID to verify (e.g., MED-xxxx)"
                                className="w-full pl-12 pr-36 py-4 bg-gray-800/60 border border-gray-700 rounded-xl text-gray-200 text-sm placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button type="button"
                                    onClick={handleCameraToggle}
                                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${cameraActive
                                        ? 'bg-red-600 text-white hover:bg-red-500'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                    title={cameraActive ? 'Stop Camera' : 'Scan QR Code'}
                                >
                                    {cameraActive ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                                </button>
                                <button type="submit"
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors">
                                    Verify
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Camera Scanner */}
                    {cameraActive && (
                        <div className="max-w-2xl mx-auto mt-4">
                            <div className="bg-gray-800/80 rounded-xl border border-gray-700/50 overflow-hidden p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                                        <Camera className="w-4 h-4" />
                                        Point camera at QR code to scan
                                    </p>
                                    <button onClick={stopScanner} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                                        Close
                                    </button>
                                </div>
                                <VerifyCameraScanner onCode={onScanned} onError={onCameraError} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent mx-auto mb-3"></div>
                        <p className="text-gray-500 text-sm">Verifying medicine batch...</p>
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className="max-w-2xl mx-auto p-8 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                    <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-red-300 mb-2">Verification Failed</h2>
                    <p className="text-red-400/80 text-sm">{error}</p>
                </div>
            )}

            {data && !loading && (
                <div className="space-y-6">
                    {/* Verification Result + Trust Score */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Result Card */}
                        <div className={`lg:col-span-2 p-6 rounded-xl border ${statusConfig[data.verification.status].bg} ${statusConfig[data.verification.status].border}`}>
                            <div className="flex items-center gap-4 mb-4">
                                {statusConfig[data.verification.status].icon}
                                <div>
                                    <h2 className={`text-2xl font-bold capitalize ${statusConfig[data.verification.status].text}`}>
                                        {data.verification.status}
                                    </h2>
                                    <p className="text-sm text-gray-400">Batch: {data.batch.batch_id}</p>
                                </div>
                            </div>
                            <TrustScoreBadge score={data.verification.trustScore} size="lg" showBreakdown />
                            {(data as any).summary && <p className="mt-4 text-sm text-gray-300">{(data as any).summary}</p>}
                        </div>

                        {/* Batch Info */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                            <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">Batch Details</h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Medicine', value: data.batch.product_name },
                                    { label: 'Made by', value: data.batch.manufacturer_name || '—' },
                                    { label: 'Now at', value: (data as any).journey ? ((data as any).journey.inTransitTo ? `On the way to ${(data as any).journey.inTransitTo}` : (data as any).journey.holder) : '—' },
                                    { label: 'Category', value: data.batch.product_category },
                                    { label: 'SKU', value: data.batch.sku || '—' },
                                    { label: 'Quantity', value: data.batch.quantity ? `${data.batch.quantity} units` : '—' },
                                    { label: 'Mfg Date', value: data.batch.manufacturing_date ? new Date(data.batch.manufacturing_date).toLocaleDateString() : '—' },
                                    { label: 'Exp Date', value: data.batch.expiry_date ? new Date(data.batch.expiry_date).toLocaleDateString() : '—', warn: data.verification.isExpired },
                                ].map((item) => (
                                    <div key={item.label} className="flex justify-between">
                                        <span className="text-xs text-gray-500">{item.label}</span>
                                        <span className={`text-sm font-medium ${item.warn ? 'text-red-400' : 'text-gray-200'}`}>
                                            {item.value} {item.warn ? '⚠️' : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {(data as any).journey && <JourneyBar journey={(data as any).journey} />}

                    {/* Warnings */}
                    {(data.verification.missingLink || data.verification.warnings.length > 0) && (
                        <MissingLinkDetector missingLink={data.verification.missingLink} warnings={data.verification.warnings} />
                    )}

                    {/* Supply Chain Timeline */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-base font-semibold text-gray-200 mb-1">Supply Chain Timeline</h3>
                        <p className="text-xs text-gray-500 mb-5">
                            Made by {data.batch.manufacturer_name ?? 'the manufacturer'}
                            {data.batch.created_tx_url && <> · <a href={data.batch.created_tx_url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">created on Sepolia ↗</a></>}
                        </p>
                        {data.transfers.length === 0 ? (
                            <p className="text-sm text-gray-500">No transfers recorded yet</p>
                        ) : (
                            <div className="relative">
                                {data.transfers.map((transfer, index) => (
                                    <div key={transfer.id} className="flex gap-4 pb-6 last:pb-0">
                                        <div className="flex flex-col items-center">
                                            <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                {getRoleIcon(transfer.to_role)}
                                            </div>
                                            {index < data.transfers.length - 1 && <div className="w-px flex-1 bg-gray-700/50 mt-2"></div>}
                                        </div>
                                        <div className="flex-1 min-w-0 pb-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-200 capitalize">{transfer.to_role}</span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {new Date(transfer.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">
                                                {transfer.from_role ? <>from {transfer.from_role}</> : <span className="font-mono">{transfer.to_address}</span>}
                                                {transfer.in_transit && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px]">In transit</span>}
                                            </p>
                                            {(transfer.chain_url || transfer.chain_tx || transfer.ledger_hash) && (
                                                <p className="text-[11px] mt-1 flex flex-wrap gap-x-3">
                                                    {transfer.chain_url ? <a href={transfer.chain_url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">On Sepolia: view on Etherscan ↗</a>
                                                        : transfer.chain_tx && <span className="text-emerald-300/80" title={transfer.chain_tx}>on-chain ✓</span>}
                                                    {transfer.ledger_hash && <span className="text-gray-600 font-mono" title="Hash of this entry in the MediChain ledger">ledger #{String(transfer.ledger_hash).slice(0, 10)}</span>}
                                                </p>
                                            )}
                                            {transfer.location && (
                                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {transfer.location}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Scan History */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                        <h3 className="text-base font-semibold text-gray-200 mb-3">
                            QR Scan History
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30 text-center">
                                <p className="text-2xl font-bold text-emerald-400">{data.verification.scanCount}</p>
                                <p className="text-xs text-gray-500 mt-1">Total Scans</p>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30 text-center">
                                <p className="text-2xl font-bold text-blue-400">{Math.max(0, data.verification.scanCount - data.verification.duplicateScans)}</p>
                                <p className="text-xs text-gray-500 mt-1">Unique Scans</p>
                            </div>
                            <div className={`bg-gray-900/50 rounded-lg p-4 border text-center ${data.verification.duplicateScans > 0 ? 'border-amber-500/30' : 'border-gray-700/30'}`}>
                                <p className={`text-2xl font-bold ${data.verification.duplicateScans > 0 ? 'text-amber-400' : 'text-gray-400'}`}>{data.verification.duplicateScans}</p>
                                <p className="text-xs text-gray-500 mt-1">Duplicate Scans</p>
                            </div>
                        </div>
                        {data.verification.duplicateScans > 0 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <p className="text-sm text-amber-300">{data.verification.duplicateScans} duplicate scan(s) detected — possible counterfeit risk</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
