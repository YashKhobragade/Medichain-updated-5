'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, title, description, onClose, children, footer, width = 'md' }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const prev = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        // Focus the first field so keyboard users land inside the dialog
        requestAnimationFrame(() => {
            panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
        });
        return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
    }, [open, onClose]);

    if (!open) return null;
    const max = width === 'sm' ? 'max-w-md' : width === 'lg' ? 'max-w-2xl' : 'max-w-lg';

    return (
        <div data-native-responsive className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className={`relative w-full ${max} bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200`}
            >
                <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-800">
                    <div>
                        <h2 id="modal-title" className="text-base font-semibold text-gray-100">{title}</h2>
                        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
                    </div>
                    <button data-close onClick={onClose} aria-label="Close" className="p-1.5 -m-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-6 py-5 overflow-y-auto">{children}</div>
                {footer && <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-2">{footer}</div>}
            </div>
        </div>
    );
}

/** Shared button styles so both new pages speak the same visual language. */
export const btn = {
    primary: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-gray-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400',
    secondary: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400',
    ghost: 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800 disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400',
    danger: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 disabled:opacity-40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400',
};

export const field = 'w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20';
