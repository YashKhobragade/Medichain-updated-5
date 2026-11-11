'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { MissingLinkDetector } from '@/components/MissingLinkDetector';
import {
    MapPin, Search, Package, Truck, Building2, Shield, CheckCircle,
    AlertTriangle, Clock, Factory, ArrowRight, Globe, Box
} from 'lucide-react';
import { DEMO_PRODUCTS, DEMO_BATCHES, DEMO_TRANSFERS, DEMO_KPI_METRICS } from '@/utils/demo';

const TrackingMap = lazy(() =>
    import('@/components/features/TrackingMap').then(mod => ({ default: mod.TrackingMap }))
);

// Geo coordinates — India only
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
    'Mumbai': { lat: 19.076, lng: 72.8777 },
    'Delhi': { lat: 28.7041, lng: 77.1025 },
    'New Delhi': { lat: 28.7041, lng: 77.1025 },
    'Bangalore': { lat: 12.9716, lng: 77.5946 },
    'Chennai': { lat: 13.0827, lng: 80.2707 },
    'Hyderabad': { lat: 17.3850, lng: 78.4867 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
    'Kolkata': { lat: 22.5726, lng: 88.3639 },
    'Lucknow': { lat: 26.8467, lng: 80.9462 },
    'Jaipur': { lat: 26.9124, lng: 75.7873 },
    'Chandigarh': { lat: 30.7333, lng: 76.7794 },
    'Guwahati': { lat: 26.1445, lng: 91.7362 },
    'Bhopal': { lat: 23.2599, lng: 77.4126 },
    'Nagpur': { lat: 21.1458, lng: 79.0882 },
    'Patna': { lat: 25.6093, lng: 85.1376 },
    'Kochi': { lat: 9.9312, lng: 76.2673 },
    'Darjeeling': { lat: 27.0410, lng: 88.2663 },
};

function findCoords(locationStr: string) {
    const cityKey = Object.keys(LOCATION_COORDS).find(city =>
        locationStr.toLowerCase().includes(city.toLowerCase())
    );
    return cityKey ? LOCATION_COORDS[cityKey] : { lat: 20.5937, lng: 78.9629 }; // Default: India center
}

// Build product map entries for the default view
const PRODUCT_MAP: Record<string, typeof DEMO_PRODUCTS[0]> = {};
DEMO_PRODUCTS.forEach(p => { PRODUCT_MAP[p.id] = p; });

// Build a product-level tracking table (one row per product, showing latest location)
function buildProductTrackingRows() {
    const demoRows = DEMO_PRODUCTS.map(product => {
        // Get all batches for this product
        const batches = DEMO_BATCHES.filter(b => b.product_id === product.id && b.status !== 'Flagged');
        const latestBatch = batches[batches.length - 1] || batches[0];
        if (!latestBatch) return null;

        // Get latest transfer for this product
        const transfers = DEMO_TRANSFERS.filter(t => batches.some(b => b.batch_id === t.batch_id));
        const latestTransfer = transfers[transfers.length - 1];

        const currentLocation = latestTransfer
            ? latestTransfer.location.split('→').pop()?.trim() || latestTransfer.location
            : latestBatch.origin_location;

        return {
            id: product.id,
            product_name: product.product_name,
            category: product.category,
            manufacturer: product.manufacturer,
            batch_count: batches.length,
            latest_batch: latestBatch.batch_id,
            current_location: currentLocation,
            origin: latestBatch.origin_location,
            current_stage: latestBatch.current_stage,
            status: latestBatch.status === 'Delivered' ? 'DELIVERED' : latestBatch.status === 'In Transit' ? 'IN_TRANSIT' : 'CREATED',
            last_updated: latestTransfer?.timestamp || latestBatch.production_date + 'T00:00:00Z',
        };
    }).filter(Boolean);

    // Merge user products from localStorage
    let userRows: any[] = [];
    if (typeof window !== 'undefined') {
        try {
            const stored = JSON.parse(localStorage.getItem('user_products') || '[]');
            userRows = stored.map((p: any) => ({
                id: p.id,
                product_name: p.name,
                category: p.category,
                manufacturer: p.manufacturer,
                batch_count: 1,
                latest_batch: p.batch_id,
                current_location: p.origin || 'Manufacturing',
                origin: p.origin || 'Manufacturing',
                current_stage: 'Manufacturer',
                status: 'CREATED',
                last_updated: p.created_at
            }));
        } catch { }
    }

    return [...userRows, ...demoRows];
}

// Build map locations: for the overview, show only the current location of each product
function buildProductMapLocations() {
    const locations: Array<{ lat: number; lng: number; label: string; role: string; timestamp: string; isActive: boolean }> = [];

    DEMO_PRODUCTS.forEach(product => {
        const batches = DEMO_BATCHES.filter(b => b.product_id === product.id && b.status !== 'Flagged');
        if (batches.length === 0) return;

        const latestBatch = batches[batches.length - 1];
        const transfers = DEMO_TRANSFERS.filter(t => batches.some(b => b.batch_id === t.batch_id));
        const lastTransfer = transfers[transfers.length - 1];

        // Only add CURRENT location for the overview
        if (lastTransfer) {
            const destStr = lastTransfer.location.split('→').pop()?.trim() || lastTransfer.location;
            const destCoords = findCoords(destStr);
            locations.push({
                ...destCoords,
                label: `${product.product_name} — ${destStr}`,
                role: lastTransfer.status === 'In Transit' ? 'In Transit' : 'Current Location',
                timestamp: lastTransfer.timestamp,
                isActive: lastTransfer.status === 'In Transit',
            });
        } else {
            const originCoords = findCoords(latestBatch.origin_location);
            locations.push({
                ...originCoords,
                label: `${product.product_name} — Origin: ${latestBatch.origin_location}`,
                role: 'Manufacturer (Origin)',
                timestamp: latestBatch.production_date + 'T00:00:00Z',
                isActive: true,
            });
        }
    });

    // Also add user-created products from localStorage
    if (typeof window !== 'undefined') {
        try {
            const stored = JSON.parse(localStorage.getItem('user_products') || '[]');
            stored.forEach((p: any) => {
                const coords = findCoords(p.origin || 'Mumbai');
                locations.push({
                    ...coords,
                    label: `${p.name} — ${p.origin || 'Manufacturing'}`,
                    role: 'Product Registered',
                    timestamp: p.created_at || new Date().toISOString(),
                    isActive: true,
                });
            });
        } catch { }
    }

    return locations;
}

// Build map locations for a SINGLE selected product's journey
function buildSingleProductJourney(data: BatchData) {
    const locations: Array<{ lat: number; lng: number; label: string; role: string; timestamp: string; isActive: boolean }> = [];

    // 1. Origin
    const originCoords = findCoords(data.batch.origin_location || 'Mumbai');
    locations.push({
        ...originCoords,
        label: `Origin: ${data.batch.origin_location || 'Manufacturing'}`,
        role: 'Manufacturer',
        timestamp: data.batch.created_at || data.batch.production_date,
        isActive: data.transfers.length === 0,
    });

    // 2. Transfers
    data.transfers.forEach((t, i) => {
        const destStr = t.location.split('→').pop()?.trim() || t.location;
        const coords = findCoords(destStr);
        locations.push({
            ...coords,
            label: `To: ${destStr}`,
            role: t.to_role || 'Logistics',
            timestamp: t.timestamp,
            isActive: i === data.transfers.length - 1,
        });
    });

    return locations;
}

interface BatchData {
    batch: any;
    transfers: any[];
    scans: any[];
    verification: {
        status: 'genuine' | 'suspicious' | 'counterfeit';
        trustScore: number;
        warnings: string[];
        missingLink?: string | null;
        isExpired: boolean;
        supplyChainComplete: boolean;
        scanCount: number;
        duplicateScans: number;
        anomalies: number;
    };
}

const SUPPLY_CHAIN_STAGES = [
    { key: 'manufacturer', label: 'Manufactured', icon: Factory, color: 'emerald' },
    { key: 'logistics', label: 'In Transit', icon: Truck, color: 'amber' },
    { key: 'warehouse', label: 'Warehouse Hub', icon: Building2, color: 'blue' },
    { key: 'vendor', label: 'Vendor / Retail', icon: Package, color: 'purple' },
    { key: 'delivered', label: 'Delivered / Final', icon: CheckCircle, color: 'emerald' },
];

export default function TrackingPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState<BatchData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [productRows, setProductRows] = useState<any[]>([]);
    const [mapLocations, setMapLocations] = useState<any[]>([]);

    useEffect(() => {
        setProductRows(buildProductTrackingRows());
        setMapLocations(buildProductMapLocations());
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true); setError(''); setData(null);

        // Check localStorage first for immediate feedback on newly created products
        if (typeof window !== 'undefined') {
            try {
                const stored = JSON.parse(localStorage.getItem('user_products') || '[]');
                const found = stored.find((p: any) =>
                    p.batch_id.toLowerCase() === searchQuery.trim().toLowerCase() ||
                    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                );

                if (found) {
                    setData({
                        batch: {
                            batch_id: found.batch_id,
                            product_name: found.name,
                            product_category: found.category,
                            sku: found.sku,
                            manufacturer_name: found.manufacturer,
                            origin_location: found.origin,
                            production_date: found.production_date,
                            status: 'CREATED',
                            created_at: found.created_at,
                        },
                        transfers: [],
                        scans: [],
                        verification: {
                            status: 'genuine',
                            trustScore: 40, // Baseline for new product
                            warnings: ['Newly registered — Supply chain in progress'],
                            isExpired: false,
                            missingLink: null,
                            supplyChainComplete: false,
                            scanCount: 0,
                            duplicateScans: 0,
                            anomalies: 0,
                        },
                    });
                    setLoading(false);
                    return;
                }
            } catch { }
        }

        try {
            const res = await fetch(`/api/verify/${encodeURIComponent(searchQuery.trim())}`, { method: 'POST' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Product not found');
            setData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to track product');
        } finally { setLoading(false); }
    };

    // Quick search from table row
    const handleProductClick = (batchId: string) => {
        setSearchQuery(batchId);
        // Trigger search
        setLoading(true); setError(''); setData(null);
        fetch(`/api/verify/${encodeURIComponent(batchId)}`, { method: 'POST' })
            .then(res => res.json())
            .then(result => {
                if (result.error) throw new Error(result.error);
                setData(result);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    const getSearchMapLocations = () => {
        if (!data) return [];
        const locations: Array<{ lat: number; lng: number; label: string; role: string; timestamp: string; isActive: boolean }> = [];

        const originCoords = findCoords(data.batch.origin_location || 'Mumbai');
        locations.push({
            ...originCoords,
            label: `${data.batch.product_name} — ${data.batch.origin_location || 'Origin'}`,
            role: 'Manufacturer',
            timestamp: data.batch.production_date || data.batch.created_at,
            isActive: data.transfers.length === 0,
        });

        data.transfers.forEach((transfer, i) => {
            const loc = transfer.location || '';
            const destStr = loc.split('→').pop()?.trim() || loc;
            const coords = findCoords(destStr);

            locations.push({
                ...coords,
                label: `${data.batch.product_name} — ${destStr}`,
                role: transfer.to_role || 'Transfer',
                timestamp: transfer.timestamp,
                isActive: i === data.transfers.length - 1,
            });
        });

        return locations;
    };

    const getCurrentStage = () => {
        if (!data) return -1;
        if (data.batch.status === 'DELIVERED') return 4;
        const roles = data.transfers.map((t: any) => (t.to_role || '').toLowerCase());
        if (roles.some(r => r.includes('vendor') || r.includes('retail') || r.includes('pharmacy') || r.includes('boutique'))) return 3;
        if (roles.some(r => r.includes('warehouse') || r.includes('storage') || r.includes('depot'))) return 2;
        if (roles.some(r => r.includes('distributor') || r.includes('logistic') || r.includes('freight') || r.includes('swift') || r.includes('rapid'))) return 1;
        return 0;
    };

    const getCurrentLocation = () => {
        if (!data) return 'Unknown';
        if (data.transfers.length === 0) return data.batch.origin_location || 'Manufacturer';
        const lastTransfer = data.transfers[data.transfers.length - 1];
        const loc = lastTransfer.location || '';
        return loc.split('→').pop()?.trim() || lastTransfer.to_role || 'In Transit';
    };

    const activeMapLocations = data ? getSearchMapLocations() : mapLocations;

    return (
        <DashboardShell>
            <PageHeader
                title="Product Tracking"
                description="Track medicines across India — search by medicine name, batch ID, or shipment ID"
                icon={Globe}
            />

            {/* Product Search Bar */}
            <div className="mb-6">
                <form onSubmit={handleSearch} className="relative max-w-3xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by Product Name, Batch ID (BAT-xxx), or Shipment ID (SHP-xxx)..."
                        className="w-full pl-12 pr-32 py-4 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-xl text-gray-200 text-sm placeholder-gray-500 shadow-xl shadow-black/20 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                    <button type="submit" disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50">
                        {loading ? 'Searching...' : 'Track Product'}
                    </button>
                </form>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard icon={Box} label="Products Tracked" value={DEMO_PRODUCTS.length} color="emerald" />
                <MetricCard icon={Truck} label="Active Shipments" value={DEMO_KPI_METRICS.activeShipments} color="blue" />
                <MetricCard icon={CheckCircle} label="Delivered" value={DEMO_BATCHES.filter(b => b.status === 'Delivered').length} color="emerald" />
                <MetricCard icon={Shield} label="Avg Trust Score" value={`${DEMO_KPI_METRICS.avgTrustScore}/100`} color="emerald" />
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
                        <p className="text-sm font-medium text-emerald-500">Tracking product through supply chain...</p>
                    </div>
                </div>
            )}

            {error && !loading && (
                <div className="max-w-2xl mx-auto p-6 bg-red-500/10 border border-red-500/30 rounded-xl shadow-lg mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-red-300 mb-2 text-center">Tracking Error</h2>
                    <p className="text-red-400/80 text-sm whitespace-pre-line text-center">{error}</p>
                </div>
            )}

            {/* Map — always visible */}
            {!loading && activeMapLocations.length > 0 && (
                <div className="mb-6">
                    <Suspense fallback={
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 h-[450px] flex items-center justify-center">
                            <p className="text-gray-500 text-sm animate-pulse">Initializing product tracking map...</p>
                        </div>
                    }>
                        <div className="shadow-lg rounded-xl overflow-hidden pointer-events-auto h-[450px]">
                            <TrackingMap locations={activeMapLocations} />
                        </div>
                    </Suspense>
                </div>
            )}

            {/* Default: Product Tracking Table */}
            {!data && !loading && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden shadow-lg animate-in fade-in duration-700">
                    <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-400" />
                            All Tracked Products
                        </h3>
                        <p className="text-xs text-gray-500">Click a row to track</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-800/30 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700/30">
                                    <th className="px-6 py-3 font-medium">Product Name</th>
                                    <th className="px-6 py-3 font-medium hidden sm:table-cell">Category</th>
                                    <th className="px-6 py-3 font-medium hidden md:table-cell">Manufacturer</th>
                                    <th className="px-6 py-3 font-medium">Current Location</th>
                                    <th className="px-6 py-3 font-medium hidden lg:table-cell">Stage</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Track</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/30">
                                {productRows.map((row: any) => (
                                    <tr key={row.id} className="hover:bg-gray-700/20 transition-colors cursor-pointer" onClick={() => handleProductClick(row.latest_batch)}>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-200">{row.product_name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{row.latest_batch}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300 hidden sm:table-cell">{row.category}</td>
                                        <td className="px-6 py-4 text-sm text-gray-400 hidden md:table-cell">{row.manufacturer}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            {row.current_location}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400 hidden lg:table-cell">{row.current_stage}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 bg-gray-700/30 hover:bg-gray-700 rounded-md transition-colors">
                                                <ArrowRight className="w-4 h-4 text-emerald-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Searched Product Detail View */}
            {data && !loading && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Back button */}
                    <button onClick={() => { setData(null); setSearchQuery(''); setError(''); }}
                        className="text-sm text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1.5">
                        ← Back to all products
                    </button>

                    {/* Map already updates via activeMapLocations above */}

                    {/* Current Location & Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard icon={MapPin} label="Current Location" value={getCurrentLocation()} color="emerald" />
                        <MetricCard icon={Package} label="Product Status" value={data.batch.status?.replace(/_/g, ' ') || 'CREATED'} color="blue" />
                        <MetricCard icon={Clock} label="Last Check-in"
                            value={data.transfers.length > 0
                                ? new Date(data.transfers[data.transfers.length - 1].timestamp).toLocaleDateString()
                                : 'Awaiting first transfer'
                            } color="amber" />
                        <MetricCard icon={Shield} label="Trust Score" value={`${data.verification.trustScore}/100`}
                            color={data.verification.trustScore >= 80 ? 'emerald' : data.verification.trustScore >= 50 ? 'amber' : 'red'} />
                    </div>

                    {(data.verification.missingLink || data.verification.warnings.length > 0) && (
                        <MissingLinkDetector missingLink={data.verification.missingLink} warnings={data.verification.warnings} />
                    )}

                    {/* Supply Chain Timeline */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 shadow-lg">
                        <h2 className="text-lg font-semibold text-gray-200 mb-8 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-400" />
                            Product Journey — {data.batch.product_name}
                        </h2>

                        <div className="relative max-w-5xl mx-auto overflow-x-auto overflow-y-hidden pb-4 mb-4 scrollbar-thin scrollbar-thumb-gray-700">
                            <div className="flex items-center justify-between min-w-[600px] sm:min-w-0">
                                {SUPPLY_CHAIN_STAGES.map((stage, i) => {
                                    const currentStage = getCurrentStage();
                                    const isCompleted = i <= currentStage;
                                    const isCurrent = i === currentStage;
                                    const Icon = stage.icon;

                                    return (
                                        <div key={stage.key} className="flex flex-col items-center relative flex-1">
                                            {i > 0 && (
                                                <div className={`absolute top-5 -left-1/2 right-1/2 h-[3px] transition-all duration-500 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-gray-700'}`}></div>
                                            )}
                                            <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCurrent
                                                ? 'bg-emerald-900/60 border-emerald-400 shadow-[0_0_15px_#34d399]'
                                                : isCompleted ? 'bg-emerald-900/40 border-emerald-600/50' : 'bg-gray-800 border-gray-600'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${isCompleted && !isCurrent ? 'text-emerald-500' : isCurrent ? 'text-emerald-300' : 'text-gray-500'}`} />
                                                {isCurrent && (
                                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`mt-3 text-xs font-semibold text-center uppercase tracking-wider ${isCurrent ? 'text-emerald-400' : isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {stage.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Product Detail + Trust Score */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-lg">
                            <h3 className="text-base font-semibold text-gray-200 border-b border-gray-700/50 pb-4 mb-4 flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-400" /> Product Details
                            </h3>
                            <div className="space-y-4 pr-2">
                                {[
                                    { label: 'Product Name', value: data.batch.product_name },
                                    { label: 'Batch ID', value: data.batch.batch_id, mono: true },
                                    { label: 'Category', value: data.batch.product_category || 'N/A' },
                                    { label: 'SKU', value: data.batch.sku || 'N/A', mono: true },
                                    { label: 'Manufacturer', value: data.batch.manufacturer_name || data.batch.manufacturer_address },
                                    { label: 'Origin', value: data.batch.origin_location || 'N/A' },
                                    { label: 'Produced', value: data.batch.production_date ? new Date(data.batch.production_date).toLocaleDateString() : '—' },
                                    { label: 'Chain Status', value: data.verification.supplyChainComplete ? '✓ Complete' : 'In Progress', warn: !data.verification.supplyChainComplete },
                                ].map((item) => (
                                    <div key={item.label} className="grid grid-cols-3 gap-2 bg-gray-900/30 p-3 rounded-lg border border-gray-800/50">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider col-span-1 flex items-center">{item.label}</span>
                                        <span className={`text-sm col-span-2 text-right ${item.warn ? 'text-amber-400' : item.mono ? 'font-mono text-emerald-400' : 'text-gray-200 font-medium'}`}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 flex flex-col items-center justify-center shadow-lg">
                            <TrustScoreBadge score={data.verification.trustScore} />
                        </div>
                    </div>

                    {/* Movement History */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden shadow-lg">
                        <div className="px-6 py-5 border-b border-gray-700/50 bg-gray-900/30">
                            <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-400" /> Product Movement History
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-800/80 text-xs text-gray-400 uppercase tracking-widest border-b border-gray-700/50">
                                        <th className="px-6 py-4 font-semibold">Stage</th>
                                        <th className="px-6 py-4 font-semibold hidden sm:table-cell">Handler</th>
                                        <th className="px-6 py-4 font-semibold">Location</th>
                                        <th className="px-6 py-4 font-semibold hidden md:table-cell">Timestamp</th>
                                        <th className="px-6 py-4 font-semibold text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/30">
                                    <tr className="hover:bg-gray-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-200">Product Created</p>
                                            <p className="text-xs text-emerald-400">Manufacturer</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400 hidden sm:table-cell">{data.batch.manufacturer_name || data.batch.manufacturer_address}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">{data.batch.origin_location || 'Origin'}</td>
                                        <td className="px-6 py-4 text-xs text-gray-400 hidden md:table-cell">{data.batch.created_at ? new Date(data.batch.created_at).toLocaleString() : '—'}</td>
                                        <td className="px-6 py-4 text-right"><StatusBadge status="CREATED" /></td>
                                    </tr>
                                    {data.transfers.map((transfer, i) => (
                                        <tr key={transfer.id || i} className="hover:bg-gray-700/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-gray-200">Custody Transfer</p>
                                                <p className="text-xs text-blue-400">{transfer.from_role} → {transfer.to_role}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-400 hidden sm:table-cell">{transfer.to_role}</td>
                                            <td className="px-6 py-4 text-sm text-gray-300 font-medium">{transfer.location || '—'}</td>
                                            <td className="px-6 py-4 text-xs text-gray-400 hidden md:table-cell">{new Date(transfer.timestamp).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right"><StatusBadge status={i === data.transfers.length - 1 ? 'IN_TRANSIT' : 'DELIVERED'} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </DashboardShell>
    );
}
