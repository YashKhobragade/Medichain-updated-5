'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { ChainStatusBar } from '@/components/ChainStatusBar';
import { createOnChain, friendlyChainError, type ChainStatus } from '@/lib/onchain';
import { BatchQRCard } from '@/components/BatchQRCard';
import { Factory, Package, Plus, QrCode, Clock, CheckCircle, MapPin, Tag } from 'lucide-react';
import { DEMO_BATCHES, DEMO_PRODUCTS } from '@/utils/demo';
import { MANUFACTURERS, MEDICINES } from '@/utils/indianMedicinesData';

// Build demo batch rows for the table
const PRODUCT_MAP: Record<string, typeof DEMO_PRODUCTS[0]> = {};
DEMO_PRODUCTS.forEach(p => { PRODUCT_MAP[p.id] = p; });

const demoBatchRows = DEMO_BATCHES.filter(b => b.status !== 'Flagged').map(b => ({
    id: b.batch_id,
    batch_id: b.batch_id,
    product_name: PRODUCT_MAP[b.product_id]?.product_name || b.product_id,
    product_category: PRODUCT_MAP[b.product_id]?.category || '—',
    sku: PRODUCT_MAP[b.product_id]?.sku || '—',
    origin_location: b.origin_location,
    status: b.status === 'Delivered' ? 'DELIVERED' : b.status === 'In Transit' ? 'IN_TRANSIT' : b.status === 'Processing' ? 'CREATED' : 'IN_TRANSIT',
    production_date: b.production_date,
    expiry_date: b.expiry_date,
    quantity: b.quantity,
}));

export default function CreateProductPage() {
    const { account } = useWallet();
    const { user } = useAuth();
    // The logged-in manufacturer's own company (signed-up companies too)
    const ownCompany = user?.role === 'manufacturer' && user.company ? user.company : '';
    const [registered, setRegistered] = useState<string[]>([]);
    useEffect(() => {
        fetch('/api/parties').then(r => r.json())
            .then(d => setRegistered((d.parties ?? []).filter((p: any) => p.kind === 'Manufacturer').map((p: any) => p.name)))
            .catch(() => { });
    }, []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chain, setChain] = useState<ChainStatus | null>(null);
    const [chainNote, setChainNote] = useState<{ ok: boolean; text: string; url?: string | null } | null>(null);

    const [formData, setFormData] = useState({
        productName: '',
        productCategory: '',
        sku: '',
        productionDate: '',
        manufacturingLocation: '',
        manufacturerName: '',
        expiryDate: '',
        quantity: '100',
    });

    useEffect(() => {
        if (ownCompany) setFormData(prev => prev.manufacturerName ? prev : { ...prev, manufacturerName: ownCompany });
    }, [ownCompany]);

    // Registered companies first (your own on top), then the medicine catalog's companies
    const registeredList = Array.from(new Set([ownCompany, ...registered].filter(Boolean)));
    const catalogList = MANUFACTURERS.filter((m: string) => !registeredList.some(r => r.toLowerCase() === m.toLowerCase()));

    // Handle manufacturer selection
    const handleManufacturerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const mfg = e.target.value;
        setFormData(prev => ({ 
            ...prev, 
            manufacturerName: mfg, 
            productName: '',  // Reset product when manufacturer changes
            productCategory: '',
            manufacturingLocation: ''
        }));
    };

    // Handle medicine selection
    const handleMedicineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const medName = e.target.value;
        const medData = MEDICINES.find((m: any) => m.medicineName === medName && m.manufacturer === formData.manufacturerName)
            ?? MEDICINES.find((m: any) => m.medicineName === medName);
        
        setFormData(prev => ({
            ...prev,
            productName: medName,
            productCategory: medData ? medData.category || '' : prev.productCategory,
            manufacturingLocation: medData ? medData.location || '' : prev.manufacturingLocation,
            sku: medData ? `SKU-${medName.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}` : prev.sku
        }));
    };

    // Filtered medicines for the selected manufacturer
    // A company without its own catalog entries (e.g. a newly signed-up one) can choose from the whole catalog
    const ownMedicines = MEDICINES.filter((m: any) => m.manufacturer === formData.manufacturerName);
    const availableMedicines = ownMedicines.length ? ownMedicines
        : MEDICINES.filter((m: any, i: number) => MEDICINES.findIndex((x: any) => x.medicineName === m.medicineName) === i);

    const [createdBatchId, setCreatedBatchId] = useState<string | null>(null);
    const [lastProduct, setLastProduct] = useState<{ name: string; manufacturer: string; category: string; sku: string; origin: string; quantity: number; productionDate: string; expiryDate: string; chainNetwork?: string | null } | null>(null);
    const [success, setSuccess] = useState(false);
    const [batches, setBatches] = useState<any[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(true);

    useEffect(() => { fetchBatches(); }, []);

    // Real batches with live status from the shipment ledger (yours, if you're a manufacturer)
    const fetchBatches = async () => {
        try {
            const res = await authFetch('/api/batches/list');
            if (res.ok) {
                const data = await res.json();
                setBatches(Array.isArray(data.batches) ? data.batches : []);
                setLoadingBatches(false);
                return;
            }
        } catch (e) {
            console.log('API unavailable, using demo data');
        }
        setBatches(demoBatchRows);
        setLoadingBatches(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(false);
        setCreatedBatchId(null);
        setError(null); setChainNote(null); setLoading(true);
        // One ID for this batch, used by the server, the blockchain and the labels
        const batchId = `MED-${Date.now()}`;
        let chainNetwork: string | null = null;
        try {

            // Save to database
            const dbRes = await authFetch('/api/batches/create', {
                method: 'POST',
                body: JSON.stringify({
                    batch_id: batchId,
                    product_name: formData.productName,
                    product_category: formData.productCategory,
                    sku: formData.sku,
                    quantity: Math.max(1, Math.floor(Number(formData.quantity) || 1)),
                    production_date: formData.productionDate,
                    expiry_date: formData.expiryDate,
                    origin_location: formData.manufacturingLocation,
                    manufacturer_name: formData.manufacturerName,
                    manufacturer_address: account || 'demo-manufacturer',
                }),
            });

            if (!dbRes.ok) {
                const errData = await dbRes.json();
                throw new Error(errData.error || 'Failed to save product');
            }

            // Public blockchain (e.g. Sepolia), when MetaMask is connected to the contract's network
            if (chain?.ready) {
                setChainNote({ ok: true, text: 'Saved. Now confirm the blockchain transaction in MetaMask…' });
                try {
                    const r = await createOnChain(batchId, formData.expiryDate, `${batchId}|${formData.productName}|${formData.manufacturerName}|${formData.quantity}`);
                    await authFetch('/api/chain-tx', { method: 'POST', body: JSON.stringify({ kind: 'batch', ref: batchId, txHash: r.txHash, network: r.network, chainId: r.chainId }) });
                    chainNetwork = r.network === 'sepolia' ? 'Ethereum Sepolia' : chain.network ?? r.network;
                    setChainNote({ ok: true, text: `Registered on ${chain.network}.`, url: r.url });
                } catch (blockchainErr) {
                    setChainNote({ ok: false, text: `Saved in MediChain, but not written to the blockchain: ${friendlyChainError(blockchainErr)}` });
                }
            }

            setCreatedBatchId(batchId);
            setLastProduct({ name: formData.productName, manufacturer: formData.manufacturerName, category: formData.productCategory, sku: formData.sku, origin: formData.manufacturingLocation, quantity: Math.max(1, Math.floor(Number(formData.quantity) || 1)), productionDate: formData.productionDate, expiryDate: formData.expiryDate, chainNetwork });

            // Persist to localStorage for local tracking simulation
            try {
                const userProducts = JSON.parse(localStorage.getItem('user_products') || '[]');
                userProducts.unshift({
                    id: batchId,
                    batch_id: batchId,
                    name: formData.productName,
                    manufacturer: formData.manufacturerName,
                    category: formData.productCategory,
                    sku: formData.sku,
                    origin: formData.manufacturingLocation,
                    production_date: formData.productionDate,
                    created_at: new Date().toISOString(),
                    status: 'CREATED'
                });
                localStorage.setItem('user_products', JSON.stringify(userProducts.slice(0, 50))); // Keep last 50
            } catch (e) {
                console.error('Failed to save to localStorage:', e);
            }

            setSuccess(true);
            setFormData({ productName: '', productCategory: '', sku: '', productionDate: '', manufacturingLocation: '', manufacturerName: ownCompany, expiryDate: '', quantity: '100' });
            fetchBatches();
        } catch (err: any) {
            // Never show a QR for a batch the server didn't save: it would scan as "not on ledger"
            setError(err.message || 'Could not save the batch. Is the app running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardShell>
            <PageHeader
                title="Create Product"
                description="Register a new product on the blockchain and generate its QR code"
                icon={Factory}
            />
            <div className="mb-6"><ChainStatusBar onChange={setChain} /></div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <MetricCard icon={Package} label="Total Products" value={batches.length} color="emerald" />
                <MetricCard icon={Clock} label="In Transit" value={batches.filter(b => b.status === 'IN_TRANSIT').length} color="amber" />
                <MetricCard icon={CheckCircle} label="Delivered" value={batches.filter(b => b.status === 'DELIVERED').length} color="blue" />
            </div>

            {/* Form + QR Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                {/* Form — 3/5 */}
                <div className="lg:col-span-3 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Plus className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-base font-semibold text-gray-200">Product Details</h2>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Factory className="w-3.5 h-3.5" /> Manufacturer Name *</label>
                                <select value={formData.manufacturerName} onChange={handleManufacturerChange} required
                                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all appearance-none cursor-pointer">
                                    <option value="" disabled>Select Manufacturer</option>
                                    {registeredList.length > 0 && (
                                        <optgroup label="Registered on MediChain">
                                            {registeredList.map(mfg => <option key={mfg} value={mfg}>{mfg}{mfg === ownCompany ? ' (you)' : ''}</option>)}
                                        </optgroup>
                                    )}
                                    <optgroup label="Medicine catalog companies">
                                        {catalogList.map((mfg: string) => <option key={mfg} value={mfg}>{mfg}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Product Name *</label>
                                <select value={formData.productName} onChange={handleMedicineChange} required disabled={!formData.manufacturerName}
                                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                    <option value="" disabled>{formData.manufacturerName ? 'Select Medicine' : 'Select Manufacturer First'}</option>
                                    {availableMedicines.map((med: any, idx: number) => (
                                        <option key={idx} value={med.medicineName}>{med.medicineName} ({med.salt} - {med.form})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Product Category *</label>
                                <input type="text" value={formData.productCategory} onChange={e => setFormData({ ...formData, productCategory: e.target.value })}
                                    placeholder="e.g., Antibiotic, Analgesic, etc." required
                                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">SKU / Code *</label>
                                <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="e.g., SKU-123" required
                                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Production Date *</label>
                                <input type="date" value={formData.productionDate} onChange={e => setFormData({ ...formData, productionDate: e.target.value })}
                                    required className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Expiry Date *</label>
                                <input type="date" value={formData.expiryDate} min={formData.productionDate || undefined} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                    required className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Manufacturing Location *</label>
                                <input type="text" value={formData.manufacturingLocation} onChange={e => setFormData({ ...formData, manufacturingLocation: e.target.value })}
                                    placeholder="e.g., Mumbai, India" required
                                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Quantity in the box *</label>
                                <input type="number" min={1} max={100000} value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                    required inputMode="numeric"
                                    className="w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all" />
                                <p className="text-[11px] text-gray-500 mt-1">Units of medicine packed in this batch&apos;s box</p>
                            </div>

                        </div>

                        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
                        {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">✅ Batch created. Its QR code is ready. Ship it from <a href="/distributor" className="underline">Transfers</a>.</div>}
                        {chainNote && (
                            <div className={`p-3 rounded-lg text-sm border ${chainNote.ok ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200' : 'bg-amber-500/5 border-amber-500/30 text-amber-200'}`}>
                                {chainNote.text}{chainNote.url && <> <a href={chainNote.url} target="_blank" rel="noreferrer" className="underline">View on Etherscan ↗</a></>}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Processing...' : 'Create batch & QR code'}
                        </button>
                    </form>
                </div>

                {/* QR Preview — 2/5 */}
                <div className="lg:col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-5 self-start">
                        <QrCode className="w-5 h-5 text-purple-400" />
                        <h2 className="text-base font-semibold text-gray-200">QR code label</h2>
                    </div>
                    {createdBatchId ? (
                        <BatchQRCard batchId={createdBatchId} quantity={lastProduct?.quantity} productName={lastProduct?.name} manufacturer={lastProduct?.manufacturer}
                            category={lastProduct?.category} sku={lastProduct?.sku} origin={lastProduct?.origin}
                            productionDate={lastProduct?.productionDate} expiryDate={lastProduct?.expiryDate} chainNetwork={lastProduct?.chainNetwork} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                            <div className="w-32 h-32 bg-gray-700/30 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-gray-600">
                                <QrCode className="w-12 h-12 text-gray-600" />
                            </div>
                            <p className="text-sm text-gray-500">The batch&apos;s QR code appears<br />here after you create it</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Product History Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700/50">
                    <h2 className="text-base font-semibold text-gray-200">Product Registration History</h2>
                </div>
                {loadingBatches ? (
                    <div className="p-8 text-center text-gray-500">Loading products...</div>
                ) : batches.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">No products registered yet</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700/30">
                                    <th className="text-left px-6 py-3 font-medium">Batch / Tracking ID</th>
                                    <th className="text-left px-6 py-3 font-medium">Product Name</th>
                                    <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Category</th>
                                    <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Location</th>
                                    <th className="text-left px-6 py-3 font-medium">Status</th>
                                    <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Production Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/20">
                                {batches.map((batch: any) => (
                                    <tr 
                                        key={batch.id || batch.batch_id} 
                                        className="hover:bg-gray-700/40 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setCreatedBatchId(batch.batch_id);
                                            setLastProduct({
                                                name: batch.product_name || '',
                                                manufacturer: batch.manufacturer_name || batch.manufacturer || 'Unknown Manufacturer',
                                                category: batch.product_category || '',
                                                sku: batch.sku || '',
                                                origin: batch.origin_location || '',
                                                quantity: Number(batch.quantity) || 1,
                                                productionDate: batch.production_date || '',
                                                expiryDate: batch.expiry_date || '',
                                            });
                                            // Scroll back up to the QR code area smoothly
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        title="Click to view QR code"
                                    >
                                        <td className="px-6 py-3.5 text-sm font-mono text-emerald-400">{batch.batch_id}</td>
                                        <td className="px-6 py-3.5 text-sm text-gray-300">{batch.product_name}</td>
                                        <td className="px-6 py-3.5 text-sm text-gray-400 hidden sm:table-cell">{batch.product_category || '—'}</td>
                                        <td className="px-6 py-3.5 text-sm text-gray-400 hidden sm:table-cell">{batch.origin_location || '—'}</td>
                                        <td className="px-6 py-3.5"><StatusBadge status={batch.status || 'CREATED'} /></td>
                                        <td className="px-6 py-3.5 text-sm text-gray-500 hidden md:table-cell">
                                            {batch.production_date ? new Date(batch.production_date).toLocaleDateString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
