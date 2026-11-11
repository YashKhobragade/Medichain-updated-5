'use client';

import { StockAlertCard } from '@/components/inventory/StockBadge';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { useWallet } from '@/contexts/WalletContext';
import { ROLE_LABELS } from '@/lib/roles';
import {
    LayoutDashboard, Package, ArrowLeftRight, ShieldCheck, AlertTriangle,
    Clock, ArrowRight, Activity, Bell, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    DEMO_BATCHES, DEMO_ALERTS, DEMO_TRANSFERS, DEMO_PRODUCTS,
    ANALYTICS_TRANSFER_VOLUME
} from '@/utils/demo';

interface DashboardStats {
    totalBatches: number;
    inTransit: number;
    delivered: number;
    flagged: number;
    pendingAction: number;
    recentTransfers: any[];
    alerts: any[];
}

// Product name lookup
const PRODUCT_MAP: Record<string, string> = {};
DEMO_PRODUCTS.forEach(p => { PRODUCT_MAP[p.id] = p.product_name; });

export default function Dashboard() {
    const { user, userRole } = useAuth();
    const { isConnected, account } = useWallet();
    const [stats, setStats] = useState<DashboardStats>({
        totalBatches: 0, inTransit: 0, delivered: 0, flagged: 0, pendingAction: 0, recentTransfers: [], alerts: []
    });
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [activity, setActivity] = useState<{ kind: string; at: string; text: string }[] | null>(null);

    useEffect(() => {
        fetchStats();
        buildChartData();
    }, []);

    const buildChartData = () => {
        // Merge demo + user products for chart
        const baseData = ANALYTICS_TRANSFER_VOLUME.slice(-7).map(d => ({
            name: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
            shipments: d.volume,
        }));

        // Add user-created products count bump
        if (typeof window !== 'undefined') {
            try {
                const stored = JSON.parse(localStorage.getItem('user_products') || '[]');
                if (stored.length > 0 && baseData.length > 0) {
                    baseData[baseData.length - 1].shipments += stored.length;
                }
            } catch { }
        }
        setChartData(baseData);
    };

    const fetchStats = async () => {
        try {
            const res = await authFetch('/api/batches/list');
            const data = res.ok ? await res.json() : null;
            const arr: any[] = Array.isArray(data?.batches) ? data.batches : [];
            if (data) setActivity(Array.isArray(data.activity) ? data.activity : []);

            const alertsRes = await fetch('/api/analytics/counterfeit');
            const alertsData = alertsRes.ok ? await alertsRes.json() : { events: [] };

            if (data) {
                setStats({
                    totalBatches: arr.length,
                    inTransit: arr.filter((b: any) => b.status === 'IN_TRANSIT').length,
                    delivered: arr.filter((b: any) => b.status === 'DELIVERED').length,
                    flagged: arr.filter((b: any) => b.status === 'FLAGGED').length,
                    // waiting for someone to act: not shipped yet, or on the way and not confirmed
                    pendingAction: arr.filter((b: any) => b.status === 'CREATED' || b.status === 'IN_TRANSIT').length,
                    recentTransfers: arr.slice(0, 7),
                    alerts: alertsData.events ? alertsData.events.slice(0, 4) : [],
                });
                setLoading(false);
                return;
            }
        } catch (e) {
            console.log('API unavailable, using local data');
        }

        // Fallback: merge demo + localStorage data
        useDemoData();
    };

    const useDemoData = () => {
        let combinedBatchesSource = [...DEMO_BATCHES];
        if (typeof window !== 'undefined') {
            try {
                const stored = JSON.parse(localStorage.getItem('user_products') || '[]');
                combinedBatchesSource = [...stored, ...combinedBatchesSource];
            } catch { }
        }

        const batchRows = combinedBatchesSource
            .filter(b => b.status !== 'Flagged')
            .slice(0, 7)
            .map((b: any) => {
                const name = PRODUCT_MAP[b.product_id] || b.product_name || b.name || b.product_id;
                return {
                    batch_id: b.batch_id,
                    product_name: name,
                    status: b.status === 'Delivered' ? 'DELIVERED' : b.status === 'In Transit' ? 'IN_TRANSIT' : b.status === 'Processing' ? 'CREATED' : b.status === 'CREATED' ? 'CREATED' : 'IN_TRANSIT',
                    production_date: b.production_date,
                };
            });

        setStats({
            totalBatches: combinedBatchesSource.length,
            inTransit: combinedBatchesSource.filter(b => b.status === 'In Transit' || b.status === 'IN_TRANSIT').length,
            delivered: combinedBatchesSource.filter(b => b.status === 'Delivered' || b.status === 'DELIVERED').length,
            flagged: combinedBatchesSource.filter(b => b.status === 'Flagged' || b.status === 'FLAGGED').length,
            pendingAction: Math.floor(combinedBatchesSource.length * 0.15),
            recentTransfers: batchRows,
            alerts: DEMO_ALERTS.filter(a => a.severity === 'Critical' || a.severity === 'High').slice(0, 4),
        });
        setLoading(false);
    };

    // Recent activity: real creations and shipments when available, demo history otherwise
    const COLOR: Record<string, string> = { created: 'blue', sent: 'amber', received: 'emerald' };
    const recentActivity = activity ? activity.map(a => ({ text: a.text, time: new Date(a.at).toLocaleString(), color: COLOR[a.kind] ?? 'blue' })) : DEMO_TRANSFERS.slice(-3).reverse().map((t, i) => ({
        text: i === 0
            ? `Transfer initiated: ${t.from_company} → ${t.to_company}`
            : i === 1
                ? `Shipment arrived at ${t.to_company}`
                : `QR Code verified at ${t.location}`,
        time: new Date(t.timestamp).toLocaleString(),
        color: i === 0 ? 'blue' : i === 1 ? 'emerald' : 'amber',
    }));

    // Dynamic title based on role
    const dashboardTitle = user?.full_name
        ? `${user.full_name}'s Dashboard`
        : 'Control Tower';
    const dashboardDesc = userRole
        ? `${ROLE_LABELS[userRole]} View — MediChain Medicine Supply Chain`
        : 'MediChain Medicine Supply Chain Overview';

    return (
        <DashboardShell>
            <div className="flex flex-col gap-6 w-full">
                <PageHeader
                    title={dashboardTitle}
                    description={dashboardDesc}
                    icon={LayoutDashboard}
                    actions={
                        <div className="flex items-center gap-3">
                            {isConnected && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-mono text-emerald-400 hidden sm:block">
                                        {account?.slice(0, 6)}...{account?.slice(-4)}
                                    </span>
                                </div>
                            )}
                        </div>
                    }
                />

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                    <MetricCard icon={Package} label="Total Tracked" value={loading ? '—' : stats.totalBatches} color="blue" />
                    <MetricCard icon={ArrowLeftRight} label="Active Shipments" value={loading ? '—' : stats.inTransit} color="emerald" />
                    <MetricCard icon={ShieldCheck} label="Verified Delivered" value={loading ? '—' : stats.delivered} color="emerald" />
                    <MetricCard icon={Clock} label="Pending Action" value={loading ? '—' : stats.pendingAction} color="amber" />
                    <MetricCard icon={AlertTriangle} label="Counterfeit Alerts" value={loading ? '—' : stats.flagged} color="red" />
                </div>
                <div className="mt-4"><StockAlertCard /></div>

                {/* Main Visualizations Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Medicine Shipment Activity Bar Chart */}
                    <div className="lg:col-span-8 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-400" />
                                Medicine Shipment Activity
                            </h3>
                        </div>
                        <div className="flex-1 w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6', borderRadius: '8px' }}
                                        itemStyle={{ color: '#60A5FA' }}
                                    />
                                    <Bar dataKey="shipments" name="Shipments" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Alerts Panel */}
                    <div className="lg:col-span-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-red-400" />
                                Critical Alerts
                            </h3>
                            <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2 py-1 rounded-full">{stats.alerts.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {loading ? (
                                <div className="text-gray-500 text-sm">Loading alerts...</div>
                            ) : stats.alerts.length === 0 ? (
                                <div className="text-gray-500 text-sm text-center py-10">No critical alerts detected. All systems nominal.</div>
                            ) : (
                                stats.alerts.map((alert: any, i: number) => (
                                    <div key={alert.alert_id || i} className="flex gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:border-red-500/40 transition-colors cursor-pointer">
                                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-200">{alert.alert_type || alert.metadata?.action || 'Suspicious Activity'}</p>
                                            <p className="text-xs text-gray-400 mt-1">{alert.description || `Batch: ${alert.batch_id}`}</p>
                                            <p className="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Detailed Data Tables Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Live Shipment Tracker */}
                    <div className="lg:col-span-8 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700/50">
                            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-emerald-400" />
                                Live Medicine Tracker
                            </h3>
                            <Link href="/analytics" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">View All</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-800/30 text-gray-400 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-3 font-medium">Batch ID</th>
                                        <th className="px-6 py-3 font-medium">Medicine Name</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium hidden md:table-cell">Production Date</th>
                                        <th className="px-6 py-3 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50 text-sm text-gray-300">
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading shipments...</td></tr>
                                    ) : stats.recentTransfers.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-500">No active shipments found.</td></tr>
                                    ) : (
                                        stats.recentTransfers.map((batch: any, i: number) => (
                                            <tr key={batch.batch_id || i} className="hover:bg-gray-700/20 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs">{batch.batch_id}</td>
                                                <td className="px-6 py-4 font-medium">{batch.product_name || 'N/A'}</td>
                                                <td className="px-6 py-4"><StatusBadge status={batch.status || 'CREATED'} /></td>
                                                <td className="px-6 py-4 hidden md:table-cell text-gray-400">
                                                    {new Date(batch.production_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link href={`/tracking`} className="inline-flex items-center justify-center p-2 bg-gray-700/30 hover:bg-gray-700 rounded-md transition-colors">
                                                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Event Log */}
                    <div className="lg:col-span-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 flex flex-col p-6">
                        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2 mb-6">
                            <Clock className="w-5 h-5 text-amber-400" />
                            Recent Activity Log
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                            {recentActivity.length === 0 && <p className="text-sm text-gray-500">Nothing yet. Create a batch or ship one to see it here.</p>}
                            {recentActivity.map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1 relative flex flex-col justify-start items-center">
                                        <div className={`w-2.5 h-2.5 bg-${item.color}-500 rounded-full z-10 border-2 border-gray-900`}></div>
                                        {i < recentActivity.length - 1 && (
                                            <div className="w-0.5 h-full bg-gray-700 absolute top-2.5"></div>
                                        )}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-sm text-gray-200">{item.text}</p>
                                        <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
