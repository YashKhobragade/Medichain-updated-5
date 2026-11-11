import Link from 'next/link';
import { Shield, Target, Users, Award, ArrowRight, Heart, Globe2, TrendingUp } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 md:py-32">
                <div className="max-w-4xl mx-auto text-center animate-fade-in">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        About MediChain
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                        We're on a mission to eliminate counterfeit medicines and save lives through blockchain technology
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-block mb-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            Our Mission
                        </div>
                        <h2 className="text-4xl font-bold mb-6">Protecting Lives Through Transparency</h2>
                        <p className="text-lg text-gray-600 mb-4 leading-relaxed">
                            Every year, over 1 million people die from counterfeit medicines. This preventable tragedy
                            affects the most vulnerable populations in developing countries, where up to 30% of medicines
                            may be fake.
                        </p>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            MediChain leverages blockchain technology to create an immutable, transparent record of every
                            medicine batch from manufacturer to patient, making it impossible for counterfeit drugs to
                            enter the verified supply chain.
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-12 rounded-3xl text-white shadow-2xl">
                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <Target className="w-12 h-12 flex-shrink-0" />
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Our Goal</h3>
                                    <p className="text-blue-100">
                                        Eliminate counterfeit medicines globally by 2030
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Heart className="w-12 h-12 flex-shrink-0" />
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Our Impact</h3>
                                    <p className="text-blue-100">
                                        Protecting millions of patients worldwide
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Statement */}
            <section className="container mx-auto px-4 section-spacing bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl my-12">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12">The Global Crisis</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                            <div className="text-5xl font-bold text-red-600 mb-3">$200B</div>
                            <p className="text-gray-700 font-semibold mb-2">Annual Market Size</p>
                            <p className="text-gray-600 text-sm">
                                The global counterfeit medicine market continues to grow
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                            <div className="text-5xl font-bold text-orange-600 mb-3">1M+</div>
                            <p className="text-gray-700 font-semibold mb-2">Deaths Per Year</p>
                            <p className="text-gray-600 text-sm">
                                Lives lost due to fake and substandard medicines
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                            <div className="text-5xl font-bold text-purple-600 mb-3">10-30%</div>
                            <p className="text-gray-700 font-semibold mb-2">Counterfeit Rate</p>
                            <p className="text-gray-600 text-sm">
                                In developing countries, this percentage of medicines are fake
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Solution */}
            <section className="container mx-auto px-4 section-spacing">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12">Our Solution</h2>
                    <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl">
                        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                            MediChain uses <strong>blockchain technology</strong> to create a tamper-proof digital ledger
                            that tracks every medicine batch throughout the supply chain. Each transaction is cryptographically
                            signed and permanently recorded, creating an unbreakable chain of custody.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6 mt-8">
                            <div className="flex gap-4">
                                <Shield className="w-8 h-8 text-blue-600 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Immutable Records</h3>
                                    <p className="text-gray-600">
                                        Once recorded, data cannot be altered or deleted
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Globe2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Global Accessibility</h3>
                                    <p className="text-gray-600">
                                        Anyone can verify medicines from anywhere
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Users className="w-8 h-8 text-purple-600 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Multi-Stakeholder</h3>
                                    <p className="text-gray-600">
                                        Connects manufacturers, distributors, pharmacies, and patients
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <TrendingUp className="w-8 h-8 text-orange-600 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Real-Time Tracking</h3>
                                    <p className="text-gray-600">
                                        Monitor supply chain in real-time with instant alerts
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="container mx-auto px-4 section-spacing bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl my-12">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-12">Our Values</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Transparency</h3>
                            <p className="text-gray-600">
                                We believe in complete transparency across the pharmaceutical supply chain
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Patient Safety</h3>
                            <p className="text-gray-600">
                                Patient health and safety is our top priority in everything we do
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Award className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Innovation</h3>
                            <p className="text-gray-600">
                                Leveraging cutting-edge technology to solve critical healthcare challenges
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">Join Us in Fighting Counterfeit Medicines</h3>
                    <p className="text-xl mb-8 text-blue-100">
                        Together, we can create a safer pharmaceutical supply chain
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/how-it-works"
                            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:shadow-xl transition-all hover:scale-105 font-semibold flex items-center justify-center gap-2"
                        >
                            Learn How It Works <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/contact"
                            className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all font-semibold"
                        >
                            Get in Touch
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
