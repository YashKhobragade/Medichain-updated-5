'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const quickLogin = async (demoEmail: string, home: string) => {
        setError(''); setLoading(true);
        try { await login(demoEmail, 'demo123'); router.push(home); }
        catch (err: any) { setError(err.message || 'Demo login failed'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4 py-20">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-4">
                        <Shield className="w-10 h-10 text-blue-400" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            MediChain
                        </h1>
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-100 mb-2">Welcome Back</h2>
                    <p className="text-gray-400">Sign in to access your account</p>
                </div>

                {/* Login Form */}
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-100"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    id="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-100"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-900" />
                                <span className="text-gray-400">Remember me</span>
                            </label>
                            <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all hover:scale-105 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-3">Demo accounts: one click to sign in (password <span className="font-mono text-gray-300">demo123</span>)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                                { email: 'manufacturer@medichain.io', org: 'PharmaCure Labs', role: 'Manufacturer', home: '/manufacturer' },
                                { email: 'distributor@medichain.io', org: 'MediTrust Distributors', role: 'Distributor', home: '/distributor' },
                                { email: 'pharmacy@medichain.io', org: 'HealthPlus Pharmacy', role: 'Pharmacy', home: '/distributor' },
                                { email: 'hospital@medichain.io', org: 'Apollo Hospital Pharmacy', role: 'Hospital', home: '/bulk-verify' },
                                { email: 'customer@medichain.io', org: 'Customer', role: 'Verify only', home: '/verify' },
                            ].map(a => (
                                <button key={a.email} type="button" disabled={loading} onClick={() => quickLogin(a.email, a.home)}
                                    className="text-left px-3 py-2 rounded-lg border border-gray-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors disabled:opacity-50">
                                    <span className="block text-sm text-gray-100">{a.org}</span>
                                    <span className="block text-[11px] text-gray-500">{a.role}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            Don't have an account?{' '}
                            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back to Home */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
