'use client';

import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actions }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">{title}</h1>
                    {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
