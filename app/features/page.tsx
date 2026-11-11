'use client';

import Link from 'next/link';
import { Shield, Zap, Lock, Globe, CheckCircle2, Package, BarChart3, TruckIcon, Factory, Building2, User, ArrowRight } from 'lucide-react';

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 relative overflow-hidden">
                {/* Green animated background effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-block mb-4 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
                        🚀 Powerful Features
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent leading-tight">
                        Everything You Need for Secure Product Tracking
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                        Comprehensive blockchain-powered features to ensure product authenticity and supply chain integrity.
                    </p>
                </div>
            </section>

            {/* Core Features */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-4xl font-bold text-center mb-12 text-gray-100">Core Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-green-500/30 hover:border-green-500 transition-all hover:scale-105">
                        <Shield className="w-12 h-12 text-green-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-3 text-gray-100">Blockchain Security</h3>
                        <p className="text-gray-400">Immutable, tamper-proof records on Ethereum blockchain ensuring complete data integrity.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-blue-500/30 hover:border-blue-500 transition-all hover:scale-105">
                        <Lock className="w-12 h-12 text-blue-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-3 text-gray-100">Cryptographic QR Codes</h3>
                        <p className="text-gray-400">ECDSA-signed QR codes with time-based validation preventing forgery and duplication.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-purple-500/30 hover:border-purple-500 transition-all hover:scale-105">
                        <Zap className="w-12 h-12 text-purple-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-3 text-gray-100">Real-time Tracking</h3>
                        <p className="text-gray-400">Live supply chain visibility from manufacturer to customer with instant updates.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-yellow-500/30 hover:border-yellow-500 transition-all hover:scale-105">
                        <CheckCircle2 className="w-12 h-12 text-yellow-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-3 text-gray-100">Instant Verification</h3>
                        <p className="text-gray-400">Scan QR codes to verify product authenticity in seconds with complete history.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-teal-500/30 hover:border-teal-500 transition-all hover:scale-105">
                        <Globe className="w-12 h-12 text-teal-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-3 text-gray-100">Global Network</h3>
                        <p className="text-gray-400">Connect manufacturers, distributors, pharmacies, and hospitals worldwide.</p>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-pink-500/30 hover:border-pink-500 transition-all hover:scale-105">
                        <BarChart3 className="w-12 h-12 text-pink-400 mb-4" />
                        <h3 className="text-xl font-semibold mb-3 text-gray-100">Analytics Dashboard</h3>
                        <p className="text-gray-400">Comprehensive analytics and fraud detection with real-time monitoring.</p>
                    </div>
                </div>
            </section>

            {/* Role-Based Features */}
            <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-green-950/30 to-emerald-950/30 rounded-3xl my-12 backdrop-blur-sm border border-green-500/20">
                <h2 className="text-4xl font-bold text-center mb-12 text-gray-100">Role-Based Access</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    <div className="bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-green-500/30">
                        <Factory className="w-12 h-12 text-green-400 mb-4" />
                        <h3 className="text-2xl font-semibold mb-4 text-gray-100">Manufacturer Portal</h3>
                        <ul className="space-y-3 text-gray-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <span>Create product batches with detailed information</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <span>Generate cryptographic QR codes automatically</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <span>Transfer batches to authorized distributors</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                <span>Track batch status throughout supply chain</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-yellow-500/30">
                        <TruckIcon className="w-12 h-12 text-yellow-400 mb-4" />
                        <h3 className="text-2xl font-semibold mb-4 text-gray-100">Distributor Portal</h3>
                        <ul className="space-y-3 text-gray-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>Receive batches from manufacturers</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>Transfer to pharmacies and hospitals</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>Manage inventory and track shipments</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>Verify batch authenticity before transfer</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-blue-500/30">
                        <Building2 className="w-12 h-12 text-blue-400 mb-4" />
                        <h3 className="text-2xl font-semibold mb-4 text-gray-100">Vendor Portal</h3>
                        <ul className="space-y-3 text-gray-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span>Receive final delivery from distributors</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span>Confirm receipt and verify authenticity</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span>Manage vendor inventory</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span>View complete supply chain history</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gray-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-purple-500/30">
                        <User className="w-12 h-12 text-purple-400 mb-4" />
                        <h3 className="text-2xl font-semibold mb-4 text-gray-100">Customer Verification</h3>
                        <ul className="space-y-3 text-gray-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                <span>Scan QR codes to verify product</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                <span>View complete supply chain journey</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                <span>Check expiry dates and batch details</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                                <span>Report counterfeit products instantly</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Security Features */}
            <section className="container mx-auto px-4 py-16">
                <h2 className="text-4xl font-bold text-center mb-12 text-gray-100">Security & Fraud Detection</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-red-950/30 to-orange-950/30 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-red-500/30">
                        <h3 className="text-2xl font-semibold mb-4 text-gray-100 flex items-center gap-2">
                            <Shield className="w-8 h-8 text-red-400" />
                            Supply Chain Integrity
                        </h3>
                        <ul className="space-y-3 text-gray-400">
                            <li>• Missing link detection in supply chain</li>
                            <li>• Duplicate scan alerts</li>
                            <li>• Expiry date validation</li>
                            <li>• Unauthorized transfer prevention</li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-blue-950/30 to-cyan-950/30 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-blue-500/30">
                        <h3 className="text-2xl font-semibold mb-4 text-gray-100 flex items-center gap-2">
                            <Lock className="w-8 h-8 text-blue-400" />
                            Cryptographic Protection
                        </h3>
                        <ul className="space-y-3 text-gray-400">
                            <li>• ECDSA digital signatures</li>
                            <li>• Time-based validation (24h window)</li>
                            <li>• Nonce for replay protection</li>
                            <li>• Wallet-based identity verification</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl p-12 text-center text-white shadow-2xl border border-green-400/30 relative overflow-hidden">
                    {/* Animated background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h3>
                        <p className="text-xl mb-8 text-green-100">
                            Join the fight against counterfeit products with blockchain technology
                        </p>
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-600 rounded-lg hover:shadow-xl transition-all hover:scale-105 font-semibold"
                        >
                            Access Dashboard
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
