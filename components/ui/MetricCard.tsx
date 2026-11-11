'use client';

import { type LucideIcon } from 'lucide-react';

interface MetricCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    trend?: { value: number; isPositive: boolean };
    color?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'pink' | 'teal';
}

const colorMap = {
    emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', text: 'text-emerald-400', hover: 'hover:border-emerald-500/40' },
    blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400', hover: 'hover:border-blue-500/40' },
    amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400', hover: 'hover:border-amber-500/40' },
    red: { border: 'border-red-500/20', bg: 'bg-red-500/10', text: 'text-red-400', hover: 'hover:border-red-500/40' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', hover: 'hover:border-purple-500/40' },
    pink: { border: 'border-pink-500/20', bg: 'bg-pink-500/10', text: 'text-pink-400', hover: 'hover:border-pink-500/40' },
    teal: { border: 'border-teal-500/20', bg: 'bg-teal-500/10', text: 'text-teal-400', hover: 'hover:border-teal-500/40' },
};

export function MetricCard({ icon: Icon, label, value, trend, color = 'emerald' }: MetricCardProps) {
    const c = colorMap[color];

    return (
        <div className={`bg-gray-800/50 backdrop-blur-sm border ${c.border} ${c.hover}
                         rounded-xl p-5 transition-all duration-200 hover:shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${c.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${c.text}`} />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.isPositive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                        {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                    </span>
                )}
            </div>
            <div className={`text-3xl font-bold ${c.text} mb-1`}>{value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</div>
        </div>
    );
}
