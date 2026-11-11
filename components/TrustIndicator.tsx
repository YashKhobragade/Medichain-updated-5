'use client';

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustIndicatorProps {
    status: 'genuine' | 'suspicious' | 'counterfeit';
    reason: string;
    className?: string;
}

export function TrustIndicator({ status, reason, className }: TrustIndicatorProps) {
    const config = {
        genuine: {
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-200',
            title: '✓ Genuine Product',
        },
        suspicious: {
            icon: AlertTriangle,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            title: '⚠ Suspicious Activity',
        },
        counterfeit: {
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-200',
            title: '✗ Counterfeit Detected',
        },
    };

    const { icon: Icon, color, bg, border, title } = config[status];

    return (
        <div className={cn('p-6 rounded-lg border-2', bg, border, className)}>
            <div className="flex items-start gap-4">
                <div className={cn('flex-shrink-0', color)}>
                    <Icon className="w-12 h-12" />
                </div>
                <div className="flex-1">
                    <h3 className={cn('text-2xl font-bold mb-2', color)}>
                        {title}
                    </h3>
                    <p className="text-gray-700">
                        {reason}
                    </p>
                </div>
            </div>
        </div>
    );
}
