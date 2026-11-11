'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User as UserIcon, ArrowRight, Shield, CheckCircle2, Briefcase } from 'lucide-react';
import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '@/lib/roles';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole | ''>('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const { signup } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!role) {
            setError('Please select your role');
            return;
        }

        setLoading(true);

        try {
            await signup(name, email, password, role as UserRole);
            // Show confirmation message instead of redirecting
            setShowConfirmation(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
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
                    <h2 className="text-2xl font-bold text-gray-100 mb-2">
                        {showConfirmation ? 'Check Your Email' : 'Create Account'}
                    </h2>
                    <p className="text-gray-400">
                        {showConfirmation ? 'We sent you a verification link' : 'Join the blockchain revolution'}
                    </p>
                </div>

                {/* Email Confirmation Message */}
                {showConfirmation ? (
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-xl">
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-bold text-gray-100">
                                    Account Created Successfully!
                                </h3>
                                <p className="text-gray-300 leading-relaxed">
                                    We've sent a verification email to <span className="font-semibold text-blue-400">{email}</span>
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Please check your inbox and click the verification link to activate your account.
                                </p>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-left text-sm text-gray-300">
                                        <p className="font-semibold text-blue-400 mb-1">Didn't receive the email?</p>
                                        <p className="text-gray-400">
                                            Check your spam folder or wait a few minutes. The email should arrive shortly.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/login"
                                className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all hover:scale-105 font-semibold"
                            >
                                Go to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Signup Form */
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2">
                                    Name <span className="font-normal text-gray-500">(organisations: your company name)</span>
                                </label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        id="name"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-100"
                                        placeholder="e.g. Midas Pharma"
                                    />
                                </div>
                            </div>

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
                                <label htmlFor="role" className="block text-sm font-semibold text-gray-300 mb-2">
                                    Select Your Role
                                </label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                                    <select
                                        id="role"
                                        required
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-100 appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled className="bg-gray-900">Choose your role...</option>
                                        <option value={USER_ROLES.MANUFACTURER} className="bg-gray-900">{ROLE_LABELS[USER_ROLES.MANUFACTURER]} - {ROLE_DESCRIPTIONS[USER_ROLES.MANUFACTURER]}</option>
                                        <option value={USER_ROLES.DISTRIBUTOR} className="bg-gray-900">{ROLE_LABELS[USER_ROLES.DISTRIBUTOR]} - {ROLE_DESCRIPTIONS[USER_ROLES.DISTRIBUTOR]}</option>
                                        <option value={USER_ROLES.PHARMACY} className="bg-gray-900">{ROLE_LABELS[USER_ROLES.PHARMACY]} - {ROLE_DESCRIPTIONS[USER_ROLES.PHARMACY]}</option>
                                        <option value={USER_ROLES.HOSPITAL} className="bg-gray-900">{ROLE_LABELS[USER_ROLES.HOSPITAL]} - {ROLE_DESCRIPTIONS[USER_ROLES.HOSPITAL]}</option>
                                        <option value={USER_ROLES.CUSTOMER} className="bg-gray-900">{ROLE_LABELS[USER_ROLES.CUSTOMER]} - {ROLE_DESCRIPTIONS[USER_ROLES.CUSTOMER]}</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {role && (
                                    <p className="mt-2 text-sm text-gray-400">
                                        ✓ {ROLE_DESCRIPTIONS[role as UserRole]}
                                    </p>
                                )}
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

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-300 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-gray-100"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="text-sm">
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input type="checkbox" required className="w-4 h-4 mt-1 rounded border-gray-700 bg-gray-900" />
                                    <span className="text-gray-400">
                                        I agree to the{' '}
                                        <Link href="#" className="text-blue-400 hover:text-blue-300">
                                            Terms of Service
                                        </Link>{' '}
                                        and{' '}
                                        <Link href="#" className="text-blue-400 hover:text-blue-300">
                                            Privacy Policy
                                        </Link>
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-xl hover:shadow-blue-500/50 transition-all hover:scale-105 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                                {!loading && <ArrowRight className="w-5 h-5" />}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-gray-400">
                                Already have an account?{' '}
                                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                )}

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
