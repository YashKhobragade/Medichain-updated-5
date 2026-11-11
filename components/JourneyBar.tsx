'use client';

import { Check, Truck } from 'lucide-react';

export interface JourneyStage { label: string; name: string | null; state: 'done' | 'here' | 'transit' | 'pending' }
export interface Journey { complete: boolean; holder: string; inTransitTo: string | null; detail: string; stages: JourneyStage[] }

const DOT: Record<JourneyStage['state'], string> = {
    done: 'bg-emerald-500 text-gray-950 border-emerald-500',
    here: 'bg-sky-500/20 text-sky-200 border-sky-400 ring-4 ring-sky-500/15',
    transit: 'bg-amber-500/15 text-amber-200 border-amber-400 border-dashed',
    pending: 'bg-gray-900 text-gray-600 border-gray-700',
};
const NOTE: Record<JourneyStage['state'], string> = { done: 'Passed', here: 'Here now', transit: 'On the way', pending: 'Not yet' };

/** Manufacturer → Distributor → Pharmacy/Hospital: how far this batch has travelled. */
const dot = (n: string) => (n.endsWith('.') ? n : `${n}.`);

export function JourneyBar({ journey }: { journey: Journey }) {
    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
                <h3 className="text-base font-semibold text-gray-200">Journey</h3>
                <p className={`text-sm ${journey.complete ? 'text-emerald-300' : 'text-gray-400'}`}>
                    {journey.complete ? 'Complete: reached the patient-facing end of the chain.' : journey.inTransitTo ? `With ${journey.holder}, on its way to ${dot(journey.inTransitTo)}` : `Now with ${dot(journey.holder)}`}
                </p>
            </div>
            <ol className="grid grid-cols-3">
                {journey.stages.map((s, i) => (
                    <li key={s.label} className="relative flex flex-col items-center text-center px-1">
                        {i > 0 && (
                            <span aria-hidden className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${s.state === 'pending' ? 'bg-gray-700' : s.state === 'transit' ? 'bg-amber-400/60' : 'bg-emerald-500'}`} />
                        )}
                        <span className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${DOT[s.state]}`}>
                            {s.state === 'done' ? <Check className="w-5 h-5" aria-hidden /> : s.state === 'transit' ? <Truck className="w-4 h-4" aria-hidden /> : i + 1}
                        </span>
                        <span className="mt-2 text-xs text-gray-400">{s.label}</span>
                        <span className={`text-sm ${s.state === 'pending' ? 'text-gray-600' : 'text-gray-100'}`}>{s.name ?? '—'}</span>
                        <span className={`text-[11px] ${s.state === 'here' ? 'text-sky-300' : s.state === 'transit' ? 'text-amber-300' : s.state === 'done' ? 'text-emerald-300/80' : 'text-gray-600'}`}>{NOTE[s.state]}</span>
                    </li>
                ))}
            </ol>
            {!journey.complete && <p className="text-xs text-gray-500 mt-5">The trust score reaches 100 only when the batch has passed manufacturer → distributor → pharmacy/hospital in order, with every hand-off confirmed.</p>}
        </div>
    );
}
