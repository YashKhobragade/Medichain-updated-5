'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone, Send, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        role: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would send to a backend
        console.log('Form submitted:', formData);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', company: '', role: '', message: '' });
        }, 3000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-20 md:py-32">
                <div className="max-w-4xl mx-auto text-center animate-fade-in">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Get in Touch
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                        Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>
            </section>

            {/* Contact Form & Info */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl">
                        <h2 className="text-3xl font-bold mb-6">Send us a Message</h2>
                        {submitted ? (
                            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h3>
                                <p className="text-green-700">
                                    Your message has been sent successfully. We'll get back to you soon.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Company / Organization
                                    </label>
                                    <input
                                        type="text"
                                        id="company"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                        placeholder="Your Company"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Your Role *
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        required
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                                    >
                                        <option value="">Select your role</option>
                                        <option value="manufacturer">Pharmaceutical Manufacturer</option>
                                        <option value="distributor">Distributor</option>
                                        <option value="pharmacy">Pharmacy</option>
                                        <option value="hospital">Hospital</option>
                                        <option value="regulator">Regulator</option>
                                        <option value="patient">Patient</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Message *
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows={5}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors resize-none"
                                        placeholder="Tell us about your inquiry..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-xl transition-all hover:scale-105 font-semibold flex items-center justify-center gap-2"
                                >
                                    Send Message
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 md:p-10 rounded-3xl text-white shadow-xl">
                            <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1">Email</h3>
                                        <p className="text-blue-100">support@medichain.com</p>
                                        <p className="text-blue-100">sales@medichain.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1">Phone</h3>
                                        <p className="text-blue-100">+1 (555) 123-4567</p>
                                        <p className="text-blue-100 text-sm">Mon-Fri, 9am-6pm EST</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1">Office</h3>
                                        <p className="text-blue-100">
                                            123 Blockchain Avenue<br />
                                            San Francisco, CA 94102<br />
                                            United States
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white p-8 rounded-3xl shadow-lg">
                            <h3 className="text-2xl font-bold mb-6">Quick Links</h3>
                            <div className="space-y-4">
                                <Link href="/about" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                                    <span className="font-semibold">About MediChain</span>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link href="/how-it-works" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                                    <span className="font-semibold">How It Works</span>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link href="/features" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                                    <span className="font-semibold">Features</span>
                                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link href="/verify" className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                                    <span className="font-semibold text-blue-600">Verify Medicine</span>
                                    <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>

                        {/* FAQ Link */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-3xl border-2 border-purple-200">
                            <h3 className="text-xl font-bold mb-3">Have Questions?</h3>
                            <p className="text-gray-600 mb-4">
                                Check out our FAQ section on the homepage for quick answers to common questions.
                            </p>
                            <Link href="/#faq" className="text-purple-600 font-semibold hover:underline flex items-center gap-2">
                                View FAQ <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Business Inquiries */}
            <section className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl">
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Solutions</h3>
                    <p className="text-xl mb-8 text-blue-100">
                        Looking for custom integration or enterprise pricing? Our team is ready to help.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:sales@medichain.com"
                            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:shadow-xl transition-all hover:scale-105 font-semibold"
                        >
                            Contact Sales Team
                        </a>
                        <Link
                            href="/manufacturer"
                            className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all font-semibold"
                        >
                            Try Platform
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
