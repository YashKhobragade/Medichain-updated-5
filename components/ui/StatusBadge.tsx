'use client';

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    CREATED: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
    IN_TRANSIT: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    DELIVERED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    FLAGGED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    genuine: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    suspicious: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    counterfeit: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    expired: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    not_found: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-400' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    INFO: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
    WARNING: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    ERROR: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
};

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const style = statusStyles[status] || statusStyles.INFO;
    const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

    return (
        <span className={`inline-flex items-center gap-1.5 ${padding} font-medium rounded-full ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
            {status.replace(/_/g, ' ')}
        </span>
    );
}
