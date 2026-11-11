'use client';

import { formatDate, formatAddress, getRoleName } from '@/lib/utils';
import type { Transfer, Batch } from '@/types';
import { CheckCircle, TruckIcon, Building2, Factory } from 'lucide-react';

interface SupplyChainTimelineProps {
    batch: Batch;
    transfers: Transfer[];
}

export function SupplyChainTimeline({ batch, transfers }: SupplyChainTimelineProps) {
    const getIcon = (address: string, index: number) => {
        if (index === 0) return <Factory className="w-6 h-6" />;
        if (index === batch.supplyChain.length - 1) return <Building2 className="w-6 h-6" />;
        return <TruckIcon className="w-6 h-6" />;
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">Supply Chain History</h3>

            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                {/* Timeline items */}
                <div className="space-y-8">
                    {/* Creation */}
                    <div className="relative flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center z-10">
                            <Factory className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 pb-8">
                            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-lg">Batch Created</h4>
                                    <span className="text-sm text-muted-foreground">
                                        {formatDate(batch.createdAt)}
                                    </span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Manufacturer:</span>
                                        <span className="font-mono">{formatAddress(batch.manufacturer)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Batch ID:</span>
                                        <span className="font-semibold">{batch.batchId}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transfers */}
                    {transfers.map((transfer, index) => (
                        <div key={index} className="relative flex gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center z-10">
                                <TruckIcon className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div className="flex-1 pb-8">
                                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-lg">Transfer #{index + 1}</h4>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDate(transfer.timestamp)}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">From:</span>
                                            <span className="font-mono">{formatAddress(transfer.from)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">To:</span>
                                            <span className="font-mono">{formatAddress(transfer.to)}</span>
                                        </div>
                                        {transfer.location && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">Location:</span>
                                                <span>{transfer.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Current status */}
                    <div className="relative flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center z-10">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                <h4 className="font-semibold text-lg mb-2">Current Owner</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Address:</span>
                                        <span className="font-mono">{formatAddress(batch.currentOwner)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Status:</span>
                                        <span className="font-semibold capitalize">
                                            {['Created', 'In Transit', 'Delivered', 'Flagged'][batch.status]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
