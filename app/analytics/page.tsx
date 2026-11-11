'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import {
    BarChart3, Package, Shield, AlertTriangle, TrendingUp, Activity,
    ShieldAlert
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
    DEMO_KPI_METRICS,
    ANALYTICS_VERIFICATION_ACTIVITY,
    ANALYTICS_INVENTORY_BY_CATEGORY,
    ANALYTICS_MONTHLY_TRANSFERS,
} from '@/utils/demo';

// 1. Product Transfer Volume data (from demo data — stable, no randomness)
const transferVolumeData = ANALYTICS_MONTHLY_TRANSFERS.map(d => ({
    name: d.month.split(' ')[0], // "Oct 2025" -> "Oct"
    volume: d.completed,
    projected: d.transfers,
}));

// 2. Verification Activity data (from demo data — last 7 days)
const verificationActivityData = ANALYTICS_VERIFICATION_ACTIVITY.slice(-7).map(d => ({
    name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    genuine: d.valid,
    suspicious: d.suspicious,
    counterfeit: Math.max(1, Math.floor(d.suspicious * 0.3)),
}));

// 3. Inventory Distribution data
const inventoryData = ANALYTICS_INVENTORY_BY_CATEGORY.map((d, i) => ({
    name: d.category,
    value: d.units,
    color: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'][i],
}));

// 4. Counterfeit Alerts data (from monthly transfers — derived)
const counterfeitAlertsData = ANALYTICS_MONTHLY_TRANSFERS.map(d => ({
    name: d.month.split(' ')[0],
    alerts: d.failed * 8 + Math.floor(d.failed * 1.5),
    resolved: d.failed * 6 + Math.floor(d.failed * 0.8),
}));

export default function AnalyticsDashboard() {
    const [metrics, setMetrics] = useState(DEMO_KPI_METRICS);

    useEffect(() => {
        // Merge user-created products from localStorage
        if (typeof window !== 'undefined') {
            try {
                const stored = JSON.parse(localStorage.getItem('user_products') || '[]');
                if (stored.length > 0) {
                    setMetrics(prev => ({
                        ...prev,
                        totalProducts: prev.totalProducts + stored.length,
                        inventoryBatches: prev.inventoryBatches + stored.length,
                    }));
                }
            } catch { }
        }
    }, []);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700/50 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                    <p className="text-gray-200 font-semibold mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                            <span className="text-gray-400 capitalize">{entry.name}:</span>
                            <span className="text-gray-100 font-mono">{entry.value?.toLocaleString()}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <DashboardShell>
            <PageHeader
                title="Medicine Supply Chain Analytics"
                description="Comprehensive overview of medicine movement, verification integrity, and counterfeit detection across India."
                icon={BarChart3}
            />

            {/* Top KPI Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard icon={Activity} label="Total Transfer Volume" value={metrics.totalTransfers.toLocaleString() + '+'} color="emerald" />
                <MetricCard icon={ShieldAlert} label="Counterfeit Scans" value={metrics.counterfeitAlerts.toString()} color="red" />
                <MetricCard icon={Package} label="Active Inventory" value={metrics.inventoryBatches.toLocaleString()} color="blue" />
                <MetricCard icon={Shield} label="Avg Trust Score" value={`${metrics.avgTrustScore}%`} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">

                {/* 1. Product Transfer Volume (Area Chart) */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-base font-semibold text-gray-200">Medicine Transfer Volume</h2>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={transferVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="volume" name="Actual Volume" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                                <Area type="monotone" dataKey="projected" name="Projected" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Verification Activity (Stacked Bar Chart) */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <h2 className="text-base font-semibold text-gray-200">Verification Activity (Last 7 Days)</h2>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={verificationActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                <Bar dataKey="genuine" name="Genuine" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="suspicious" name="Suspicious" stackId="a" fill="#f59e0b" />
                                <Bar dataKey="counterfeit" name="Counterfeit" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Inventory Distribution (Donut Pie Chart) */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-purple-400" />
                        <h2 className="text-base font-semibold text-gray-200">Medicine Inventory Distribution</h2>
                    </div>
                    <div className="h-[300px] flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={inventoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {inventoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Counterfeit Alerts (Line Chart) */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <h2 className="text-base font-semibold text-gray-200">Counterfeit Alerts Trend</h2>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={counterfeitAlertsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                                <Line type="monotone" dataKey="alerts" name="Total Alerts" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="resolved" name="Resolved/Caught" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </DashboardShell>
    );
}
