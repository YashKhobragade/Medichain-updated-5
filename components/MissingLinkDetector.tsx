'use client';

import { AlertTriangle, XCircle } from 'lucide-react';

interface MissingLinkDetectorProps {
    missingLink?: string | null;
    warnings: string[];
}

export function MissingLinkDetector({ missingLink, warnings }: MissingLinkDetectorProps) {
    if (!missingLink && warnings.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {missingLink && (
                <div className="bg-red-900/30 border-2 border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-red-200 text-lg mb-1">Missing Link Detected</h4>
                            <p className="text-red-300 text-base">
                                The supply chain is missing the <span className="font-bold uppercase">{missingLink}</span> step.
                                This batch may have bypassed critical verification points.
                            </p>
                            <div className="mt-3 p-3 bg-red-950/50 rounded border border-red-500/30">
                                <p className="text-sm text-red-200">
                                    <strong>Why this matters:</strong> A complete supply chain ensures every stakeholder has verified
                                    the batch. Missing steps indicate potential tampering or counterfeit products.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="bg-yellow-900/30 border-2 border-yellow-500/50 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-bold text-yellow-200 text-lg mb-2">Warnings</h4>
                            <ul className="space-y-2">
                                {warnings.map((warning, index) => (
                                    <li key={index} className="flex items-start gap-2 text-yellow-300 text-base">
                                        <span className="text-yellow-400 mt-1">•</span>
                                        <span>{warning}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
