import Link from 'next/link';
import { Factory, TruckIcon, Building2, User, Shield, ArrowRight, CheckCircle2, QrCode, Database, Lock, Eye, AlertCircle } from 'lucide-react';

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 md:py-32">
                <div className="max-w-4xl mx-auto text-center animate-fade-in">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        How MediChain Works
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                        A step-by-step journey through our blockchain-powered medicine verification system
                    </p>
                </div>
            </section>

            {/* Supply Chain Flow */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16">The Complete Medicine Supply Chain Journey</h2>

                    {/* Step 1 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        <div className="order-2 md:order-1">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-10 rounded-3xl shadow-2xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold text-2xl">
                                        1
                                    </div>
                                    <Factory className="w-12 h-12" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Manufacturer Creates Medicine Batch</h3>
                                <ul className="space-y-3 text-blue-100">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Manufacturer registers medicine batch on blockchain with unique ID</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Records drug name, dosage, quantity, manufacturing date, expiry date</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Generates cryptographic QR code for verification</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Transaction is permanently recorded on Ethereum blockchain</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <div className="bg-white p-8 rounded-2xl shadow-lg">
                                <h4 className="text-xl font-bold mb-4 text-gray-800">Technical Details</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <Database className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Smart Contract</p>
                                            <p className="text-sm text-gray-600">Batch data stored in Solidity smart contract</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Lock className="w-6 h-6 text-green-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Cryptographic Hash</p>
                                            <p className="text-sm text-gray-600">Unique hash ensures data integrity</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <QrCode className="w-6 h-6 text-purple-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">QR Code Generation</p>
                                            <p className="text-sm text-gray-600">Contains batch ID and verification URL</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        <div>
                            <div className="bg-white p-8 rounded-2xl shadow-lg">
                                <h4 className="text-xl font-bold mb-4 text-gray-800">What Happens</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <Eye className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Ownership Transfer</p>
                                            <p className="text-sm text-gray-600">Distributor receives batch and updates blockchain</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Audit Trail</p>
                                            <p className="text-sm text-gray-600">Every transfer is permanently recorded</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Fraud Prevention</p>
                                            <p className="text-sm text-gray-600">Unauthorized transfers are rejected</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-10 rounded-3xl shadow-2xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white text-yellow-600 rounded-full flex items-center justify-center font-bold text-2xl">
                                        2
                                    </div>
                                    <TruckIcon className="w-12 h-12" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Distributor Transfers</h3>
                                <ul className="space-y-3 text-yellow-100">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Distributor receives batch from manufacturer</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Verifies batch authenticity on blockchain</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Transfers ownership to vendor via smart contract</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Creates immutable record of the transfer</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        <div className="order-2 md:order-1">
                            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-10 rounded-3xl shadow-2xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white text-green-600 rounded-full flex items-center justify-center font-bold text-2xl">
                                        3
                                    </div>
                                    <Building2 className="w-12 h-12" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Pharmacy Receives</h3>
                                <ul className="space-y-3 text-green-100">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Pharmacy receives medicine batch from distributor</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Confirms delivery on blockchain</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Medicine is now ready to be dispensed to patients</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Complete history is available for verification</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <div className="bg-white p-8 rounded-2xl shadow-lg">
                                <h4 className="text-xl font-bold mb-4 text-gray-800">Pharmacy Benefits</h4>
                                <div className="space-y-4 text-gray-700">
                                    <p className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                                        <span>Verify authenticity before stocking</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                                        <span>Build customer trust and loyalty</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                                        <span>Protect against liability from fake medicines</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                                        <span>Access complete supply chain history</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="bg-white p-8 rounded-2xl shadow-lg">
                                <h4 className="text-xl font-bold mb-4 text-gray-800">Verification Process</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                            1
                                        </div>
                                        <p className="text-gray-700">Patient scans QR code with smartphone</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                            2
                                        </div>
                                        <p className="text-gray-700">System queries blockchain for batch data</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                            3
                                        </div>
                                        <p className="text-gray-700">Displays complete supply chain history</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                            4
                                        </div>
                                        <p className="text-gray-700">Shows authenticity status and warnings</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-10 rounded-3xl shadow-2xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-white text-purple-600 rounded-full flex items-center justify-center font-bold text-2xl">
                                        4
                                    </div>
                                    <User className="w-12 h-12" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4">Patient Verifies</h3>
                                <ul className="space-y-3 text-purple-100">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Scan QR code with any smartphone camera</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Instantly see complete supply chain history</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>Verify authenticity in seconds</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-5 h-5 mt-1 flex-shrink-0" />
                                        <span>No app installation or registration required</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Blockchain Technology */}
            <section className="container mx-auto px-4 section-spacing bg-gradient-to-r from-gray-900 to-blue-900 rounded-3xl my-12 text-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-8">Why Blockchain?</h2>
                    <p className="text-xl text-center text-gray-300 mb-12">
                        Blockchain technology provides the perfect foundation for a tamper-proof supply chain
                    </p>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl">
                            <Lock className="w-12 h-12 mb-4" />
                            <h3 className="text-2xl font-bold mb-3">Immutable</h3>
                            <p className="text-gray-300">
                                Once data is written to the blockchain, it cannot be altered or deleted. This ensures the integrity of all records.
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl">
                            <Eye className="w-12 h-12 mb-4" />
                            <h3 className="text-2xl font-bold mb-3">Transparent</h3>
                            <p className="text-gray-300">
                                All transactions are visible to authorized parties, creating complete transparency across the supply chain.
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl">
                            <Shield className="w-12 h-12 mb-4" />
                            <h3 className="text-2xl font-bold mb-3">Decentralized</h3>
                            <p className="text-gray-300">
                                No single point of failure or control. The network is distributed across thousands of nodes worldwide.
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl">
                            <Database className="w-12 h-12 mb-4" />
                            <h3 className="text-2xl font-bold mb-3">Cryptographically Secure</h3>
                            <p className="text-gray-300">
                                Advanced cryptography ensures that only authorized parties can make changes to the blockchain.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h3>
                    <p className="text-xl mb-8 text-blue-100">
                        Join the blockchain revolution in pharmaceutical supply chain management
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/verify"
                            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:shadow-xl transition-all hover:scale-105 font-semibold flex items-center justify-center gap-2"
                        >
                            Verify a Medicine <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/manufacturer"
                            className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all font-semibold"
                        >
                            Access Portal
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
