'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, FileText } from 'lucide-react';
import { batchQrJson, batchQrUrl } from '@/lib/batchCode';

interface Props {
    batchId: string;
    quantity?: number;
    productName?: string;
    manufacturer?: string;
    category?: string;
    sku?: string;
    origin?: string;
    productionDate?: string;
    expiryDate?: string;
    /** Network name (e.g. Sepolia) when the batch was also written to the blockchain */
    chainNetwork?: string | null;
}

const fmtDate = (d?: string) => d && !isNaN(Date.parse(d))
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

/** One batch = one box = one QR. Shown after a batch is created. */
export function BatchQRCard(p: Props) {
    const { batchId, quantity, productName, manufacturer, expiryDate } = p;
    const [appOrigin, setAppOrigin] = useState('');
    const [busy, setBusy] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const hiRes = useRef<HTMLDivElement>(null);
    // Used for the verify link printed on the PDF label
    useEffect(() => setAppOrigin(process.env.NEXT_PUBLIC_APP_URL || window.location.origin), []);
    const qrValue = batchQrJson(batchId, { productName, manufacturer, productionDate: p.productionDate, expiryDate });

    // A large hidden copy keeps printed and downloaded QRs sharp
    const png = () => (hiRes.current ?? wrap.current)?.querySelector('canvas')?.toDataURL('image/png') ?? '';

    const download = () => {
        const a = document.createElement('a');
        a.href = png(); a.download = `${batchId}-qr.png`; a.click();
    };

    /** A printable label as a PDF: the QR plus every detail of the batch. */
    const labelPdf = async () => {
        setBusy(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ unit: 'mm', format: [100, 150] });
            const W = 100, M = 8;

            doc.setFillColor(16, 185, 129); doc.rect(0, 0, W, 14, 'F');
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
            doc.text('MediChain', M, 9.5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text('Verified medicine batch', W - M, 9.5, { align: 'right' });

            doc.setTextColor(17, 24, 39); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
            const title = doc.splitTextToSize(productName || 'Medicine batch', W - 2 * M);
            doc.text(title, W / 2, 23, { align: 'center' });
            let y = 23 + title.length * 6;

            const q = 52;
            doc.addImage(png(), 'PNG', (W - q) / 2, y - 2, q, q);
            y += q + 1;
            doc.setFont('courier', 'bold'); doc.setFontSize(10);
            doc.text(batchId, W / 2, y, { align: 'center' });
            y += 6;

            const rows: [string, string][] = ([
                ['Manufacturer', manufacturer || ''],
                ['Made at', p.origin || ''],
                ['Category', p.category || ''],
                ['Mfg date', fmtDate(p.productionDate)],
                ['Expiry date', fmtDate(expiryDate)],
                ['Quantity', quantity ? `${quantity.toLocaleString('en-IN')} units` : ''],
                ['SKU', p.sku || ''],
                ['Recorded on', p.chainNetwork ? `${p.chainNetwork} blockchain + MediChain ledger` : ''],
            ] as [string, string][]).filter(([, v]) => v);

            doc.setDrawColor(229, 231, 235); doc.line(M, y - 3, W - M, y - 3);
            doc.setFontSize(8.5);
            for (const [k, v] of rows) {
                doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128); doc.text(k, M, y + 1);
                doc.setFont('helvetica', 'bold'); doc.setTextColor(17, 24, 39);
                const val = doc.splitTextToSize(v, W - 2 * M - 28);
                doc.text(val, M + 28, y + 1);
                y += 5 * val.length;
            }

            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(107, 114, 128);
            doc.text('Scan with MediChain Verify to check it is genuine and see its journey.', W / 2, 141, { align: 'center' });
            doc.setTextColor(5, 150, 105);
            doc.textWithLink(batchQrUrl(appOrigin, batchId), W / 2, 145, { align: 'center', url: batchQrUrl(appOrigin, batchId) });

            doc.save(`${batchId}-label.pdf`);
        } finally { setBusy(false); }
    };

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div ref={wrap} className="p-3 bg-white rounded-lg">
                {qrValue && <QRCodeCanvas value={qrValue} size={220} level="L" includeMargin />}
            </div>
            <div ref={hiRes} className="hidden" aria-hidden>
                {qrValue && <QRCodeCanvas value={qrValue} size={800} level="L" includeMargin />}
            </div>
            <div className="text-center">
                <p className="font-mono text-sm text-gray-100">{batchId}</p>
                <p className="text-xs text-gray-500 mt-1">
                    {productName}{quantity ? ` · ${quantity.toLocaleString('en-IN')} units in the box` : ''}
                </p>
            </div>
            <div className="flex gap-2">
                <button onClick={download} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700">
                    <Download className="w-4 h-4" aria-hidden /> Download
                </button>
                <button onClick={labelPdf} disabled={busy || !qrValue} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-gray-950 hover:bg-emerald-400 disabled:opacity-60">
                    <FileText className="w-4 h-4" aria-hidden /> {busy ? 'Making PDF…' : 'Print label (PDF)'}
                </button>
            </div>
            <p className="text-[11px] text-gray-500 text-center max-w-[260px]">Stick this on the batch&apos;s box. The inventory scanner and bulk verify read it too.</p>
        </div>
    );
}
