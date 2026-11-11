'use client';

import { useState } from 'react';
import { Play, RotateCcw, AlertCircle } from 'lucide-react';
import { enableDemoMode, disableDemoMode, isDemoMode } from '@/utils/demoMode';

export function DemoModeToggle() {
    const [demoMode, setDemoMode] = useState(isDemoMode());
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleActivateDemo = async () => {
        setLoading(true);
        setMessage('');

        try {
            // Seed demo data
            const response = await fetch('/api/demo/seed', {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to activate demo mode');
            }

            enableDemoMode();
            setDemoMode(true);
            setMessage('✅ Demo mode activated! Demo batches have been created.');
        } catch (error: any) {
            setMessage(`❌ Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivateDemo = () => {
        disableDemoMode();
        setDemoMode(false);
        setMessage('Demo mode deactivated');
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-gray-800 border-2 border-purple-500/50 rounded-lg p-4 shadow-xl max-w-sm">
                <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-gray-100">Demo Mode</h3>
                </div>

                {demoMode ? (
                    <div className="space-y-3">
                        <div className="p-2 bg-purple-900/30 border border-purple-500/50 rounded text-purple-200 text-sm">
                            Demo mode is active
                        </div>
                        <button
                            onClick={handleDeactivateDemo}
                            className="w-full px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 font-semibold"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Deactivate Demo
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-gray-300 text-sm">
                            Activate demo mode to load sample batches with various scenarios
                        </p>
                        <button
                            onClick={handleActivateDemo}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                        >
                            <Play className="w-4 h-4" />
                            {loading ? 'Activating...' : 'Activate Demo Mode'}
                        </button>
                    </div>
                )}

                {message && (
                    <div className="mt-3 p-2 bg-gray-900/50 border border-gray-700 rounded text-gray-300 text-sm">
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
