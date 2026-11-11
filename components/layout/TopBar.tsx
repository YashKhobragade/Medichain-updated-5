'use client';

import { usePathname } from 'next/navigation';
import { Bell, Menu, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/roles';

// Map routes to readable names
const routeNames: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/manufacturer': 'Create Product',
    '/distributor': 'Transfers',
    '/vendor': 'Pharmacy',
    '/inventory': 'Inventory Scan',
    '/tracking': 'Live Tracking',
    '/admin': 'Admin',
    '/verify': 'QR Verification',
    '/analytics': 'Analytics',
    '/bulk-verify': 'Bulk Verification',
};

interface TopBarProps {
    onMenuClick: () => void;
    sidebarCollapsed: boolean;
}

export function TopBar({ onMenuClick, sidebarCollapsed }: TopBarProps) {
    const pathname = usePathname();
    const { user, userRole } = useAuth();

    const pageTitle = routeNames[pathname] ||
        Object.entries(routeNames).find(([route]) => pathname.startsWith(route))?.[1] ||
        'Dashboard';

    return (
        <header className="h-16 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 flex items-center justify-between px-6">
            {/* Left: hamburger + title */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-gray-100">{pageTitle}</h1>
                </div>
            </div>

            {/* Right: notifications + profile */}
            <div className="flex items-center gap-3">
                {/* Notification bell */}
                <button className="relative p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors">
                    <Bell className="w-5 h-5" />
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-800">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-medium text-gray-200">{user?.full_name || 'User'}</p>
                        {userRole && (
                            <p className="text-xs text-gray-500">{ROLE_LABELS[userRole]}</p>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
