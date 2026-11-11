'use client';

import { useState } from 'react';
import { Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrustScoreBadgeProps {
    score: number;
    size?: 'sm' | 'md' | 'lg';
    showBreakdown?: boolean;
}

export function TrustScoreBadge({ score, size = 'md', showBreakdown = false }: TrustScoreBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Determine color based on score
    const getScoreColor = () => {
        if (score >= 80) return 'green';
        if (score >= 50) return 'yellow';
        return 'red';
    };

    const color = getScoreColor();

    const sizeClasses = {
        sm: 'text-sm px-3 py-1',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3',
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const colorClasses = {
        green: 'bg-green-900/30 border-green-500/50 text-green-200',
        yellow: 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200',
        red: 'bg-red-900/30 border-red-500/50 text-red-200',
    };

    const getIcon = () => {
        if (score >= 80) return <CheckCircle className={iconSizes[size]} />;
        if (score >= 50) return <AlertTriangle className={iconSizes[size]} />;
        return <Shield className={iconSizes[size]} />;
    };

    const getLabel = () => {
        if (score >= 80) return 'Trusted';
        if (score >= 50) return 'Caution';
        return 'High Risk';
    };

    return (
        <div className="relative inline-block">
            <div
                className={`
          flex items-center gap-2 rounded-lg border-2 font-semibold
          ${sizeClasses[size]}
          ${colorClasses[color]}
          transition-all duration-300 hover:scale-105 cursor-pointer
        `}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {getIcon()}
                <span>Trust Score: {score}/100</span>
                <span className="text-xs opacity-75">({getLabel()})</span>
            </div>

            {showTooltip && showBreakdown && (
                <div className="absolute z-10 top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[300px]">
                    <h4 className="text-sm font-bold mb-2 text-gray-100">Score Breakdown</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex justify-between">
                            <span>Supply Chain Complete:</span>
                            <span className="font-semibold">40 pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Expiry Valid:</span>
                            <span className="font-semibold">20 pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Transfer Timing:</span>
                            <span className="font-semibold">20 pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Scan Count:</span>
                            <span className="font-semibold">10 pts</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Baseline:</span>
                            <span className="font-semibold">10 pts</span>
                        </div>
                        <div className="border-t border-gray-600 pt-2 mt-2 flex justify-between font-bold text-gray-100">
                            <span>Total:</span>
                            <span>{score}/100</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
