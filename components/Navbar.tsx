'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Menu, X, Home, Info, Compass, Package, Phone, LogOut, User as UserIcon, Sparkles, ChevronDown } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { LimelightNav } from './LimelightNav';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/lib/roles';
import { useState } from 'react';

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, user, userRole, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Hide navbar on landing page, login, and signup pages
    const hideNavbar = pathname === '/' || pathname === '/login' || pathname === '/signup';

    if (hideNavbar) {
        return null;
    }

    const navItems = isAuthenticated ? [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Features', href: '/features', icon: Package },
        { name: 'Analytics', href: '/analytics', icon: Compass },
    ] : [
        { name: 'About', href: '/about', icon: Info },
        { name: 'How It Works', href: '/how-it-works', icon: Compass },
        { name: 'Contact', href: '/contact', icon: Phone },
    ];

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    // LimelightNav items
    const limelightItems = [
        {
            id: 'home',
            icon: <Home className="w-6 h-6" />,
            label: 'Home',
            onClick: () => router.push('/dashboard')
        },
        {
            id: 'features',
            icon: <Package className="w-6 h-6" />,
            label: 'Features',
            onClick: () => router.push('/features')
        },
        {
            id: 'contact',
            icon: <Phone className="w-6 h-6" />,
            label: 'Contact',
            onClick: () => router.push('/contact')
        },
    ];

    const getDefaultActiveIndex = () => {
        if (pathname === '/dashboard') return 0;
        if (pathname.startsWith('/features')) return 1;
        if (pathname.startsWith('/contact')) return 2;
        return 0;
    };

    return (
        <header className="bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/95 backdrop-blur-xl sticky top-0 z-50 border-b border-green-500/10 shadow-2xl shadow-black/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-3 group relative">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 blur-xl group-hover:bg-green-500/30 transition-all rounded-full"></div>
                            <img
                                src="/logo.png"
                                alt="MediChain Logo"
                                className="w-12 h-12 relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-300"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                                MediChain
                            </h1>
                            {userRole && (
                                <p className="text-xs text-gray-400 font-medium">
                                    {ROLE_LABELS[userRole]}
                                </p>
                            )}
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`group relative px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${active
                                        ? 'text-green-400 bg-green-500/10'
                                        : 'text-gray-300 hover:text-green-400 hover:bg-gray-800/50'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'text-green-400' : ''}`} />
                                    <span>{item.name}</span>
                                    {active && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"></div>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Auth & Wallet Section */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                {/* Wallet Connect */}
                                <div className="hidden lg:block">
                                    <WalletConnect />
                                </div>

                                {/* User Menu */}
                                <div className="hidden lg:flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-800/80 to-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm hover:border-green-500/30 transition-all group">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                                            <UserIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-200">
                                                {user?.full_name || 'User'}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {user?.email}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/30 group"
                                        title="Logout"
                                    >
                                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Login/Signup */}
                                <div className="hidden lg:flex items-center gap-3">
                                    <Link
                                        href="/login"
                                        className="px-5 py-2.5 text-gray-300 hover:text-green-400 transition-all font-semibold rounded-xl hover:bg-gray-800/50"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="relative px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className="relative z-10 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            Sign Up
                                        </span>
                                    </Link>
                                </div>
                            </>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2.5 text-gray-300 hover:text-green-400 hover:bg-gray-800/50 rounded-xl transition-all border border-gray-700/50"
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="w-6 h-6" />
                            ) : (
                                <Menu className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="lg:hidden py-6 border-t border-gray-800 animate-in slide-in-from-top duration-300">
                        <nav className="flex flex-col gap-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${active
                                            ? 'text-green-400 bg-green-500/10 border border-green-500/30'
                                            : 'text-gray-300 hover:text-green-400 hover:bg-gray-800/50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}

                            <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                                {isAuthenticated ? (
                                    <>
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/80 to-gray-800/50 rounded-xl border border-gray-700/50">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-semibold text-gray-200">
                                                    {user?.full_name || 'User'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {user?.email}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Wallet Connect */}
                                        <div className="px-2">
                                            <WalletConnect />
                                        </div>

                                        {/* Logout */}
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-3 justify-center font-medium border border-red-500/20 hover:border-red-500/40"
                                        >
                                            <LogOut className="w-5 h-5" />
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <Link
                                            href="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block w-full px-4 py-3 text-center text-gray-300 hover:text-green-400 transition-all font-semibold border border-gray-700 rounded-xl hover:bg-gray-800/50"
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            href="/signup"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="block w-full px-4 py-3 text-center bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all"
                                        >
                                            Sign Up
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
