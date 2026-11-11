'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    // Verify stays public: a patient must be able to scan a QR without an account
    const isPublic = pathname === '/verify' || pathname.startsWith('/verify/');

    useEffect(() => {
        if (!loading && !isAuthenticated && !isPublic) router.replace('/login');
    }, [loading, isAuthenticated, isPublic, router]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    return (
        <div className="flex h-screen bg-gray-950 overflow-hidden">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[9998] lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — hidden on mobile unless mobileOpen */}
            <div className={`
                hidden lg:block
            `}>
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            </div>

            {/* Mobile sidebar */}
            <div className={`
                lg:hidden fixed inset-y-0 left-0 w-[240px] z-[9999] transition-transform duration-300
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
            </div>

            {/* Main content area */}
            <div
                className={`flex-1 flex flex-col overflow-hidden transition-all duration-300
                           ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-[240px]'}`}
            >
                <TopBar
                    onMenuClick={() => setMobileOpen(!mobileOpen)}
                    sidebarCollapsed={collapsed}
                />
                <main className="flex-1 overflow-y-auto">
                    <div className="p-6 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
